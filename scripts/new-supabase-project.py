#!/usr/bin/env python3
"""
new-supabase-project.py — provision a fresh Supabase project for a client and point
the whole repo at it.

The Supabase MCP in .mcp.json is pinned to ONE project via `project_ref`, so it can't
create projects. This script uses the Supabase **Management API** (like the deploy agent
uses the Vercel CLI) to:

  1. create a new project in your org (named after the client slug),
  2. wait for it to come up and read its anon + service-role keys,
  3. rewrite `project_ref` in .mcp.json to the new project,
  4. fill NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY / SUPABASE_SERVICE_ROLE_KEY (+ DB_PASSWORD) in .env.

After it runs, re-auth the MCP so it targets the new project:  claude /mcp  → supabase.
Then the `db` agent can create the schema against the right project.

Usage:
  python scripts/new-supabase-project.py <slug> [--name "Nice Name"] \
      [--org <org-id>] [--region us-east-1]

Env (from .env, which this reads automatically):
  SUPABASE_ACCESS_TOKEN   required — personal access token
                          (https://supabase.com/dashboard/account/tokens)
  SUPABASE_ORG_ID         optional — skip org auto-detection
  SUPABASE_REGION         optional — default region (else us-east-1)
"""
from __future__ import annotations

import argparse
import json
import os
import re
import secrets
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

API = "https://api.supabase.com"
ROOT = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT / ".env"
MCP_PATH = ROOT / ".mcp.json"


def die(msg: str, code: int = 1):
    print(f"✗ {msg}", file=sys.stderr)
    sys.exit(code)


def load_env_file(path: Path) -> dict[str, str]:
    """Minimal .env reader (KEY=VALUE, ignores comments/blank)."""
    env: dict[str, str] = {}
    if not path.exists():
        return env
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def api(method: str, path: str, token: str, body: dict | None = None):
    url = f"{API}{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")
        die(f"{method} {path} → HTTP {e.code}: {detail}")
    except urllib.error.URLError as e:
        die(f"{method} {path} → network error: {e.reason}")


def resolve_org(token: str, wanted: str | None) -> str:
    orgs = api("GET", "/v1/organizations", token) or []
    if wanted:
        for o in orgs:
            if wanted in (o.get("id"), o.get("slug"), o.get("name")):
                return o["id"]
        die(f"org '{wanted}' not found. Available: "
            + ", ".join(f"{o.get('name')} ({o.get('id')})" for o in orgs))
    if len(orgs) == 1:
        print(f"▶ Org     : {orgs[0].get('name')} ({orgs[0]['id']})")
        return orgs[0]["id"]
    die("multiple organizations found — pass --org <id>. Available: "
        + ", ".join(f"{o.get('name')} ({o.get('id')})" for o in orgs))


def find_existing(token: str, name: str) -> str | None:
    for p in api("GET", "/v1/projects", token) or []:
        if p.get("name") == name:
            return p.get("id") or p.get("ref")
    return None


def wait_healthy(token: str, ref: str, timeout: int = 240):
    print("▶ Waiting for the project to come online", end="", flush=True)
    deadline = time.time() + timeout
    while time.time() < deadline:
        p = api("GET", f"/v1/projects/{ref}", token) or {}
        if p.get("status") == "ACTIVE_HEALTHY":
            print(" ✓")
            return
        print(".", end="", flush=True)
        time.sleep(6)
    print()
    print("⚠ Still provisioning after the timeout — keys may not be ready yet. "
          "Re-run this later or grab them from the dashboard.", file=sys.stderr)


def get_keys(token: str, ref: str) -> tuple[str | None, str | None]:
    keys = api("GET", f"/v1/projects/{ref}/api-keys?reveal=true", token) or []
    by_name = {k.get("name"): k.get("api_key") for k in keys}
    anon = by_name.get("anon") or by_name.get("publishable")
    service = by_name.get("service_role") or by_name.get("secret")
    return anon, service


def upsert_env(updates: dict[str, str]):
    """Set KEY=value lines in .env, preserving everything else."""
    lines = ENV_PATH.read_text().splitlines() if ENV_PATH.exists() else []
    remaining = dict(updates)
    out = []
    for line in lines:
        m = re.match(r"\s*([A-Z0-9_]+)\s*=", line)
        if m and m.group(1) in remaining:
            out.append(f"{m.group(1)}={remaining.pop(m.group(1))}")
        else:
            out.append(line)
    for k, v in remaining.items():
        out.append(f"{k}={v}")
    ENV_PATH.write_text("\n".join(out) + "\n")


def set_mcp_ref(ref: str):
    """Swap project_ref in the supabase MCP URL, preserving file formatting."""
    text = MCP_PATH.read_text()
    new, n = re.subn(r"(project_ref=)[A-Za-z0-9_-]+", rf"\g<1>{ref}", text)
    if n == 0:
        die(f"couldn't find project_ref in {MCP_PATH} to update — set it by hand: {ref}")
    MCP_PATH.write_text(new)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug", help="client slug (used as the project name)")
    ap.add_argument("--name", help="project display name (default: derived from slug)")
    ap.add_argument("--org", help="organization id/slug (default: SUPABASE_ORG_ID or auto)")
    ap.add_argument("--region", help="region (default: SUPABASE_REGION or us-east-1)")
    args = ap.parse_args()

    file_env = load_env_file(ENV_PATH)
    token = os.environ.get("SUPABASE_ACCESS_TOKEN") or file_env.get("SUPABASE_ACCESS_TOKEN")
    if not token:
        die("SUPABASE_ACCESS_TOKEN not set. Create one at "
            "https://supabase.com/dashboard/account/tokens and add it to .env.")

    name = args.name or args.slug
    org = args.org or os.environ.get("SUPABASE_ORG_ID") or file_env.get("SUPABASE_ORG_ID")
    region = (args.region or os.environ.get("SUPABASE_REGION")
              or file_env.get("SUPABASE_REGION") or "us-east-1")

    print(f"▶ Project : {name}")
    print(f"▶ Region  : {region}")
    org_id = resolve_org(token, org)

    db_pass = None
    ref = find_existing(token, name)
    if ref:
        print(f"▶ Reusing existing project '{name}' → {ref}")
    else:
        db_pass = secrets.token_urlsafe(24)
        created = api("POST", "/v1/projects", token, {
            "name": name,
            "organization_id": org_id,
            "region": region,
            "db_pass": db_pass,
        }) or {}
        ref = created.get("id") or created.get("ref")
        if not ref:
            die(f"create returned no project ref: {created}")
        print(f"✓ Created project → {ref}")
        print(f"  DB password (saved to .env as DB_PASSWORD; keep it safe — it is not "
              f"retrievable from Supabase later):\n    {db_pass}")
        wait_healthy(token, ref)

    anon, service = get_keys(token, ref)

    # --- point the repo at the new project ---
    set_mcp_ref(ref)
    env_updates = {"NEXT_PUBLIC_SUPABASE_URL": f"https://{ref}.supabase.co"}
    if anon:
        env_updates["NEXT_PUBLIC_SUPABASE_ANON_KEY"] = anon
    if service:
        env_updates["SUPABASE_SERVICE_ROLE_KEY"] = service
    if db_pass:
        env_updates["DB_PASSWORD"] = db_pass
    upsert_env(env_updates)

    print()
    print("✓ Wired the repo to the new project:")
    print(f"  • .mcp.json      project_ref → {ref}")
    print(f"  • .env           NEXT_PUBLIC_SUPABASE_URL"
          + ("/_ANON_KEY" if anon else "")
          + (" + SUPABASE_SERVICE_ROLE_KEY" if service else "")
          + (" + DB_PASSWORD" if db_pass else ""))
    if not (anon and service):
        print("  ⚠ Some keys weren't returned yet — re-run once the project is healthy, "
              "or copy them from the dashboard (Settings → API).")
    print()
    print("Next:")
    print("  1. Re-export .env into your shell:  set -a; source .env; set +a")
    print("  2. Re-auth the MCP to the new project:  claude /mcp  → select supabase")
    print(f"  3. Run the db agent to create the schema for '{args.slug}'.")


if __name__ == "__main__":
    main()

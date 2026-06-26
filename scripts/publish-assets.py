#!/usr/bin/env python3
"""
publish-assets.py — upload a client's image assets to a PUBLIC Supabase Storage bucket
and print their public URLs, so they can be passed to v0 as attachments (v0 fetches
attachments by URL, not from local disk).

Reads from the environment (export them, e.g. `set -a; source .env; set +a`):
    NEXT_PUBLIC_SUPABASE_URL      e.g. https://xxxx.supabase.co
    SUPABASE_SERVICE_ROLE_KEY     service-role key (Project Settings → API)

The service-role key bypasses RLS so it can create the bucket and upload. Keep it in
.env (gitignored) — never commit it.

Usage:
    python scripts/publish-assets.py clients/<slug>/assets <slug>
    python scripts/publish-assets.py clients/<slug>/assets <slug> --bucket design-assets

Prints one `filename<TAB>public_url` line per uploaded image.
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif"}


def _req(method: str, url: str, key: str, *, data: bytes | None = None,
         content_type: str | None = None) -> tuple[int, bytes]:
    headers = {"Authorization": f"Bearer {key}", "apikey": key}
    if content_type:
        headers["Content-Type"] = content_type
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def ensure_bucket(base: str, key: str, bucket: str) -> None:
    status, body = _req(
        "POST", f"{base}/storage/v1/bucket", key,
        data=json.dumps({"id": bucket, "name": bucket, "public": True}).encode(),
        content_type="application/json",
    )
    # 200 = created; 409/400 "already exists" is fine.
    if status not in (200, 201) and b"already exists" not in body and b"Duplicate" not in body:
        sys.exit(f"Could not create bucket '{bucket}': {status} {body.decode(errors='replace')}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("assets_dir", type=Path, help="folder of images, e.g. clients/<slug>/assets")
    ap.add_argument("prefix", help="path prefix in the bucket, e.g. the client slug")
    ap.add_argument("--bucket", default="design-assets", help="public bucket name (default: design-assets)")
    args = ap.parse_args()

    base = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not base or not key:
        sys.exit("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY "
                 "(e.g. `set -a; source .env; set +a`). See this script's header.")
    if not args.assets_dir.is_dir():
        sys.exit(f"No such folder: {args.assets_dir}")

    images = sorted(p for p in args.assets_dir.iterdir()
                    if p.is_file() and p.suffix.lower() in IMAGE_EXTS)
    if not images:
        print(f"No images in {args.assets_dir} — nothing to publish.", file=sys.stderr)
        return 1

    ensure_bucket(base, key, args.bucket)

    failures = 0
    for img in images:
        path = f"{args.prefix}/{img.name}"
        ctype = mimetypes.guess_type(img.name)[0] or "application/octet-stream"
        status, body = _req(
            "POST", f"{base}/storage/v1/object/{args.bucket}/{path}", key,
            data=img.read_bytes(), content_type=ctype,
        )
        if status in (200, 201):
            print(f"{img.name}\t{base}/storage/v1/object/public/{args.bucket}/{path}")
        else:
            # try upsert (PUT) in case it already exists
            status2, body2 = _req(
                "PUT", f"{base}/storage/v1/object/{args.bucket}/{path}", key,
                data=img.read_bytes(), content_type=ctype,
            )
            if status2 in (200, 201):
                print(f"{img.name}\t{base}/storage/v1/object/public/{args.bucket}/{path}")
            else:
                failures += 1
                print(f"FAILED {img.name}: {status} {body.decode(errors='replace')[:200]}", file=sys.stderr)

    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())

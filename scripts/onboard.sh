#!/usr/bin/env bash
#
# onboard.sh — drive the full client pipeline: intake → design → build → (db) → (deploy).
#
# The agents are Claude Code subagents (they need an LLM), so this is a launcher around the
# `claude` CLI — not a replacement for the agents. It:
#   1. runs the intake agent headlessly  → privacy .gitignore, filled brief, downloaded assets
#   2. shows any (confirm: …) flags and waits for you to review/edit the brief
#   3. opens the design agent (interactive — approves each v0 page as you go)
#   4. opens the build agent (interactive — promotes approved designs into the Next.js app)
#   5. optionally opens the db + deploy agents (opt-in prompts — schema and Vercel are the
#      steps you may want to run by hand or via /new-site, so they default to "no")
#
# Usage:
#   scripts/onboard.sh "Business Name" [slug]
#
# Env overrides:
#   CLAUDE_PERMISSION_MODE   permission mode for the headless intake run
#                            (default: acceptEdits; set bypassPermissions if it stalls)

set -euo pipefail

# --- locate repo root (this script lives in <root>/scripts) ---
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# --- args ---
BUSINESS="${1:-}"
if [[ -z "$BUSINESS" ]]; then
  echo "usage: scripts/onboard.sh \"Business Name\" [slug]" >&2
  exit 2
fi
# slug: explicit arg 2, else derived from the business name
SLUG="${2:-$(printf '%s' "$BUSINESS" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g')}"
PERM="${CLAUDE_PERMISSION_MODE:-acceptEdits}"

# --- load env (keys for the v0 MCP + Supabase asset publishing) ---
if [[ -f .env ]]; then set -a; source ./.env; set +a; fi

# --- prerequisites ---
command -v claude >/dev/null || { echo "✗ 'claude' CLI not found." >&2; exit 1; }
shopt -s nullglob
csvs=(intake/*.csv)
(( ${#csvs[@]} )) || { echo "✗ No CSV in intake/. Drop the Google Form export there first." >&2; exit 1; }
command -v rclone >/dev/null || echo "⚠ rclone not found — asset download during intake will be skipped."
[[ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]] || echo "⚠ SUPABASE_SERVICE_ROLE_KEY unset — the design step can't publish assets to Supabase."

echo "▶ Client : $BUSINESS"
echo "▶ Slug   : $SLUG"
echo "▶ CSV    : ${csvs[*]}"
echo

# --- 1. Intake (headless) ---
echo "── [1/5] Intake agent ───────────────────────────────"
claude --agent intake -p \
  "Onboard the client \"$BUSINESS\" (use slug: $SLUG) from the CSV in intake/. Do the full intake: install the privacy .gitignore rules, fill clients/$SLUG/brief.md from this client's row, and download their Drive assets." \
  --permission-mode "$PERM" \
  --allowedTools Bash Edit Write Read Grep Glob

BRIEF="clients/$SLUG/brief.md"
[[ -f "$BRIEF" ]] || { echo "✗ Expected $BRIEF was not created — check the intake output above." >&2; exit 1; }

# --- 2. Review ---
echo
echo "── [2/5] Review the brief ───────────────────────────"
echo "Brief: $BRIEF"
if grep -nq "(confirm:" "$BRIEF"; then
  echo "Items the agent flagged to confirm:"
  grep -n "(confirm:" "$BRIEF" | sed 's/^/  /'
else
  echo "No (confirm: …) flags — the agent filled everything from the row."
fi
echo
read -r -p "Edit the brief if needed, then press Enter to start the design step… "

# --- 3. Design (interactive — per-page approval) ---
echo
echo "── [3/5] Design agent (interactive) ─────────────────"
echo "Approve each page in the session; exit it (Ctrl-D) when the designs are done."
claude --agent design \
  "Generate the v0 design for client \"$SLUG\" from $BRIEF, one page at a time, pausing for my approval on each page."

# --- 4. Build (interactive — promote designs into the app) ---
echo
echo "── [4/5] Build agent (interactive) ──────────────────"
echo "Promotes the approved designs into src/ and verifies npm run build."
claude --agent build \
  "Build the real Next.js app for client \"$SLUG\" from its approved designs in clients/$SLUG/design/. Verify with npm run build."

# --- 5. Database + deploy (opt-in) ---
echo
echo "── [5/5] Database + deploy (optional) ───────────────"
read -r -p "Create the Supabase schema now (db agent)? [y/N] " run_db
if [[ "${run_db:-}" =~ ^[Yy] ]]; then
  # Give this client its own project first (swaps project_ref in .mcp.json + fills .env).
  if [[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
    read -r -p "Provision a fresh Supabase project for \"$SLUG\" first? [y/N] " new_proj
    if [[ "${new_proj:-}" =~ ^[Yy] ]]; then
      python scripts/new-supabase-project.py "$SLUG"
      echo "⚠ Re-auth the MCP so it targets the new project:  claude /mcp  → supabase"
      read -r -p "Press Enter once you've re-authed… "
    fi
  else
    echo "Note: the db agent targets the project_ref in .mcp.json — make sure it's THIS client's."
    echo "      (Set SUPABASE_ACCESS_TOKEN in .env to auto-provision a per-client project.)"
  fi
  claude --agent db \
    "Create the Supabase schema for client \"$SLUG\" from clients/$SLUG/brief.md §6 and the build agent's handoffs. Confirm the active project first, enable RLS, and generate types."
else
  echo "Skipped. Run later:  claude --agent db \"...create schema for $SLUG...\""
fi

echo
read -r -p "Deploy to Vercel now (deploy agent)? [y/N] " run_deploy
if [[ "${run_deploy:-}" =~ ^[Yy] ]]; then
  claude --agent deploy \
    "Deploy the built app for client \"$SLUG\" to Vercel: set the Supabase env vars, ship a preview for my approval, then production."
else
  echo "Skipped. Run later:  claude --agent deploy \"...deploy $SLUG...\""
fi

echo
echo "✓ Pipeline finished for $SLUG."

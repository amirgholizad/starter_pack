#!/usr/bin/env bash
#
# onboard.sh — run the intake agent, pause for brief review, then launch the design agent.
#
# The intake/design "agents" are Claude Code subagents (they need an LLM), so this is a
# launcher around the `claude` CLI — not a replacement for the agents. It:
#   1. runs the intake agent headlessly  → privacy .gitignore, filled brief, downloaded assets
#   2. shows any (confirm: …) flags and waits for you to review/edit the brief
#   3. drops you into the design agent (interactive — approves each v0 page as you go)
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
echo "── [1/3] Intake agent ───────────────────────────────"
claude --agent intake -p \
  "Onboard the client \"$BUSINESS\" (use slug: $SLUG) from the CSV in intake/. Do the full intake: install the privacy .gitignore rules, fill clients/$SLUG/brief.md from this client's row, and download their Drive assets." \
  --permission-mode "$PERM" \
  --allowedTools Bash Edit Write Read Grep Glob

BRIEF="clients/$SLUG/brief.md"
[[ -f "$BRIEF" ]] || { echo "✗ Expected $BRIEF was not created — check the intake output above." >&2; exit 1; }

# --- 2. Review ---
echo
echo "── [2/3] Review the brief ───────────────────────────"
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
echo "── [3/3] Design agent (interactive) ─────────────────"
exec claude --agent design \
  "Generate the v0 design for client \"$SLUG\" from $BRIEF, one page at a time, pausing for my approval on each page."

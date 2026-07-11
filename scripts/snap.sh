#!/usr/bin/env bash
#
# snap.sh — screenshot an inspiration URL (a live site, a Dribbble shot, a Land-book entry)
# into a LOCAL PNG so Claude can view it with the Read tool and match the visual style.
#
# Uses the microlink screenshot endpoint (free, no key) to render the page, then downloads
# the resulting image to the given path. Prints the saved file path on success.
#
# If you already have a direct image (a Dribbble shot's cdn.dribbble.com/...png, a saved
# screenshot), just point the build agent at that file — you don't need this.
#
# Usage:
#   scripts/snap.sh "https://example.com" clients/<slug>/inspiration/1.png [width]

set -euo pipefail
url="${1:-}"
out="${2:-}"
width="${3:-1280}"
if [[ -z "$url" || -z "$out" ]]; then
  echo "usage: scripts/snap.sh <url> <output.png> [width]" >&2
  exit 2
fi

mkdir -p "$(dirname "$out")"
enc="$(python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$url")"
api="https://api.microlink.io/?url=${enc}&screenshot=true&meta=false&waitUntil=networkidle2&viewport.width=${width}&embed=screenshot.url"

# -L follows microlink's redirect to the hosted PNG; -f fails on HTTP errors.
if curl -fsSL "$api" -o "$out" && [[ -s "$out" ]]; then
  echo "$out"
else
  echo "snap.sh: could not capture $url (site blocked the screenshot or network failed)" >&2
  rm -f "$out"
  exit 1
fi

#!/usr/bin/env bash
#
# snap.sh — turn an inspiration URL (a live site, a Dribbble shot page, a Land-book
# entry) into a public screenshot image URL that can be attached to v0. Prints the URL.
#
# Uses the microlink screenshot endpoint, which resolves directly to a PNG — so the
# printed URL can be passed straight to v0's createChat `attachments`.
#
# If you already have a direct image URL (e.g. a Dribbble shot's cdn.dribbble.com/...png
# or an animated .gif), just attach that as-is — you don't need this.
#
# Usage:
#   scripts/snap.sh "https://example.com" [width]

set -euo pipefail
url="${1:-}"
width="${2:-1280}"
[[ -n "$url" ]] || { echo "usage: scripts/snap.sh <url> [width]" >&2; exit 2; }

enc="$(python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$url")"
echo "https://api.microlink.io/?url=${enc}&screenshot=true&meta=false&waitUntil=networkidle2&viewport.width=${width}&embed=screenshot.url"

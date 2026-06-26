#!/usr/bin/env python3
"""Download Google Drive assets referenced in a client brief.

Finds every Google Drive file ID in the given file (brief.md, a CSV row, etc.)
and downloads each file — keeping its original name — into <brief-dir>/assets/
using rclone. rclone is used because intake-form uploads are PRIVATE (owned by
the form's Google account), so an authenticated client is required; plain curl
or gdown only work for publicly shared files.

One-time setup:
    brew install rclone
    rclone config
      → n (new remote)
      → name it "gdrive"  (or pass --remote / set RCLONE_DRIVE_REMOTE)
      → storage: drive
      → complete the browser OAuth using the Google account that OWNS the form

Usage:
    python scripts/fetch-drive-assets.py clients/sensenet/brief.md
    python scripts/fetch-drive-assets.py clients/sensenet/brief.md --remote gdrive
    python scripts/fetch-drive-assets.py clients/sensenet/brief.md --dest /tmp/x
"""
import argparse
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

# Matches the id in ...?id=FILEID / ...&id=FILEID and the /d/FILEID/ form.
ID_PATTERNS = [
    re.compile(r"[?&]id=([A-Za-z0-9_-]{20,})"),
    re.compile(r"/d/([A-Za-z0-9_-]{20,})"),
]


def extract_ids(text: str) -> list[str]:
    ids: list[str] = []
    for pat in ID_PATTERNS:
        ids.extend(pat.findall(text))
    seen, ordered = set(), []
    for i in ids:
        if i not in seen:
            seen.add(i)
            ordered.append(i)
    return ordered


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("brief", help="file containing Google Drive links (e.g. clients/<name>/brief.md)")
    ap.add_argument("--remote", default=os.environ.get("RCLONE_DRIVE_REMOTE", "gdrive"),
                    help="rclone Google Drive remote name (default: gdrive)")
    ap.add_argument("--dest", help="download dir (default: <brief-dir>/assets)")
    args = ap.parse_args()

    if not shutil.which("rclone"):
        print("rclone not found. Install with `brew install rclone`, then run "
              "`rclone config` to add a Google Drive remote.", file=sys.stderr)
        return 2

    brief = Path(args.brief)
    if not brief.is_file():
        print(f"No such file: {brief}", file=sys.stderr)
        return 2

    ids = extract_ids(brief.read_text())
    if not ids:
        print(f"No Google Drive links found in {brief}", file=sys.stderr)
        return 1

    dest = Path(args.dest) if args.dest else brief.parent / "assets"
    dest.mkdir(parents=True, exist_ok=True)

    print(f"Found {len(ids)} Drive file(s). Downloading to {dest}/ "
          f"via rclone remote '{args.remote}:'\n")
    failures: list[tuple[str, str]] = []
    for n, fid in enumerate(ids, 1):
        print(f"[{n}/{len(ids)}] {fid} ... ", end="", flush=True)
        proc = subprocess.run(
            ["rclone", "backend", "copyid", f"{args.remote}:", fid, str(dest) + os.sep],
            capture_output=True, text=True,
        )
        if proc.returncode == 0:
            print("ok")
        else:
            print("FAILED")
            failures.append((fid, proc.stderr.strip()))

    if failures:
        print("\nFailures:", file=sys.stderr)
        for fid, err in failures:
            print(f"  {fid}: {err}", file=sys.stderr)
        return 1

    print(f"\nDone. Files in {dest}/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

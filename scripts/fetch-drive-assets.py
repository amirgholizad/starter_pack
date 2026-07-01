#!/usr/bin/env python3
"""Download Google Drive assets referenced in a client brief — renamed by role.

Finds every Google Drive file ID in the given file (brief.md, a CSV row, etc.) and
downloads each into <brief-dir>/assets/ using rclone. Crucially, each file is **renamed
by the brief field it came from** — `logo.jpg`, `page-content-1.jpg`, `photo-2.jpg`,
`brand-guide.pdf` — so the design/build agents can tell a logo from page copy from a photo
instead of guessing at opaque Drive filenames. A `manifest.md` maps every file back to its
role and Drive id. Pass --keep-names to fall back to the original Drive filenames.

rclone is required because intake-form uploads are PRIVATE (owned by the form's Google
account), so an authenticated client is needed; plain curl/gdown only work for public files.

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
    python scripts/fetch-drive-assets.py clients/sensenet/brief.md --keep-names
"""
import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

# Matches the id in ...?id=FILEID / ...&id=FILEID and the /d/FILEID/ form.
ID_PATTERNS = [
    re.compile(r"[?&]id=([A-Za-z0-9_-]{20,})"),
    re.compile(r"/d/([A-Za-z0-9_-]{20,})"),
]

# Role ← keyword(s) that may appear on (or above) the line holding a Drive link.
# Order matters: more specific roles first. A link inherits the most recent role seen.
ROLE_RULES = [
    ("brand-guide",  ("brand guide", "style doc", "style guide", "styleguide", "brand-guide")),
    ("logo",         ("logo",)),
    ("page-content", ("written content", "page content", "content per page",
                      "page copy", "written copy")),
    ("photo",        ("photo", "image", "picture", "gallery", "headshot")),
    ("video",        ("video",)),
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


def role_for_line(line: str) -> str | None:
    low = line.lower()
    for role, kws in ROLE_RULES:
        if any(k in low for k in kws):
            return role
    return None


def collect(text: str) -> list[tuple[str, str]]:
    """Return ordered (drive_id, role) pairs, deduped by id (first field wins)."""
    current = None
    seen: set[str] = set()
    pairs: list[tuple[str, str]] = []
    for line in text.splitlines():
        r = role_for_line(line)
        if r:
            current = r
        for fid in extract_ids(line):
            if fid in seen:
                continue
            seen.add(fid)
            pairs.append((fid, r or current or "asset"))
    return pairs


def download_one(remote: str, fid: str, into: Path) -> Path | None:
    """rclone-copy a single id into `into/` keeping its name; return the file path."""
    proc = subprocess.run(
        ["rclone", "backend", "copyid", f"{remote}:", fid, str(into) + os.sep],
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        download_one.err = proc.stderr.strip()  # type: ignore[attr-defined]
        return None
    files = [p for p in into.iterdir() if p.is_file()]
    return files[0] if files else None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("brief", help="file with Google Drive links (e.g. clients/<name>/brief.md)")
    ap.add_argument("--remote", default=os.environ.get("RCLONE_DRIVE_REMOTE", "gdrive"),
                    help="rclone Google Drive remote name (default: gdrive)")
    ap.add_argument("--dest", help="download dir (default: <brief-dir>/assets)")
    ap.add_argument("--keep-names", action="store_true",
                    help="keep original Drive filenames instead of renaming by role")
    args = ap.parse_args()

    if not shutil.which("rclone"):
        print("rclone not found. Install with `brew install rclone`, then run "
              "`rclone config` to add a Google Drive remote.", file=sys.stderr)
        return 2

    brief = Path(args.brief)
    if not brief.is_file():
        print(f"No such file: {brief}", file=sys.stderr)
        return 2

    pairs = collect(brief.read_text())
    if not pairs:
        print(f"No Google Drive links found in {brief}", file=sys.stderr)
        return 1

    dest = Path(args.dest) if args.dest else brief.parent / "assets"
    dest.mkdir(parents=True, exist_ok=True)

    # Decide final names: a role with a single file → "logo.jpg"; multiple → "photo-1.jpg".
    totals: dict[str, int] = {}
    for _, role in pairs:
        totals[role] = totals.get(role, 0) + 1
    used: dict[str, int] = {}

    print(f"Found {len(pairs)} Drive file(s). Downloading to {dest}/ "
          f"via rclone remote '{args.remote}:'\n")
    manifest: list[tuple[str, str, str]] = []   # (filename, role, id)
    failures: list[tuple[str, str]] = []

    for n, (fid, role) in enumerate(pairs, 1):
        idx = used.get(role, 0) + 1
        used[role] = idx
        base = role if totals[role] == 1 else f"{role}-{idx}"
        label = "original name" if args.keep_names else base
        print(f"[{n}/{len(pairs)}] {fid} → {label} ... ", end="", flush=True)

        with tempfile.TemporaryDirectory(dir=dest) as tmp:
            got = download_one(args.remote, fid, Path(tmp))
            if got is None:
                print("FAILED")
                failures.append((fid, getattr(download_one, "err", "unknown error")))
                continue
            ext = got.suffix.lower()
            target = dest / (got.name if args.keep_names else f"{base}{ext}")
            if target.exists():
                target.unlink()
            shutil.move(str(got), str(target))
        print(f"ok → {target.name}")
        manifest.append((target.name, role, fid))

    if manifest and not args.keep_names:
        lines = ["# Downloaded assets", "",
                 "Renamed by the brief field each file came from. `page-content-N` files map",
                 "to pages in listing order — confirm the exact page mapping in the brief.", "",
                 "| file | role | drive id |", "| --- | --- | --- |"]
        lines += [f"| `{fn}` | {role} | `{fid}` |" for fn, role, fid in manifest]
        (dest / "manifest.md").write_text("\n".join(lines) + "\n")
        print(f"\nWrote {dest}/manifest.md")

    if failures:
        print("\nFailures:", file=sys.stderr)
        for fid, err in failures:
            print(f"  {fid}: {err}", file=sys.stderr)
        return 1

    print(f"\nDone. Files in {dest}/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

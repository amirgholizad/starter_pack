# Clients

One folder per client: `clients/<slug>/` with a `brief.md` and an `assets/` folder.
Everything here except `_template/` and this README is **gitignored** — briefs hold PII
and assets are large binaries.

## Onboard a client (one step)

Drop the Google Form CSV export into the `intake/` folder, then ask Claude:

> "Run the **intake** agent for *<Business Name>* from the CSV in `intake/`."

The intake agent (`.claude/agents/intake.md`):
0. installs the client-privacy `.gitignore` rules (from `.gitignore.template`) so the
   clone never commits real client data,
1. finds the client's row in the CSV,
2. creates `clients/<slug>/brief.md` filled from it — including a **derived Supabase
   schema** and **v0 design direction**, with `(confirm: …)` notes on anything unclear,
3. downloads the client's Drive uploads into `clients/<slug>/assets/`.

Then hand `brief.md` + `assets/` to v0 (design) and Claude (build).

## Manual fallback

- New blank brief:  `cp clients/_template/brief.md clients/<slug>/brief.md`
- Fetch assets only: `python scripts/fetch-drive-assets.py clients/<slug>/brief.md`

Asset download needs a one-time rclone setup: `brew install rclone && rclone config`
— create a Google Drive remote named `gdrive`, authorized with the account that owns
the form (read-only scope is enough).

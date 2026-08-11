# Clients

One folder per client: `clients/<slug>/` with a `brief.md` and an `assets/` folder.
Client folders here are **tracked in git**, so the work survives outside one machine —
see [README → Client data policy](../README.md#client-data-policy). Briefs hold client
PII, so this only holds on a **private remote**; the `deploy-prod` workflow strips
`clients/` from the public `prod` branch. Assets are large binaries — watch repo size.

## Onboard a client

Drop the Google Form CSV export into the `intake/` folder, then either run the whole pipeline
in one Claude session:

```
/new-site "Business Name"
```

…which runs **intake** (CSV → brief), pauses for you to review the brief, then runs **build**
(Claude designs + builds the site directly). Or do a single phase by asking Claude:

> "Run the **intake** agent for *<Business Name>* from the CSV in `intake/`."

The intake agent (`.claude/agents/intake.md`):
1. finds the client's row in the CSV,
2. creates `clients/<slug>/brief.md` filled from it — including the **design direction /
   inspiration** and `(confirm: …)` notes on anything unclear,
3. downloads the client's Drive uploads into `clients/<slug>/assets/` (optional — needs rclone).

Then the build agent (`.claude/agents/build.md`) studies the inspiration sites (screenshot +
fetched text) and builds the pages into `src/app/` with Tailwind + shadcn, wiring any contact
form to Web3Forms.

## Manual fallback

- New blank brief:  `cp clients/_template/brief.md clients/<slug>/brief.md`
- Fetch assets only: `python scripts/fetch-drive-assets.py clients/<slug>/brief.md`

Asset download needs a one-time rclone setup: `brew install rclone && rclone config`
— create a Google Drive remote named `gdrive`, authorized with the account that owns
the form (read-only scope is enough). If you skip it, place assets in `clients/<slug>/assets/`
by hand.

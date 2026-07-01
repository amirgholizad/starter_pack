---
description: Run the full client-site pipeline end to end — intake → design → build → db → deploy — with approval gates.
argument-hint: "Business Name" [slug]
---

Run the **complete website pipeline** for the client: `$ARGUMENTS`. Take it from the raw
intake CSV to a deployed site, dispatching each phase to its subagent and **stopping at every
human gate** — do not blow past an approval.

Preconditions: the client's Google Form CSV is in `intake/`, and `.env` is filled + exported
(`V0_API_KEY`, Supabase keys, `VERCEL_TOKEN`). If the CSV is missing, stop and ask for it.
Derive the slug from the business name if one wasn't given.

Run the phases in order, each with the matching subagent, reporting a one-line status before
moving on:

1. **Intake** (`intake` agent) — install the privacy `.gitignore`, fill
   `clients/<slug>/brief.md` from the client's row, download Drive assets. Then **show me any
   `(confirm: …)` flags and pause** so I can edit the brief before design.
2. **Design** (`design` agent) — generate each page in v0 from the brief, one at a time.
   **Pause for my approval on every page** before the next; don't continue until I say so.
3. **Build** (`build` agent) — promote the approved designs into the real Next.js app and
   verify `npm run build` is clean. Report the routes/components created and any Supabase
   table handoffs.
4. **Database** (`db` agent) — create the Supabase schema (§6 + build handoffs) with RLS.
   **First give this client its own project**: if `.mcp.json`'s `project_ref` isn't already
   this client's, run `python scripts/new-supabase-project.py <slug>` (needs
   `SUPABASE_ACCESS_TOKEN`), then have me re-auth the MCP (`claude /mcp` → supabase) before
   migrating. Then apply the migration and generate types.
5. **Deploy** (`deploy` agent) — link Vercel, set the Supabase env vars, ship a **preview**,
   and pause. Only after I approve the preview, deploy to **production**.

Never run a production deploy or a Supabase migration without the confirmation called out
above. If any phase's inputs are missing, stop and tell me which earlier phase to run.

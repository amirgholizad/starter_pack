---
description: Run the full client-site pipeline — intake → build — with the brief review gate.
argument-hint: "Business Name" [slug]
---

Run the **website pipeline** for the client: `$ARGUMENTS`. Take it from the raw intake CSV to a
built, verified site, dispatching each phase to its subagent and **stopping at the human gate**.

Preconditions: the client's Google Form CSV is in `intake/`. If it's missing, stop and ask for
it. Derive the slug from the business name if one wasn't given.

Run the two phases in order, reporting a one-line status before moving on:

1. **Intake** (`intake` agent) — fill `clients/<slug>/brief.md` from the client's row and (if
   rclone is set up) download their Drive assets. Then **show me any `(confirm: …)` flags and
   pause** so I can review and edit the brief before the build. Do not continue until I say so.

2. **Build** (`build` agent) — study each inspiration site in the brief (screenshot + fetched
   text), set the brand theme, then design and build the pages into `src/app/` with Tailwind +
   shadcn. It will show me a short design plan and pause for a quick OK before writing pages.
   Wire any contact form to Web3Forms. Verify `npm run build` is clean, then report the routes
   and components created and any follow-ups (e.g. create the Web3Forms key).

Never skip the brief-review pause. If the build's inputs are missing (no brief), stop and tell
me to run intake first.

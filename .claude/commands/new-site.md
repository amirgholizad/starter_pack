---
description: Run the full client-site pipeline — intake → build → finish review — with the brief review gate.
argument-hint: "Business Name" [slug]
---

Run the **website pipeline** for the client: `$ARGUMENTS`. Take it from the raw intake CSV to a
built, verified site, dispatching each phase to its subagent and **stopping at the human gate**.

Preconditions: the client's Google Form CSV is in `intake/`. If it's missing, stop and ask for
it. Derive the slug from the business name if one wasn't given.

Run the phases in order, reporting a one-line status before moving on:

1. **Intake** (`intake` agent) — fill `clients/<slug>/brief.md` from the client's row and (if
   rclone is set up) download their Drive assets. Then **show me any `(confirm: …)` flags and
   pause** so I can review and edit the brief before the build. Do not continue until I say so.

2. **Product record** (you, with the `impeccable` skill) — once I approve the brief, write
   `PRODUCT.md` per impeccable's `reference/init.md`, treating the approved brief as the
   interview: ask me only about material gaps it leaves open. Skip init's workflow-defaults step
   (there's no image generation here, and live mode is opt-in).

3. **Build** (`build` agent) — study each inspiration site in the brief (screenshot + fetched
   text), set the brand theme, then design (with impeccable) and build the pages into `src/app/`
   with Tailwind + shadcn. It will show me its design plan (impeccable's direction contract, or
   impeccable's direction-round page when the brief has no Developer style-match) and pause for a
   quick OK before writing pages. Wire any contact form to Web3Forms. Verify `npm run build` is
   clean and capture `.impeccable/review/desktop.png` and `mobile.png`.

4. **Finish review** (`impeccable-finish-reviewer` agent, spawned fresh) — build its packet per
   impeccable's `reference/new-work.md` §7: the brief as the original request, my brief edits and
   plan OK as the confirmed answers, the routes built, the captures, the direction contract
   (`.impeccable/surfaces/src-app-page-tsx.md`), `PRODUCT.md`, the build's open detector findings,
   `.claude/skills/impeccable/reference/craft-floor.md`, and the inspiration screenshots in
   `clients/<slug>/inspiration/` as the critique reference. On a brief-pinned build, say that no
   concept roll ran because the Developer style-match pins the direction: a "roll skipped"
   finding is satisfied by the pin, not a fix. Act on the disposition as §7 says, resuming the
   `build` agent to apply fixes and recapture. Two rounds at most; then put what's still open in
   front of me.

5. **Design record** (`impeccable-documenter` agent) — record `DESIGN.md` and
   `.impeccable/design.json` from the built site: pass the project root (also the write
   boundary), the routes built, the direction contract, `PRODUCT.md`, and
   `.claude/skills/impeccable/reference/document.md`.

Finish by reporting the routes and components created, the reviewer's disposition word, and any
follow-ups (e.g. create the Web3Forms key).

Never skip the brief-review pause. If the build's inputs are missing (no brief), stop and tell
me to run intake first.

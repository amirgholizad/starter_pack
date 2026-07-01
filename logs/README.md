# Agent problem log

A running, append-only log of problems the pipeline agents (`intake`, `design`, `build`,
`db`, `deploy`) hit — so recurring failures become visible and fixable instead of being
re-discovered every run. **Agents append here; humans read here.**

## When to write an entry

Add an entry whenever you (an agent):

- **give up** on a step after your bounded retries (see the retry cap in `AGENTS.md`) — status `BLOCKED`;
- **worked around** a problem to keep going (e.g. published assets in text-only mode because a
  key was missing) — status `WORKAROUND`;
- hit a **notable problem you recovered from** that is likely to recur (rate limits, flaky
  MCP/tool, a v0 non-regeneration, a corrupted `node_modules`) — status `RESOLVED`.

Don't log routine, first-try successes. Log friction, not narration.

## Redaction — no PII or secrets

Reference the client by **slug only**. Never write emails, phone numbers, addresses, raw brief
content, API keys, tokens, DB passwords, or connection strings into this file. Trim error
messages to the relevant lines and strip any secrets they contain.

## Entry format

Append newest entries at the **bottom**, using exactly this shape:

```
## <YYYY-MM-DD HH:MM> · <agent> · <slug> · <RESOLVED | WORKAROUND | BLOCKED>
- **Step:** <phase / what you were doing>
- **Problem:** <one-line symptom>
- **Error:** `<verbatim error, trimmed, secrets stripped>`
- **Attempts:** 1) <fix tried> 2) <different fix tried>   (max per the retry cap)
- **Outcome:** <fixed how / working around by … / blocked, needs user>
- **Suggested fix:** <one line so the next run / a human can fix the root cause>
```

Example:

```
## 2026-07-01 14:22 · design · wheel-deal-driver-training · WORKAROUND
- **Step:** Phase 2 — publishing assets before v0 generation
- **Problem:** asset upload skipped
- **Error:** `publish-assets.py: SUPABASE_SERVICE_ROLE_KEY unset`
- **Attempts:** 1) re-ran the script 2) checked .env — key genuinely absent
- **Outcome:** continued in text-only branding mode; logo not attached to v0
- **Suggested fix:** set SUPABASE_SERVICE_ROLE_KEY in .env (or run new-supabase-project.py)
```

---

## Log

<!-- Agents: append new entries below this line, newest at the bottom. -->

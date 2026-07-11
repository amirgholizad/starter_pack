# Agent problem log

A running, append-only log of problems the pipeline agents (`intake`, `build`) hit — so
recurring failures become visible and fixable instead of being re-discovered every run.
**Agents append here; humans read here.**

## When to write an entry

Add an entry whenever you (an agent):

- **give up** on a step after your bounded retries (see the retry cap in `AGENTS.md`) — status `BLOCKED`;
- **worked around** a problem to keep going (e.g. built with a placeholder because an asset
  download failed) — status `WORKAROUND`;
- hit a **notable problem you recovered from** that is likely to recur (a screenshot service
  refusing a site, rclone unconfigured, a corrupted `node_modules`) — status `RESOLVED`.

Don't log routine, first-try successes. Log friction, not narration.

## Redaction — no PII or secrets

Reference the client by **slug only**. Never write emails, phone numbers, addresses, raw brief
content, API keys, or tokens into this file. Trim error messages to the relevant lines.

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
## 2026-07-01 14:22 · build · wheel-deal-driver-training · WORKAROUND
- **Step:** capturing the inspiration screenshot before building the hero
- **Problem:** screenshot came back blank
- **Error:** `snap.sh: could not capture https://… (site blocked the screenshot)`
- **Attempts:** 1) re-ran snap.sh 2) tried the WebFetch text instead
- **Outcome:** built from the fetched page text + the client's stated style notes
- **Suggested fix:** ask the client for a direct screenshot of the reference
```

---

## Log

<!-- Agents: append new entries below this line, newest at the bottom. -->

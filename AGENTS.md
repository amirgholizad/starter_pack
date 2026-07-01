<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

- This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

- Components come from shadcn only (no antd, no other UI kit).
- v0 output is a reference, not final code, it gets refactored into the app's structure.
- Tailwind for all styling; no inline style hacks.
- Supabase for data; no other DB client.
<!-- END:nextjs-agent-rules -->

# Operational rules (all agents)

Applies to every pipeline agent (`intake`, `design`, `build`, `db`, `deploy`) and the main
session. The goal: **fail fast, log it, never spin.**

## Don't get stuck — bounded retries

- When a step fails (tool error, failed `npm run build`, MCP/API error, an expected result
  that didn't land), you may retry with a **materially different** fix **at most twice**
  (3 attempts total for the same problem). Never repeat the same failing call unchanged.
- If **two different approaches both fail, stop.** Do not keep inventing variations — that's
  the loop that burns tokens. Escalate to the user with what you tried.
- Prefer the cheapest fix first; don't re-run an expensive generation (v0, a full build,
  a migration) just to "see if it works again."

## Token & scope discipline

- Don't re-read the same large file or re-run the same search repeatedly — read the specific
  part you need and remember it. Avoid full-repo scans when a targeted path will do.
- If a subtask balloons beyond its point (endless refactor, a design that won't converge),
  **pause and report progress** instead of pressing on silently.
- Stay in your lane: touch only this client's folder / this phase's files.

## Log problems to `logs/README.md`

Whenever you hit a real problem — **especially when you give up (BLOCKED) or work around it
(WORKAROUND)** — append an entry to [`logs/README.md`](logs/README.md) in the format defined
there before you stop or move on. Reference the client by **slug only**; never write PII,
keys, or tokens into the log. If a failure is non-blocking, log it, say you're skipping it,
and continue with the rest of the task rather than halting the whole run.

# Project guide

A repeatable pipeline that turns a client intake form into a **built website** on a fixed
stack: **Next.js · React · Tailwind · shadcn**. Claude does the whole thing end to end — no v0,
no backend, no paid design tool.

## Pipeline

```
intake → build
```

- **intake** ([.claude/agents/intake.md](.claude/agents/intake.md)) — reads one row of the
  Google-Form CSV in `intake/` → fills `clients/<slug>/brief.md` (design direction +
  inspiration links) and downloads the client's Drive assets (optional, needs rclone). **You
  review the brief** before building.
- **build** ([.claude/agents/build.md](.claude/agents/build.md)) — studies the brief's
  inspiration sites (**screenshot via `scripts/snap.sh` + fetched text via WebFetch**), sets the
  brand theme, then designs and builds the pages into `src/app/` with Tailwind + shadcn. Wires
  any contact form to Web3Forms and verifies `npm run build`.

Run both with **`/new-site "Business Name"`**, or dispatch one agent at a time (e.g. "run the
build agent for `<slug>`"). Client briefs/assets live under `clients/<slug>/` and are gitignored
(PII + binaries); only `clients/_template/` and the READMEs are tracked.

## This is NOT the Next.js you know

- This version has breaking changes — APIs, conventions, and file structure may all differ
  from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before
  writing any code. Heed deprecation notices.

## Conventions

- UI components come from **shadcn** only (no antd, no other UI kit). Add them with the
  shadcn CLI / MCP; they land in `src/components/ui/`.
- **Tailwind** for all styling — no inline `style` hacks.
- **Animations:** `framer-motion` is installed (`import { motion } from "framer-motion"`); use
  it for entrance / scroll / hover motion (client components only). Plain Tailwind /
  `tw-animate-css` is fine for simple transitions.
- Path aliases (see `components.json`): `@/components`, `@/lib`, `@/components/ui`,
  `@/lib/utils`, `@/hooks`.
- The `cn()` helper in `src/lib/utils.ts` merges class names.

## Contact forms (Web3Forms)

Contact / lead forms email submissions straight to an inbox via **Web3Forms** — no backend,
no database. The library is already installed (`@web3forms/react`). There is no form component
yet; build one on demand using the pattern below.

**Setup (once per site):**

1. Get a free access key at https://web3forms.com — enter the destination inbox and the key
   is emailed instantly (no account). Use a separate key per client site.
2. Put it in `.env.local` (copy from `.env.example`):
   `NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY=...`. The key is public/safe to ship to the browser —
   it only allows *submitting* to the bound inbox, nothing else.

**Building the form:**

- Add the shadcn primitives it needs — `button` is already in `src/components/ui/`:
  ```bash
  npx shadcn@latest add input textarea label sonner
  ```
  (`sonner` is optional — use it for success/error toasts.)
- Make it a client component and submit with the installed hook (default export is
  `useWeb3forms`, lowercase `forms`):

  ```tsx
  "use client";
  import useWeb3forms from "@web3forms/react";

  const { submit } = useWeb3forms({
    access_key: process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY!,
    onSuccess: (msg) => { /* toast success, reset the form */ },
    onError:   (msg) => { /* toast error */ },
  });
  // on submit: await submit({ name, email, message, botcheck: "" });
  ```

- **Spam:** include a hidden honeypot field named `botcheck` — Web3Forms drops any submission
  where it is filled. Pass extra params (e.g. `subject`, `from_name`) via the hook's optional
  `settings`.

**Alternative — hide the key / validate server-side:** POST the same fields to
`https://api.web3forms.com/submit` from a Next.js **server action** instead of the client
hook; then the key can be a plain (non-`NEXT_PUBLIC_`) env var. The client hook needs no
server code at all — prefer it unless you specifically need server-side handling.

## Operational rules (all agents)

Applies to the `intake` and `build` agents and the main session. The goal: **fail fast, log it,
never spin.**

- **Bounded retries.** When a step fails (a tool error, a failed `npm run build`, a screenshot
  that won't capture), retry with a **materially different** fix **at most twice**. If two
  distinct approaches both fail, **stop and escalate** with what you tried — don't invent
  variations in a loop. Prefer the cheapest fix first.
- **Scope & tokens.** Touch only the target client's folder / this phase's files. Read the
  specific part of a file you need instead of re-scanning the repo. If a subtask balloons, pause
  and report progress rather than pressing on silently.
- **Log real problems** to [`logs/README.md`](logs/README.md) — especially when you give up
  (`BLOCKED`) or work around something (`WORKAROUND`) — in the format defined there. Reference
  the client by **slug only**; never write PII, keys, or tokens into the log. A non-blocking
  failure: log it, say you're skipping it, and continue.

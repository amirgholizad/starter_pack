# Project guide

A minimal starter on a fixed stack: **Next.js · React · Tailwind · shadcn**.

## This is NOT the Next.js you know

- This version has breaking changes — APIs, conventions, and file structure may all differ
  from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before
  writing any code. Heed deprecation notices.

## Conventions

- UI components come from **shadcn** only (no antd, no other UI kit). Add them with the
  shadcn CLI / MCP; they land in `src/components/ui/`.
- **Tailwind** for all styling — no inline `style` hacks.
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

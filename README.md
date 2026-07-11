# Starter Pack

A minimal web starter on a fixed stack: **Next.js · React · Tailwind · shadcn**.

> This is **not** standard Next.js — this version has breaking changes vs. older releases.
> See [AGENTS.md](AGENTS.md) and read `node_modules/next/dist/docs/` before writing code.

## Prerequisites

- **Node.js 20.9+** and **npm** — https://nodejs.org
- **Git** — https://git-scm.com

## Get started

```bash
git clone https://github.com/amirgholizad/starter_pack.git
cd starter_pack
npm install
npm run dev
```

Then open http://localhost:3000 and edit [`src/app/page.tsx`](src/app/page.tsx).

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

## Adding shadcn components

UI components come from [shadcn](https://ui.shadcn.com) and live in `src/components/ui/`.
Add one with the CLI:

```bash
npx shadcn@latest add <component>
```

The shadcn MCP server is also wired up in [`.mcp.json`](.mcp.json) for use inside Claude Code.

## Contact forms

Contact/lead forms send email via [Web3Forms](https://web3forms.com) — no backend needed.
The `@web3forms/react` library is installed; copy [`.env.example`](.env.example) to
`.env.local` and set `NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY`. See the full pattern in
[AGENTS.md](AGENTS.md#contact-forms-web3forms).

## Layout

```
src/
  app/                 # routes (App Router)
    layout.tsx
    page.tsx
    globals.css        # Tailwind + theme tokens
  components/ui/        # shadcn components
  lib/utils.ts         # cn() class-name helper
components.json         # shadcn config + path aliases
```

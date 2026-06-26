# Website build workflow

Reusable starter for client sites. Fixed stack: **Next.js · React · Tailwind · shadcn · Supabase · Vercel**. Design is generated with **v0**, then built here by Claude Code.

## Pipeline

```
client brief → v0 generates design (Next/Tailwind/shadcn) →
Claude Code builds the real app → Supabase wired in → Vercel deploy → review loop
```

v0 outputs the same stack we build in, so its code is a **reference** to refactor, not the final app (see AGENTS.md).

## One-time setup per clone

1. `cp .env.example .env` and fill in the keys.
2. Export them into the shell that launches Claude Code so the MCP servers pick them up:
   `set -a; source .env; set +a` (or use direnv).
3. `npm install`
4. Launch Claude Code and approve the MCP servers.

## MCP servers (.mcp.json)

| Server     | Purpose                                           | Auth                       |
| ---------- | ------------------------------------------------- | -------------------------- |
| `shadcn`   | Browse/install correct shadcn components & blocks | —                          |
| `v0`       | Generate / iterate UI designs from a brief        | `V0_API_KEY` (Bearer, hosted) |
| `supabase` | Create tables, run migrations, read schema        | OAuth (hosted, `claude /mcp`) |

Supabase MCP is the **hosted** server (`https://mcp.supabase.com/mcp?project_ref=...`):
- Authenticate once per machine: run `claude /mcp` in a real terminal (not the IDE
  extension), select `supabase`, and complete the OAuth flow.
- It targets one project via the `project_ref` in the `.mcp.json` URL — **swap that
  ref per client**.

v0 note:
- v0 is the **official hosted MCP** (`https://mcp.v0.dev/sse`, Streamable HTTP, Bearer auth).
  `V0_API_KEY` must be exported in the shell that launches Claude Code so `${V0_API_KEY}`
  resolves in the header. The community `v0-mcp-server` npm package was dropped — it rejects
  current `v1:...:vcp_...` keys. Docs: https://v0.app/docs/api/platform/adapters/mcp-server

## Stack notes (this is NOT standard Next.js)

Read `node_modules/next/dist/docs/` before writing code. Already-bitten gotchas baked into this template:
- `middleware.ts` is renamed to **`proxy.ts`** (exports `proxy`, not `middleware`).
- `cookies()` is **async** — always `await cookies()`.

## Supabase helpers

- `src/lib/supabase/client.ts` — browser client (Client Components).
- `src/lib/supabase/server.ts` — server client (Server Components / Route Handlers).
- `src/lib/supabase/middleware.ts` — `updateSession()` for auth refresh.
- `src/proxy.ts` — runs `updateSession()` on every request.

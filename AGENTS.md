<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

- This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

- Components come from shadcn only (no antd, no other UI kit).
- v0 output is a reference, not final code, it gets refactored into the app's structure.
- Tailwind for all styling; no inline style hacks.
- Supabase for data; no other DB client.
<!-- END:nextjs-agent-rules -->

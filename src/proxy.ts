import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// In this Next.js the `middleware` convention was renamed to `proxy`.
// This file lives next to `app/` (so: src/proxy.ts) and refreshes the
// Supabase session before requests are handled.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Run on everything except static assets and image files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

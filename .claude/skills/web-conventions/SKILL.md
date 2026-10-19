---
name: web-conventions
description:
  House coding conventions for the Next.js client sites (components, forms,
  validation, error handling, file layout, and formatting). Read BEFORE writing
  or editing any .ts/.tsx in src/ — especially before building a form, a page, a
  component, or wiring validation. Derived from the deepflow-labs
  monorepo-template so generated sites match the team's standards.
---

# Web coding conventions

These are the house standards for the Next.js sites this repo builds. They are
adapted from the `deepflow-labs` monorepo-template so every generated site reads
like the rest of the team's work. Follow them when writing or editing any code
under `src/`.

When a rule below can't apply (e.g. the site has no backend / server actions),
skip that rule — don't invent infrastructure. But the **form**, **validation**,
**file-layout**, and **formatting** rules apply to every site.

Design decisions (layout, color, type, motion, imagery) come from the client's
brief and the **impeccable** skill. This skill governs how the code is written;
where impeccable's guidance would break a rule here (another UI kit, inline
styles, fabricated content), the rule here wins.

## Stack

- **Next.js App Router** + **React 19** + **TypeScript** (strict).
- **shadcn/ui** for all UI primitives (in `src/components/ui/`). No other UI
  kit.
- **Tailwind** for styling — no inline `style` hacks. Use the `cn()` helper.
- **zod** for all schema validation. **react-hook-form** + `@hookform/resolvers`
  for forms. **sonner** for toasts. **lucide-react** for icons.

## File & component conventions

- **Named exports** for components (`export function Hero()`), never `default` —
  except Next.js `page.tsx` / `layout.tsx` / `route.ts`, which must be default.
- **kebab-case filenames**: `contact-form.tsx`, `page-header.tsx`,
  `site-header.tsx`.
- **Server Components by default.** Add `"use client"` only when the file needs
  hooks, state, effects, or event handlers. Keep client components small — push
  `"use client"` down to the leaf that needs it, not the whole page.
- **Colocate** route-specific components next to their route; put cross-route
  components in `src/components/`. Shared UI primitives live in
  `src/components/ui/`.
- **Server actions** (if any) go in a colocated `*-actions.ts` file with
  `"use server"` at the top.
- Import via the path aliases (`@/components`, `@/lib`, `@/components/ui`,
  `@/hooks`).
- No `any`. No unused vars/imports. Prefer `type`/`interface` over inline shapes
  reused more than once.

## Validation lives in one place

Put **every zod schema in `src/lib/validators.ts`** and export the inferred type
next to it. Never inline a schema in a component or re-declare field rules.

```ts
// src/lib/validators.ts
import { z } from "zod";

export const contactFormSchema = z.object({
  name: z.string().min(1, "Please enter your name"),
  email: z.email("Please enter a valid email address"),
  phone: z.string().optional(),
  message: z
    .string()
    .min(10, "Please add a few more details (at least 10 characters)."),
});

export type ContactFormType = z.infer<typeof contactFormSchema>;
```

## Forms: react-hook-form + zodResolver + shadcn Form

Build **every** form with `react-hook-form`, `zodResolver`, and the shadcn
`Form` primitives — not raw `useState` + manual `safeParse`. Add the primitives
once with `npx shadcn@latest add form` (they land in
`src/components/ui/form.tsx`).

```tsx
"use client";

import { useTransition } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { contactFormSchema, type ContactFormType } from "@/lib/validators";

export function ContactForm() {
  const [isPending, startTransition] = useTransition();
  const form = useForm<ContactFormType>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { name: "", email: "", phone: "", message: "" },
  });

  const onSubmit: SubmitHandler<ContactFormType> = values => {
    startTransition(async () => {
      const { error } = await sendMessage(values); // server action OR provider call
      if (error) toast.error(error);
      else {
        toast.success("Thanks — we got your message!");
        form.reset();
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* …other fields… */}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Sending…" : "Send message"}
        </Button>
      </form>
    </Form>
  );
}
```

Rules:

- `FormMessage` renders the zod error per field — don't hand-roll error `<p>`s.
- Use `useTransition` (or RHF `formState.isSubmitting`) for the pending state
  and `disabled={isPending}`.
- Reset with `form.reset()` **only on success**.
- Keep the spam honeypot (`botcheck`) for Web3Forms; register it as a hidden
  field.

## Server actions & error handling (backend sites only)

If the site has server actions, mirror the template's shape:

- Return a typed **`ActionResponse<T>`** envelope: `{ data: T, error: null }` on
  success, `{ data: null, error: string }` on failure — never throw across the
  boundary.
- **Re-validate on the server** with the same zod schema (`safeParse`) — the
  client is untrusted. Flatten zod issues to a message for the envelope.
- Wrap awaited promises in a **`tryCatch(promise)` → `{ data, error }`** helper
  instead of raw try/catch; put shared helpers in `src/lib/` (`try-catch.ts`,
  `action-response.ts`).
- Call a **data-access layer** (`src/data/…`) from actions; don't inline
  external API/DB calls in the action body.
- `revalidatePath(...)` after a mutation.

For a static/marketing site with only a client provider call (Web3Forms), you
don't need server actions — but still return/handle a `{ data, error }`-shaped
result and toast on both paths.

## Constants, not magic strings

Centralize repeated strings in `src/lib/constants.ts` (or `site.ts`) and import
them — no route/phone/email literals scattered across components:

```ts
export const site = {
  name: "Client Business Name",
  phone: "000-000-0000",
  phoneHref: "tel:0000000000",
  email: "hello@example.com",
} as const;

export const routes = {
  home: "/",
  about: "/about",
  services: "/services",
  contact: "/contact",
} as const;
```

`src/lib/constants.ts` ships in this repo pre-stubbed — fill in the real values
from the brief rather than starting a new file.

## Never fabricate social proof

Never seed a client-facing component with **invented testimonials, reviews,
ratings, review counts, awards, client logos, or case-study numbers** — not even
as placeholder data flagged with a `PLACEHOLDER` comment. Placeholder copy in a
hero is harmless; a fake five-star review attributed to a named person renders
as a genuine claim to every visitor and is one forgotten task away from being a
lie on a live site.

When the data doesn't exist yet:

- render an **empty state** (a "be our first review" CTA) or omit the section;
- have the data function return `null` on a missing key or any error, and have
  the section render nothing rather than filler;
- note the gap in your summary so a human can fill it.

The same rule covers any factual claim — years in business, students taught,
certifications. If it isn't in the brief, it doesn't go on the page.

## Formatting & lint (must match the template)

Add a `.prettierrc` with exactly these options and run prettier on every file:

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

- **Double quotes, semicolons, 2-space, printWidth 100, `arrowParens: avoid`.**
- ESLint should treat `@typescript-eslint/no-explicit-any` and `no-unused-vars`
  as **errors**.
- `npm run build` (tsc + next) must be clean before shipping. No `any`, no
  unused.

## Pre-ship checklist

- [ ] All zod schemas in `src/lib/validators.ts`, types via `z.infer`.
- [ ] Every form uses react-hook-form + zodResolver + shadcn `Form` +
      `FormMessage`.
- [ ] Named exports; `"use client"` only where needed; kebab-case files.
- [ ] Repeated routes/phone/email pulled into `src/lib/constants.ts`.
- [ ] No invented reviews/testimonials/ratings/awards anywhere — empty state
      instead.
- [ ] `npm run format` run; `npm run format:check` and `npm run build` both
      clean.

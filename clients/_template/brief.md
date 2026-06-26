# Client Brief — <Business Name>

> Generated from the intake form response. Source: <timestamp / submitter email>.
> Tags show where each section is used: **→ v0** (design) · **→ build** (app) · **→ supabase** (schema).
> Replace every `<...>` placeholder. Leave "(none)" where the client left a field blank.

## 1. Identity & contact — → build
- Business name: <...>
- Contact name / role: <...>
- Phone: <...>
- Email: <...>
- Location: <...>
- Business hours: <...>
- Social links:
  - <...>
- Tagline / slogan: <...>

## 2. Brand — → v0 + build
- Logo provided: <yes/no>  · asset: <drive link or assets/...>
- Brand colors: <hex codes / description>
- Fonts: <...>
- Brand guide / style doc: <drive link or assets/...>

## 3. Content & pages — → v0 + build
- Pages: <Home, About, Services, Contact, ...>
- Written content per page: <drive link(s) or assets/...>
- Photos / images: <drive link(s) or assets/...>
- Video links: <...>
- Testimonials: <...>
- Awards / certifications / badges: <...>

## 4. Design direction — → v0
- Vibe / adjectives: <e.g. Professional, Minimal, Premium, Friendly>
- Sites they love (and why):
  - <url> — <what they like>
- Sites they dislike (and why):
  - <url> — <what puts them off>

## 5. Functionality — → build
- Features needed: <contact form, booking, gallery, ...>
- Dashboard for user data: <no | yes — what: profiles, comments, shared details>
- Integrations to connect: <Mailchimp, Calendly, Stripe, ... | none>

## 6. Data model — → supabase
> Derived from the goal + dashboard/data answers. This becomes the schema.
- What the site should do (goal): <...>
- Entities / tables to store: <leads, bookings, ... | none>
- Fields per entity:
  - <entity>: <field: type, ...>

## 7. Logistics & context — → build / deploy
- Domain owned: <no | yes — name + registrar>
- Existing site to replace: <url | none>
- Ideal customers: <...>
- Anything else: <...>

## 8. Assets to fetch
> Run: `python scripts/fetch-drive-assets.py clients/<name>/brief.md`
> It pulls every Google Drive link above into `clients/<name>/assets/`.
- [ ] logo
- [ ] page content
- [ ] photos
- [ ] brand guide
- [ ] other

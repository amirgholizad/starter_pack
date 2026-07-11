# Client Brief — <Business Name>

> Generated from the intake form response. Source: <timestamp / submitter email>.
> Every section feeds the **build** — Claude designs and builds the site directly from this
> brief (no v0, no backend). Replace every `<...>` placeholder. Leave "(none)" where the
> client left a field blank.

## 1. Identity & contact
- Business name: <...>
- Contact name / role: <...>
- Phone: <...>
- Email: <...>
- Location: <...>
- Business hours: <...>
- Social links:
  - <...>
- Tagline / slogan: <...>

## 2. Brand
- Logo provided: <yes/no>  · asset: <drive link or assets/...>
- Brand colors: <hex codes / description>
- Fonts: <...>
- Brand guide / style doc: <drive link or assets/...>

## 3. Content & pages
- Pages: <Home, About, Services, Contact, ...>
- Written content per page: <drive link(s) or assets/...>
- Photos / images: <drive link(s) or assets/...>
- Video links: <...>
- Testimonials: <...>
- Awards / certifications / badges: <...>

## 4. Design direction
- Vibe / adjectives: <e.g. Professional, Minimal, Premium, Friendly>
- Sites they love (and why):
  - <url> — <what they like>
- Sites they dislike (and why):
  - <url> — <what puts them off>
- Inspiration to emulate (live site / Dribbble / Land-book):
  - <url> — <what to copy: layout, color, type, spacing, overall feel>
- Developer style-match (authoritative — from "Additional comments by developers"):
  > When present, this overrides the vaguer client references above. The build agent
  > screenshots these URLs and fetches their text to match them.
  - Style: <url> — copy the visual style: layout, color, type, spacing, overall feel.
  - Context: <url> — copy the content / domain context: sections, information
    architecture, imagery subject (this is the "what the site is about" reference).
- Animations / interactions to emulate (a screenshot can't show motion — describe it):
  - <e.g. hero text fades up on load, cards lift on hover, sticky nav shrinks on scroll,
    sections reveal on scroll>

## 5. Functionality
- Features needed: <contact form, booking link, gallery, ...>
- Contact / lead form: <yes/no> — submissions email to: <destination inbox for Web3Forms;
  defaults to the §1 email>. (No database — forms are delivered by Web3Forms; see AGENTS.md.)
- Integrations to connect: <Mailchimp, Calendly, Stripe embed, ... | none>

## 6. Logistics & context
- What the site should do (goal): <...>
- Domain owned: <no | yes — name + registrar>
- Existing site to replace: <url | none>
- Ideal customers: <...>
- Anything else: <...>

## 7. Developer notes (authoritative)
> From the intake CSV's **"Additional comments by developers"** column. Authored by the
> developer (not the client) and **authoritative** — these override vaguer client answers
> and drive functionality (§5) and the style-match (§4). Blank → "(none)".
- Raw comment (verbatim): <...>
- Parsed requirements:
  - <build/functionality: e.g. booking embed, protected page, ...>
  - <design: pointer to the §4 style/context URLs>

## 8. Assets to fetch
> Run: `python scripts/fetch-drive-assets.py clients/<slug>/brief.md`
> It pulls every Google Drive link above into `clients/<slug>/assets/`, **renaming each file
> by the field it sits under** — `logo.jpg`, `brand-guide.pdf`, `page-content-1.jpg`,
> `photo-1.jpg` — so the build agent doesn't confuse them. `assets/manifest.md` maps every
> file back to its role + Drive id. (Keep each link under its field label above, or the role
> can't be detected.) Optional — if rclone isn't set up, leave the links and place assets by hand.
- [ ] logo
- [ ] page content
- [ ] photos
- [ ] brand guide
- [ ] other

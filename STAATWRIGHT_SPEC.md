# StaatWright Solutions Ltd — Full Product Specification
**Version 1.0 | March 2026**

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Information Architecture](#3-information-architecture)
4. [Brand & Design System](#4-brand--design-system)
5. [Public Website Spec](#5-public-website-spec)
6. [Admin Suite Spec](#6-admin-suite-spec)
7. [Database Schema](#7-database-schema)
8. [Claude Code Build Prompts](#8-claude-code-build-prompts)

---

## 1. Project Overview

StaatWright Solutions Ltd is a digital solutions company and consultancy firm. The product is a **single Next.js application** with two distinct surfaces:

- **Public website** — Swiss-minimal, brutally confident, PWA. Showcases what StaatWright does and the platforms/products it has built. Serves B2B clients, investors, and general credibility.
- **Admin suite** — A private, login-protected workspace for the two co-owners to manage all business operations: invoicing, quoting, credit notes, file management, expense tracking, brand assets per project, and a financial dashboard.

### Partners / Builds to Showcase (public site)
| Display Name | Status |
|---|---|
| CAIRN Solutions (formerly Refrag) | Live link TBC |
| Concierge Styled (formerly MoodMiles) | Live link TBC |
| Airshot Base | Live link TBC |
| KZN Youth Choirs | Live link TBC |
| In the Absence of a Soapbox | Live link TBC |

---

## 2. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | Consistent with CAIRN Solutions & Airshot builds |
| Language | TypeScript | Type safety across the whole app |
| Database | Supabase (Postgres + RLS) | Auth, storage, and DB in one; matches your other builds |
| Auth | Supabase Auth (email/password) | Simple two-owner setup, no OAuth needed initially |
| File Storage | Supabase Storage | For file manager uploads (PDFs, slips, assets) |
| Styling | Tailwind CSS | Utility-first, fast to build, consistent with your stack |
| UI Components | shadcn/ui | Headless, unstyled base — you control the aesthetics |
| PDF Generation | @react-pdf/renderer | Invoice, quote, credit note PDF export |
| Email | Resend | Send invoices via email; simple API, generous free tier |
| Hosting | Vercel | Best-in-class Next.js hosting, free tier sufficient for now |
| PWA | next-pwa | Service worker + manifest for installability |

---

## 3. Information Architecture

```
staatwright.co.za/
│
├── / (Home — public)
│   ├── #hero
│   ├── #services
│   ├── #partners
│   └── #contact
│
├── /admin (redirect to /admin/dashboard if authed, else /admin/login)
│   ├── /admin/login
│   ├── /admin/dashboard
│   ├── /admin/clients
│   │   ├── /admin/clients/[id]
│   ├── /admin/invoices
│   │   ├── /admin/invoices/new
│   │   └── /admin/invoices/[id]
│   ├── /admin/quotes
│   │   ├── /admin/quotes/new
│   │   └── /admin/quotes/[id]
│   ├── /admin/credit-notes
│   │   └── /admin/credit-notes/[id]
│   ├── /admin/files
│   │   └── /admin/files/[...path] (nested folder navigation)
│   ├── /admin/expenses
│   ├── /admin/brands
│   │   └── /admin/brands/[id]
│   └── /admin/settings
│       ├── company (StaatWright details, VAT, bank)
│       └── team (user management)
```

---

## 4. Brand & Design System

### Colours (from brand board)
```css
:root {
  --color-ink:        #1A1A1A;   /* Near-black — body text */
  --color-cream:      #F3F2EE;   /* Off-white — light backgrounds */
  --color-steel:      #5C6E81;   /* Muted blue — accents, secondary */
  --color-linen:      #EAE4DC;   /* Warm white — cards, surfaces */
  --color-navy:       #1F2A38;   /* Deep navy — primary brand, headers */
  --color-white:      #FFFFFF;
}
```

### Typography
```css
/* Display / Headings */
font-family: 'Poppins', sans-serif;
font-weight: 700 (headings), 400 (body)

/* Body / UI */
font-family: 'Montserrat', sans-serif;
font-weight: 400 (body), 500 (labels/nav)
```

Both loaded via `next/font/google`.

### Design Principles
- **Swiss grid**: 12-column, generous whitespace, strict typographic hierarchy
- **No decoration for decoration's sake**: every element earns its place
- **Navy + cream** as the dominant pairing; steel as the only accent
- **Uppercase tracking** on labels, section headings (`letter-spacing: 0.15em`)
- **Borders over shadows**: 1px solid lines instead of box shadows
- **Motion**: Subtle fade-up on scroll for sections; no bounces, no slides

---

## 5. Public Website Spec

### 5.1 PWA Configuration
- `manifest.json`: name="StaatWright", short_name="SW", theme_color="#1F2A38", background_color="#F3F2EE"
- Service worker: cache-first for static assets, network-first for pages
- Icons: 192×192 and 512×512 in navy

### 5.2 Navigation
- Fixed top nav, `background: var(--color-navy)`, height 64px
- Left: StaatWright wordmark (Poppins Bold, cream)
- Right: anchor links — Services · Partners · Contact
- On mobile: hamburger → full-screen overlay nav (navy background, cream text)
- Scroll-aware: nav gets a subtle bottom border after 40px scroll

### 5.3 Hero Section
```
Layout: Full viewport height
Background: var(--color-navy)
Content (centred, max-width 800px):

  STAATWRIGHT SOLUTIONS  [tracked caps, steel, small — above heading]
  
  Complexity, managed.      [Poppins Bold, 72px desktop / 40px mobile, cream]
  Simplicity, experienced.  [same, but lighter weight]
  
  [One-line descriptor — Montserrat Regular, steel, 18px]
  "We build digital platforms, products, and systems for businesses that mean it."
  
  [CTA button — cream bg, navy text, no border-radius / square corners]
  "See our work  ↓"
```

### 5.4 Services Section
```
Background: var(--color-cream)
Layout: 3-column grid (collapses to 1 on mobile)
Section label: "WHAT WE DO" — tracked caps, steel

Three service pillars (editable via admin settings later):
1. Digital Products
   "We design and build web apps, PWAs, and platforms from the ground up."

2. Systems & Integrations
   "We connect the tools your business already uses into coherent, automated systems."

3. Consultancy
   "We assess, architect, and advise — without the agency overhead."

Each pillar: number (01, 02, 03) in steel + title in navy + description in ink.
No icons. No illustrations. Typographic only.
```

### 5.5 Partners / Builds Section
```
Background: var(--color-white)
Section label: "PARTNERS & BUILDS"
Layout: CSS grid — 3 columns desktop, 2 tablet, 1 mobile

Each card:
- White background, 1px solid var(--color-linen) border
- Logo (uploaded via admin) — max height 48px, grayscale filter, hover: full colour
- One-liner — Montserrat, 14px, ink
- Status badge: "Live" (steel) or "Coming Soon" (linen/muted)
- If live: entire card is a link → opens in new tab
- Hover: border colour shifts to navy, subtle translateY(-2px)

Cards managed entirely via admin (add/remove/reorder/toggle visibility)
```

### 5.6 Contact Section
```
Background: var(--color-navy)
Layout: Two columns — left: copy, right: form

Left:
  "Let's talk."  [Poppins Bold, 48px, cream]
  "We're selective about what we take on.  [Montserrat, steel]
   If you're building something that matters, so are we."
  
  [contact@staatwright.co.za — cream, underlined on hover]

Right form fields:
  - Name (text)
  - Company (text, optional)
  - Email (email)
  - Message (textarea, 4 rows)
  - [Submit — cream bg, navy text]

Form submits to a Supabase `contact_submissions` table.
Optional: Resend notification email to owners on submission.
```

### 5.7 Footer
```
Background: #111111 (near-black)
Single row: © 2026 StaatWright Solutions Ltd  |  Reg: [from settings]
Right: LinkedIn icon (optional), back-to-top arrow
```

---

## 6. Admin Suite Spec

### 6.1 Authentication
- `/admin/login`: email + password via Supabase Auth
- Protected via Next.js middleware — any `/admin/*` route redirects to login if unauthenticated
- Two users: co-owners. No self-registration. Add users manually in Supabase or via settings page.
- Session persists via Supabase cookie auth

### 6.2 Layout & Shell
```
Left sidebar (240px, fixed, navy background):
  - StaatWright logo / wordmark (top)
  - Nav items with icons:
      Dashboard
      Clients
      Invoices
      Quotes
      Credit Notes
      Files
      Expenses
      Brand Assets
      ── divider ──
      Settings

Top bar (content area):
  - Page title (left)
  - User avatar + name (right) + logout

Content area: cream/white background, 24px padding
```

### 6.3 Dashboard
**Widgets (top row):**
- Outstanding invoices total (ZAR)
- Overdue invoices count (red badge if any)
- Unpaid quotes count
- Month-to-date expenses

**Recent Activity feed:**
- Last 10 actions: invoice created/sent/paid, quote accepted, expense logged, file uploaded
- Each item: timestamp + description + link to relevant record

**Outstanding Invoices table:**
- Columns: Client | Invoice # | Amount | Due Date | Status | Actions (send / mark paid / view)

### 6.4 Clients
- Client list: Company name, contact person, email, phone, tags (e.g. "Active", "Partner", "Prospect")
- Client detail page:
  - Profile (editable): name, company, address, VAT number, contact details
  - Tabs: Invoices | Quotes | Credit Notes | Files | Notes
  - Notes: simple append-only text log (timestamped, author-initialled)

### 6.5 Invoicing

#### Document Types
All three share the same underlying structure. Differences:
| | Invoice | Quote | Credit Note |
|---|---|---|---|
| Prefix | INV- | QUO- | CN- |
| Numbering | INV-0001 sequential | QUO-0001 sequential | CN-0001 sequential |
| Statuses | Draft → Sent → Paid / Overdue / Cancelled | Draft → Sent → Accepted / Declined / Expired | Draft → Issued |
| Totals | Subtotal + VAT + Total | Subtotal + VAT + Total | Negative subtotal |

#### Document Builder (shared component)
```
Header:
  [StaatWright logo + details pulled from Settings]     [Document type + number]
  [Company reg, VAT number, address, contact]           [Date issued]
                                                         [Due date (invoices)]
                                                         [Valid until (quotes)]

Bill To:
  [Client name, company, address, VAT — pulled from client record]

Line Items table:
  | # | Description | Qty | Unit Price (ZAR) | VAT % | Line Total |
  [+ Add Line Item button]
  [+ Add Section Heading button — for grouped invoices]

Totals:
  Subtotal: R X,XXX.XX
  VAT (15%): R XXX.XX
  TOTAL: R X,XXX.XX

Notes / Terms: [free text area — pre-populated from Settings default]

Banking Details: [pulled from Settings — shown on invoices and quotes]
  Bank: [bank name]
  Account: [account number]
  Branch: [branch code]
  Reference: [invoice number]
```

#### PDF Export
- One button: "Download PDF" — generates via @react-pdf/renderer
- Styled to match brand (navy header, cream accents, clean typography)
- Filename: `INV-0001_ClientName.pdf`

#### Email Invoice
- "Send via Email" button
- Opens modal: pre-filled To (client email), Subject ("Invoice INV-0001 from StaatWright Solutions"), Body (editable template)
- Sends via Resend with PDF attached
- Logs send event to `document_events` table

### 6.6 File Manager

**Concept:** Replace Google Drive / local folders entirely. Think Finder/Explorer, but in the browser.

**Features:**
- Create folder at any level
- Rename folder
- Delete folder (with confirmation if non-empty)
- Upload files (drag-and-drop or click-to-browse): PDF, PNG, JPG, DOCX, XLSX, CSV, ZIP
- Download file
- Delete file
- Move file (drag to folder, or move via context menu)
- Preview: PDFs inline, images inline
- Breadcrumb navigation: Files / Clients / CAIRN Solutions / Contracts /

**Storage:** Supabase Storage bucket `files`, paths mirror virtual folder structure.

**Database:** A `file_nodes` table stores the virtual tree (folders are rows with `type='folder'`, files are rows with `type='file'` and a `storage_path`). This allows rename/move without touching Supabase Storage paths.

**UI:**
- Left panel: folder tree (collapsible)
- Right panel: contents of selected folder (grid or list toggle)
- Top bar: breadcrumb + search + upload button + new folder button
- Context menu (right-click or ⋮ menu): Open / Download / Move / Rename / Delete

### 6.7 Expenses

**Purpose:** Track outgoings, upload slips, categorise. Not accounting software — a clean ledger.

**List view columns:** Date | Description | Category | Amount (ZAR) | Slip | Actions

**Add Expense form:**
- Date
- Description
- Category (dropdown, configurable): Software / Hosting / Travel / Subcontractors / Equipment / Office / Other
- Amount (ZAR, excl. VAT)
- VAT included? (checkbox → auto-calculates VAT portion)
- Slip upload (PDF or image — stored in Supabase Storage under `/expenses/`)
- Notes (optional)
- Linked client/project (optional dropdown)

**Summary cards (top of page):**
- Total this month
- Total this financial year (March–Feb SA FY)
- By category breakdown (simple bar or just numbers)

**Export:** CSV export of filtered expense list

### 6.8 Brand Assets

**Concept:** Each product/platform/partner StaatWright has built gets its own brand workspace.

**Brand list page:** Cards grid — logo thumbnail + project name + last updated

**Brand detail page (tabs):**

**Tab 1 — Identity**
- Project name (display name)
- Tagline / one-liner
- Status: Active / Archived / In Development
- Live URL
- Description (internal notes)

**Tab 2 — Colours**
- Add swatches: name (e.g. "Navy Primary") + hex value + role (Primary / Secondary / Accent / Background / Text)
- Visual swatch display
- Copy hex on click

**Tab 3 — Typography**
- Font pairs: Font name + weight + role (Display / Body / UI)
- Source: Google Fonts / Custom upload / System

**Tab 4 — Logos**
- Upload variants: Primary / Icon / Dark / Light / Horizontal / Stacked
- View, download, replace each variant
- Stored in Supabase Storage under `/brands/[brand-id]/logos/`

**Tab 5 — Files**
- General brand files: brand guidelines PDF, source files, etc.
- Same drag-and-drop upload as file manager
- Stored under `/brands/[brand-id]/files/`

**Tab 6 — Public Site**
- Toggle: "Show on public website" (controls visibility on the Partners section)
- One-liner for public display (syncs to partner card)
- Logo variant to use on public site (dropdown of uploaded logos)
- Live link URL

### 6.9 Settings

**Company tab:**
- Company name
- Registration number
- VAT number
- Address (multi-line)
- Phone
- Email
- Logo (upload — used on invoices/PDFs)

**Banking tab:**
- Bank name
- Account holder
- Account number
- Branch code
- Account type (Cheque / Savings / Current)

**Invoice Defaults tab:**
- Default payment terms (e.g. "Payment due within 30 days")
- Default notes/footer text on invoices
- Default VAT rate (15%)
- Quote validity period (default: 30 days)
- Invoice number prefix (default: INV-)
- Quote number prefix (default: QUO-)
- Credit note prefix (default: CN-)

**Team tab:**
- List of admin users (email + last login)
- Invite new user (sends Supabase auth invite)
- Remove user

**Public Site tab:**
- Hero tagline (editable — syncs to public site)
- Services section content (3 pillars: title + description each)
- Contact email address shown on public site

---

## 7. Database Schema

```sql
-- COMPANY SETTINGS (single row)
create table company_settings (
  id uuid primary key default gen_random_uuid(),
  name text,
  reg_number text,
  vat_number text,
  address text,
  phone text,
  email text,
  logo_path text,
  bank_name text,
  bank_account_holder text,
  bank_account_number text,
  bank_branch_code text,
  bank_account_type text,
  invoice_default_terms text,
  invoice_default_notes text,
  invoice_vat_rate numeric default 15,
  invoice_prefix text default 'INV-',
  quote_prefix text default 'QUO-',
  cn_prefix text default 'CN-',
  quote_validity_days integer default 30,
  hero_tagline text,
  service_1_title text, service_1_body text,
  service_2_title text, service_2_body text,
  service_3_title text, service_3_body text,
  contact_email text,
  updated_at timestamptz default now()
);

-- CLIENTS
create table clients (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_person text,
  email text,
  phone text,
  address text,
  vat_number text,
  tags text[],
  notes text, -- append-only log stored as text; consider jsonb array for timestamped entries
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- DOCUMENTS (Invoices, Quotes, Credit Notes)
create table documents (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('invoice','quote','credit_note')),
  number text not null unique,
  client_id uuid references clients(id),
  status text not null default 'draft',
  -- status options per type:
  -- invoice: draft | sent | paid | overdue | cancelled
  -- quote: draft | sent | accepted | declined | expired
  -- credit_note: draft | issued
  issue_date date,
  due_date date,        -- invoices only
  valid_until date,     -- quotes only
  line_items jsonb not null default '[]',
  -- line_items: [{id, description, qty, unit_price, vat_rate, line_total}]
  subtotal numeric,
  vat_total numeric,
  total numeric,
  notes text,
  terms text,
  pdf_path text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- DOCUMENT EVENTS (audit trail: sent, paid, etc.)
create table document_events (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id),
  event_type text, -- created | sent | paid | status_changed | pdf_generated
  detail jsonb,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

-- EXPENSES
create table expenses (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  description text not null,
  category text,
  amount_excl_vat numeric,
  vat_amount numeric,
  amount_incl_vat numeric,
  slip_path text,
  notes text,
  client_id uuid references clients(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- FILE NODES (virtual file tree)
create table file_nodes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('folder','file')),
  parent_id uuid references file_nodes(id),
  storage_path text, -- null for folders
  mime_type text,
  size_bytes bigint,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

-- BRANDS
create table brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tagline text,
  description text,
  status text default 'active' check (status in ('active','archived','in_development')),
  live_url text,
  show_on_public_site boolean default false,
  public_one_liner text,
  public_logo_variant text, -- key of the logo variant to show publicly
  public_sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- BRAND COLOURS
create table brand_colours (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brands(id) on delete cascade,
  name text,
  hex text,
  role text -- primary | secondary | accent | background | text
);

-- BRAND TYPOGRAPHY
create table brand_typography (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brands(id) on delete cascade,
  font_name text,
  weight text,
  role text, -- display | body | ui
  source text -- google | custom | system
);

-- BRAND LOGOS
create table brand_logos (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brands(id) on delete cascade,
  variant text, -- primary | icon | dark | light | horizontal | stacked
  storage_path text,
  uploaded_at timestamptz default now()
);

-- CONTACT SUBMISSIONS (from public site)
create table contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text,
  company text,
  email text,
  message text,
  created_at timestamptz default now()
);
```

### Row Level Security
All admin tables: policy allows select/insert/update/delete only for `auth.role() = 'authenticated'`.
`contact_submissions`: allow insert for anon (public form), select for authenticated only.
`company_settings`, `brands`: allow public select on specific columns for public site rendering (or use a server-side API route to fetch and never expose the full table to anon).

---

## 8. Claude Code Build Prompts

Use these prompts sequentially in Claude Code. Each prompt is a self-contained phase. Complete and verify each phase before moving to the next.

---

### PROMPT 1 — Project Scaffold & Design System

```
Create a new Next.js 14 (App Router) project called "staatwright" with TypeScript and Tailwind CSS.

Set up the following:

1. Install dependencies:
   - @supabase/supabase-js @supabase/ssr
   - shadcn/ui (init with default config)
   - next-pwa
   - @react-pdf/renderer
   - resend
   - lucide-react

2. Configure next/font/google to load Poppins (weights: 400, 600, 700) and Montserrat (weights: 400, 500, 600) and expose them as CSS variables --font-poppins and --font-montserrat.

3. Create a globals.css with this exact CSS variable set:
   --color-ink: #1A1A1A
   --color-cream: #F3F2EE
   --color-steel: #5C6E81
   --color-linen: #EAE4DC
   --color-navy: #1F2A38
   --color-white: #FFFFFF
   Set body font to Montserrat, heading font to Poppins.

4. Create a PWA manifest at public/manifest.json:
   name: "StaatWright Solutions"
   short_name: "StaatWright"
   theme_color: "#1F2A38"
   background_color: "#F3F2EE"
   display: "standalone"
   icons: 192 and 512 (placeholder SVG for now)

5. Create a /lib/supabase/ folder with:
   - client.ts (browser Supabase client)
   - server.ts (server Supabase client using @supabase/ssr createServerClient)
   - middleware.ts helper

6. Create next.config.ts configured for next-pwa.

7. Create middleware.ts at the root that:
   - Allows all public routes through
   - Redirects any /admin/* route to /admin/login if no valid Supabase session exists
   - Redirects /admin/login to /admin/dashboard if already authenticated

8. Create a /lib/types.ts file with TypeScript interfaces matching the full database schema defined below. Include: CompanySettings, Client, Document, DocumentLineItem, DocumentEvent, Expense, FileNode, Brand, BrandColour, BrandTypography, BrandLogo, ContactSubmission.

Do not build any UI pages yet. Just the scaffold, config, types, and Supabase helpers.
```

---

### PROMPT 2 — Supabase Schema & Seed

```
In the staatwright project, create the full Supabase database schema.

Create a file at /supabase/schema.sql with the complete SQL for all tables as specified. Include:
- company_settings (single-row config table)
- clients
- documents (invoices, quotes, credit notes — unified table with `type` field)
- document_events
- expenses
- file_nodes (virtual file tree)
- brands
- brand_colours
- brand_typography
- brand_logos
- contact_submissions

For every table add: created_at timestamptz default now(), updated_at timestamptz default now() where appropriate.

Add Row Level Security:
- All tables: authenticated users can select/insert/update/delete
- contact_submissions: anon can insert, authenticated can select
- brands: add a policy allowing anon SELECT only on columns: id, name, tagline, live_url, show_on_public_site, public_one_liner, public_logo_variant, public_sort_order (for public site partner cards)
- company_settings: anon SELECT only on: hero_tagline, service_1_title, service_1_body, service_2_title, service_2_body, service_3_title, service_3_body, contact_email

Create a /supabase/seed.sql with:
- One company_settings row with placeholder StaatWright data
- Three sample brands: CAIRN Solutions, Concierge Styled, Airshot Base — all with show_on_public_site = true
- One sample client

Create a README section documenting how to run the schema and seed against a new Supabase project.
```

---

### PROMPT 3 — Public Website (Single-Page)

```
Build the public-facing home page for StaatWright at app/page.tsx.

Design brief: Swiss-minimal, cold and confident. Navy (#1F2A38) and cream (#F3F2EE) as the dominant pairing. Steel (#5C6E81) as the only accent. Poppins for headings, Montserrat for body. Square corners everywhere (no border-radius). 1px solid lines instead of box shadows. Uppercase tracked labels on section headings. Subtle fade-up animation on scroll for each section.

Build these sections as separate components in /components/public/:

**1. PublicNav**
- Fixed, 64px, navy background
- Left: "StaatWright" wordmark (Poppins Bold, cream)
- Right: anchor links — Services · Partners · Contact (Montserrat 500, cream, hover: steel)
- After 40px scroll: add 1px bottom border in steel
- Mobile: hamburger → full-screen overlay (navy bg, cream text, large links)

**2. HeroSection**
- Full viewport height, navy background
- Vertically centred content, max-width 800px, centred
- Above heading: "STAATWRIGHT SOLUTIONS" — tracked caps, steel, Montserrat 500, 12px
- Main heading: "Complexity, managed." (Poppins Bold 72px desktop/40px mobile, cream) then "Simplicity, experienced." (Poppins 300, same size)
- Subheading: "We build digital platforms, products, and systems for businesses that mean it." (Montserrat Regular, steel, 18px)
- CTA button: "See our work ↓" — cream background, navy text, Poppins 600, no border-radius, 48px height, links to #partners

**3. ServicesSection** (id="services")
- Background: var(--color-cream)
- Section label: "WHAT WE DO" — tracked caps, steel, 12px, Montserrat 500
- 3-column grid (collapses to 1 on mobile)
- Fetch service content from company_settings via a server component (or static fallback if null):
  - 01 / Digital Products / "We design and build web apps, PWAs, and platforms from the ground up."
  - 02 / Systems & Integrations / "We connect the tools your business already uses into coherent, automated systems."
  - 03 / Consultancy / "We assess, architect, and advise — without the agency overhead."
- Number in steel, title in navy (Poppins 600), description in ink (Montserrat Regular 15px)
- No icons, no illustrations. Typographic only.
- Top border: 1px solid var(--color-linen) on each card

**4. PartnersSection** (id="partners")
- Background: white
- Section label: "PARTNERS & BUILDS"
- Fetch brands where show_on_public_site = true, ordered by public_sort_order
- CSS grid: 3 cols desktop, 2 tablet, 1 mobile
- Each card:
  - 1px solid var(--color-linen) border
  - Logo from Supabase Storage (public URL from public_logo_variant) — max-height 48px, grayscale filter, hover: full colour, transition 300ms
  - One-liner: public_one_liner text, Montserrat 14px, ink
  - Status badge if no live_url: "Coming Soon" pill, linen bg, steel text
  - If live_url exists: full card is an <a> link opening in new tab
  - Hover state: border-color shifts to navy, translateY(-2px), 200ms ease

**5. ContactSection** (id="contact")
- Background: navy
- Two-column layout (stacks on mobile): left copy, right form
- Left: "Let's talk." (Poppins Bold 48px, cream) + subtext (Montserrat, steel) + contact email from company_settings
- Right form: Name, Company (optional), Email, Message (textarea 4 rows) — all inputs: cream background, navy text, 1px steel border, no border-radius
- Submit button: cream bg, navy text, full width
- On submit: POST to /api/contact which inserts to contact_submissions and optionally sends a Resend notification

**6. Footer**
- Background: #111111
- Single row: "© 2026 StaatWright Solutions Ltd" left, back-to-top arrow right
- Montserrat 13px, color: steel

Create /app/api/contact/route.ts — server action that inserts contact form data to Supabase and sends a notification email via Resend to the company contact email from settings.
```

---

### PROMPT 4 — Admin Shell, Auth & Dashboard

```
Build the admin authentication and shell for the staatwright project.

**Auth pages:**
Create /app/admin/login/page.tsx:
- Centred card on navy background
- StaatWright wordmark at top
- Email + password fields (cream inputs, navy text)
- "Sign in" button (cream bg, navy text)
- Uses Supabase Auth signInWithPassword
- On success: redirect to /admin/dashboard
- On error: show inline error message

**Admin shell layout:**
Create /app/admin/layout.tsx as a server component that:
- Checks Supabase session, redirects to login if none
- Renders the admin shell: fixed sidebar (240px, navy) + top bar + content area

Create /components/admin/Sidebar.tsx:
- StaatWright logo/wordmark at top (cream, small)
- Nav links with lucide-react icons:
  LayoutDashboard → /admin/dashboard
  Users → /admin/clients
  FileText → /admin/invoices
  ClipboardList → /admin/quotes
  Receipt → /admin/credit-notes
  Folder → /admin/files
  CreditCard → /admin/expenses
  Palette → /admin/brands
  Settings → /admin/settings
- Active link: cream background at 10% opacity, cream text
- Inactive: steel text, hover cream text
- Bottom: current user email + logout button

Create /components/admin/TopBar.tsx:
- Page title (passed as prop)
- User avatar initial circle + name + logout icon

**Dashboard page** /app/admin/dashboard/page.tsx:
- Page title: "Dashboard"
- Top row: 4 stat cards (cream bg, 1px linen border):
  1. Outstanding Invoices total (ZAR) — query documents where type=invoice and status in (sent, overdue)
  2. Overdue invoices count — red badge if > 0
  3. Unpaid quotes count
  4. Month-to-date expenses total
- Recent Activity section:
  - Fetch last 10 document_events ordered by created_at desc
  - Each row: icon + description + timestamp (relative, e.g. "2 hours ago") + link to document
- Outstanding Invoices table:
  - Columns: Client | Invoice # | Amount | Due Date | Status | Actions
  - Status pill: Sent (steel), Overdue (red), Draft (muted)
  - Actions: View | Send | Mark Paid
  - Paginated, 10 per page

All data fetched server-side via Supabase server client.
```

---

### PROMPT 5 — Clients Module

```
Build the Clients module for the staatwright admin.

**/app/admin/clients/page.tsx** — Client list:
- Top bar: "Clients" title + "New Client" button (navy bg, cream text)
- Search input (filter by name/email live)
- Table: Company | Contact | Email | Phone | Tags | Actions (View / Edit / Delete)
- Tags shown as small pills
- Clicking row or View → /admin/clients/[id]
- Delete: confirm dialog via shadcn AlertDialog

**/app/admin/clients/new/page.tsx** and **/app/admin/clients/[id]/page.tsx**:
- Client form: Company Name*, Contact Person, Email, Phone, Address (textarea), VAT Number, Tags (multi-input: type tag + Enter)
- Save/Update via Supabase upsert
- On the detail page, show tabs: Overview | Invoices | Quotes | Credit Notes | Notes

**Notes tab:**
- Append-only log: textarea + "Add Note" button
- Notes stored as JSONB array in clients.notes: [{text, created_at, initials}]
- Display newest first, each entry showing initials badge + text + timestamp

**Invoices/Quotes/Credit Notes tabs:**
- Show filtered list of that client's documents
- "New Invoice" / "New Quote" button that pre-selects this client
- Same table format as main invoices list

Use React Server Components where possible. Use shadcn Tabs for the detail page tabs.
```

---

### PROMPT 6 — Invoicing, Quotes & Credit Notes

```
Build the unified document builder for Invoices, Quotes, and Credit Notes in the staatwright admin.

Create a shared /components/admin/DocumentBuilder.tsx component that handles all three document types. It receives a `type` prop: 'invoice' | 'quote' | 'credit_note'.

**/app/admin/invoices/page.tsx** — Invoice list:
- Filters: All | Draft | Sent | Paid | Overdue
- Table: # | Client | Amount | Issue Date | Due Date | Status | Actions
- Actions: View/Edit | Download PDF | Send Email | Mark Paid | Duplicate
- "New Invoice" button

**/app/admin/invoices/new/page.tsx** and **/app/admin/invoices/[id]/page.tsx**:
- Use DocumentBuilder component

**DocumentBuilder component:**
Header section:
- Auto-generated document number (fetch next sequence from DB)
- Client selector (searchable dropdown, pulls from clients table)
- Issue date (date picker)
- Due date (invoices) or Valid until (quotes) — date pickers
- Document status badge (editable dropdown)

Line items section:
- Dynamic rows: Description | Qty | Unit Price | VAT % (default 15%) | Line Total (auto-calculated)
- "+ Add Line Item" button
- "+ Add Section Heading" button (adds a non-priced heading row for grouping)
- Drag to reorder rows (use @dnd-kit/sortable)
- Delete row button

Totals section (right-aligned):
- Subtotal, VAT total, Grand Total — all auto-calculated
- Display in ZAR (R X,XXX.XX format)

Notes and Terms:
- Two textareas, pre-populated from company_settings defaults

Banking Details:
- Auto-populated from company_settings, shown read-only in builder

Action buttons (sticky bottom bar):
- Save Draft | Download PDF | Send via Email | (for invoices: Mark as Paid)

**PDF generation:**
Create /lib/pdf/DocumentPDF.tsx using @react-pdf/renderer:
- Matches the brand: navy header, cream/white body, clean typography
- Company logo + details (from settings) top left
- Document type + number + dates top right
- Bill To section
- Line items table
- Totals
- Notes, terms, banking details at bottom

**Email sending:**
Create /app/api/documents/send/route.ts:
- Accepts: document_id
- Fetches document + client + company settings
- Generates PDF
- Sends via Resend with PDF attached
- Logs to document_events

Build identical pages for /admin/quotes and /admin/credit-notes using the same DocumentBuilder.
```

---

### PROMPT 7 — File Manager

```
Build the File Manager module for the staatwright admin at /app/admin/files/[...path]/page.tsx.

**Concept:** A full browser-based file system replacing Google Drive / local folders. Two-panel layout.

**Left panel — Folder tree (280px):**
- Collapsible tree of all folders from file_nodes where type='folder'
- Clicking a folder navigates to it (updates URL path and right panel)
- Right-click context menu on any folder: Rename | New Subfolder | Delete
- "New Folder" button at the top of the panel
- Highlight active folder

**Right panel — Contents:**
- Top bar:
  - Breadcrumb navigation (Home / Folder / Subfolder) — clickable segments
  - View toggle: Grid | List
  - "New Folder" button
  - "Upload Files" button
- **Drag and drop upload:** entire right panel is a drop zone. On drop: show upload progress. Upload to Supabase Storage, then insert file_node record.
- **Grid view:** thumbnail for images, file-type icon for PDFs/docs, folder icon for folders. Name below. Hover: show action buttons.
- **List view:** Name | Type | Size | Date Modified | Actions
- **Context menu** (⋮ on each item): Open/Preview | Download | Move | Rename | Delete

**Preview:**
- Images: show in a shadcn Dialog/modal, full size with close button
- PDFs: embed in an <iframe> within a modal

**Move files:**
- Modal with folder tree picker
- On confirm: update file_node.parent_id (no Supabase Storage move needed — only the pointer changes)

**Folder operations:**
- Create: prompt for name, insert file_node with type='folder'
- Rename: inline edit or modal prompt, update file_node.name
- Delete: if folder has children, show warning count. Recursively delete all child nodes and their storage files.

**Storage:**
- Supabase Storage bucket: 'files' (private, authenticated access only)
- Storage path strategy: use file_node.id as the path: files/{node-id}/{filename}
- Generate signed URLs for downloads (60 second expiry)

Use optimistic UI updates for rename/delete operations.
```

---

### PROMPT 8 — Expenses Module

```
Build the Expenses module for the staatwright admin at /app/admin/expenses/page.tsx.

**Summary cards (top row, 3 cards):**
1. Total this month (ZAR)
2. Total this financial year (SA FY: 1 March – 28 Feb)
3. Largest expense category this month (name + amount)

**Filters bar:**
- Date range picker (month selector or custom range)
- Category filter (multi-select dropdown)
- Client/project filter (optional)
- Search (description text)

**Expenses table:**
Columns: Date | Description | Category | Amount (excl VAT) | VAT | Total (incl VAT) | Client | Slip | Actions

- Slip column: if slip uploaded, show a paperclip icon that opens the slip in a preview modal
- Actions: Edit | Delete

**Add / Edit Expense (slide-over panel, not a new page):**
Fields:
- Date (date picker, default today)
- Description (text input)
- Category (select): Software / Hosting / Travel / Subcontractors / Equipment / Office / Other
- Amount excl. VAT (number input, ZAR)
- VAT included toggle: if on, show "VAT amount" auto-calculated at 15%, show total incl. VAT
- Slip upload: drag-and-drop or click. Accepts PDF, JPG, PNG. Stores in Supabase Storage at /expenses/{id}/slip.{ext}. Show thumbnail preview after upload.
- Notes (textarea, optional)
- Link to client (optional select — pulls from clients table)

**Export:**
- "Export CSV" button: downloads filtered expense list as CSV
- Columns: Date, Description, Category, Client, Amount Excl VAT, VAT Amount, Total Incl VAT, Notes

Use shadcn Sheet for the slide-over panel. Use shadcn Table for the list. Format all currency as R X,XXX.XX (South African format).
```

---

### PROMPT 9 — Brand Assets Module

```
Build the Brand Assets module for the staatwright admin.

**/app/admin/brands/page.tsx** — Brand list:
- Grid of cards (3 cols desktop, 2 tablet, 1 mobile)
- Each card: primary logo thumbnail (grayscale, hover colour) + brand name + status badge + "Public" indicator if show_on_public_site = true
- "New Brand" button (opens /app/admin/brands/new/page.tsx)
- Click card → /app/admin/brands/[id]/page.tsx

**/app/admin/brands/[id]/page.tsx** — Brand detail with 6 tabs:

**Tab 1: Identity**
- Editable fields: Name, Tagline, Description (textarea), Status (select: Active / Archived / In Development), Live URL
- Save button

**Tab 2: Colours**
- Add swatch form: Name + Hex (colour picker input) + Role (Primary / Secondary / Accent / Background / Text)
- Saved swatches displayed as: colour circle (40px) + name + hex + role badge
- Click hex → copy to clipboard (toast notification)
- Delete button on each swatch

**Tab 3: Typography**
- Add font: Font Name + Weight (100–900 select) + Role (Display / Body / UI) + Source (Google Fonts / Custom / System)
- Display as rows: font name in its own font-family if it can be loaded via Google Fonts, + weight + role badge
- Delete per entry

**Tab 4: Logos**
- 6 upload slots: Primary | Icon | Dark Version | Light Version | Horizontal | Stacked
- Each slot: upload area (drag-drop or click) + preview of current logo + Download + Replace + Delete buttons
- Stored in Supabase Storage: /brands/{brand-id}/logos/{variant}.{ext}

**Tab 5: Files**
- Simplified file upload area (no folder tree — just flat list of files for this brand)
- Upload, preview, download, delete
- Stored in Supabase Storage: /brands/{brand-id}/files/{filename}

**Tab 6: Public Site**
- Toggle: "Show on public website" (boolean, updates brands.show_on_public_site)
- One-liner for public card (text input, updates brands.public_one_liner)
- Logo variant to show publicly (select from uploaded logo variants)
- Live URL for card link (syncs with identity tab live_url)
- Sort order (number input — controls order on public partners grid)
- Preview: shows a mock of what the public partner card will look like

Use shadcn Tabs, shadcn Switch for toggles, shadcn Toast for copy/save confirmations.
```

---

### PROMPT 10 — Settings Module

```
Build the Settings module for the staatwright admin at /app/admin/settings/page.tsx.

Use shadcn Tabs for four settings tabs:

**Tab 1: Company**
Form fields (all map to company_settings table):
- Company Name
- Registration Number
- VAT Number
- Address (textarea)
- Phone
- Email
- Logo upload (displays current logo, drag-drop to replace — stores in Supabase Storage at /settings/company-logo.{ext}, updates company_settings.logo_path)

Save button at bottom. Show success toast on save.

**Tab 2: Banking**
Form fields:
- Bank Name
- Account Holder Name
- Account Number
- Branch Code
- Account Type (select: Cheque / Savings / Current)

These appear on all invoices and quotes. Save button + success toast.

**Tab 3: Invoice Defaults**
Form fields:
- Default Payment Terms (textarea, e.g. "Payment due within 30 days of invoice date.")
- Default Notes/Footer Text (textarea)
- Default VAT Rate (number, default 15)
- Quote Validity Period (number input, default 30, label "days")
- Invoice Number Prefix (text, default "INV-")
- Quote Number Prefix (text, default "QUO-")
- Credit Note Prefix (text, default "CN-")

Note: Show a preview of what a document number will look like: e.g. "INV-0001"

**Tab 4: Public Site**
Form fields (syncs directly to what the public homepage renders):
- Hero Tagline Line 1 (text, default "Complexity, managed.")
- Hero Tagline Line 2 (text, default "Simplicity, experienced.")
- Hero Subheading (text)
- Service 1: Title + Body text
- Service 2: Title + Body text
- Service 3: Title + Body text
- Contact Email (shown on public contact section)

Below the form: "Preview Public Site" button — opens staatwright.co.za in a new tab.

**Tab 5: Team**
- Table of current auth users (email + created_at + last_sign_in_at)
- "Invite User" button: input email → calls Supabase admin.inviteUserByEmail()
- Remove user: calls Supabase admin deleteUser (with confirmation dialog)

Note: Supabase admin operations require a server action with the service_role key — create /app/api/admin/invite/route.ts and /app/api/admin/remove-user/route.ts as protected server routes (check session + validate it's an authenticated admin before executing).

On initial load, if company_settings table is empty (first-time setup), show a setup wizard modal that walks through Company → Banking → Invoice Defaults in three steps before dismissing.
```

---

### PROMPT 11 — Polish, PWA & Deployment

```
Final polish pass for the staatwright application before deployment.

**PWA:**
- Generate proper PWA icons at 192×192 and 512×512 using the StaatWright "SW" initials on navy background (#1F2A38), cream text (#F3F2EE), Poppins Bold
- Update manifest.json with correct icon paths
- Verify next-pwa is generating service worker correctly in production build
- Test offline: static pages should load from cache

**Public site polish:**
- Add scroll-triggered fade-up animations to: ServicesSection cards, PartnersSection cards, ContactSection. Use Intersection Observer API with a reusable useInView hook. Stagger delay: 0ms, 100ms, 200ms per card.
- Add <head> meta tags: title "StaatWright Solutions — Complexity, managed.", description, og:image (navy card with wordmark), og:url
- Ensure all public pages have proper Next.js metadata exports
- Test all anchor link scrolling (smooth scroll via CSS scroll-behavior: smooth)
- Mobile nav: ensure hamburger menu closes on link click

**Admin polish:**
- Add loading skeletons (shadcn Skeleton) to all data-fetching sections
- Add empty states to all tables/lists: illustration-free, just a centred message + action button
- Add error boundaries to admin pages
- Ensure all forms show validation errors inline (not just toast)
- All currency formatting: use Intl.NumberFormat('en-ZA', {style:'currency', currency:'ZAR'})
- All dates formatted as DD MMM YYYY (e.g. 15 Mar 2026) consistently

**Deployment (Vercel):**
- Create vercel.json if needed
- Document all required environment variables in .env.example:
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  RESEND_API_KEY=
  NEXT_PUBLIC_APP_URL=
- Ensure middleware.ts correctly handles Vercel edge runtime
- Set up Vercel project, add env vars, deploy
- Verify PWA installability via Chrome DevTools Lighthouse

**Final checklist:**
- All /admin/* routes are protected
- Contact form submits correctly
- Invoice PDF generates and downloads
- Invoice email sends via Resend
- File uploads work (images, PDFs)
- Brand logos upload and display on public partners section
- Settings save and reflect on public site immediately (revalidatePath)
- Mobile responsive: test all admin pages at 375px width
```

---

## Build Order Summary

| Prompt | What Gets Built | Dependencies |
|---|---|---|
| 1 | Scaffold, config, types, Supabase helpers | None |
| 2 | DB schema, RLS, seed data | Prompt 1 |
| 3 | Public website (full single-page) | Prompts 1–2 |
| 4 | Admin auth, shell layout, dashboard | Prompts 1–2 |
| 5 | Clients module | Prompt 4 |
| 6 | Invoices, Quotes, Credit Notes | Prompts 4–5 |
| 7 | File Manager | Prompt 4 |
| 8 | Expenses | Prompt 4 |
| 9 | Brand Assets | Prompt 4 |
| 10 | Settings | Prompts 4–6 |
| 11 | Polish, PWA, deployment | All |

**Estimated Claude Code sessions:** 11 focused sessions, one per prompt. Each session should be treated as complete before moving to the next. If a session produces errors, resolve them within that session before proceeding.

---

*StaatWright Solutions Ltd — Complexity, managed. Simplicity, experienced.*

# StaatWright — Cursor Build Prompt V2
**Remaining Fixes & Completions**

---

## HOW TO USE THIS PROMPT

This prompt addresses everything that was left incomplete after the first build pass. Work through each section in order. Every section is self-contained and deployable independently. Read each section in full before writing any code.

**The codebase uses:** Next.js 15 App Router · TypeScript · Supabase · Tailwind · Radix UI · Resend

**Design system rules (do not violate these):**
- `borderRadius: 0` on all elements — no rounded corners anywhere
- No box shadows — use `border: 1px solid #EAE4DC` instead
- All buttons: `backgroundColor: "#1F2A38"`, white text, `hover:opacity-80`
- Labels: `text-xs text-steel uppercase tracking-wider` with `font-montserrat`
- Cards: `bg-white border border-linen p-6` or `p-8`

---

## SECTION 1 — INLINE BRAND EDITOR IN THE PARTNER DETAIL PAGE

### The Problem

The `Brand & Identity` tab in `app/admin/partners/[id]/page.tsx` (line ~1069) is currently a **read-only display** — it shows colours and logos but has an "Edit Brand →" link that navigates away to `/admin/brands/[id]`. The full editing experience (add colours, upload logos, edit typography, set card appearance) needs to live **directly inside this tab**, with no need to navigate away.

The editing components (`ColoursTab`, `TypographyTab`, `LogoTab`, `IdentityTab`) already exist and work correctly inside `app/admin/brands/[id]/page.tsx`. You need to move them into a reusable location and use them in both places.

### Step 1: Extract Brand Editor Components

Create a new file: **`components/admin/BrandEditor.tsx`**

This file should export the following self-contained components, extracted verbatim from `app/admin/brands/[id]/page.tsx`:

- `BrandIdentityForm` — the fields panel (name, tagline, description, status, live_url, show_on_public_site, public_one_liner, public_sort_order)
- `BrandColoursEditor` — the colour swatch manager (add/delete, colour picker, role select)
- `BrandTypographyEditor` — the font entry manager
- `BrandLogosEditor` — the logo upload/delete manager (uses Supabase Storage `brand-assets` bucket)
- `BrandCardFields` — NEW panel for the fields that control the public site card appearance (see below)

Each component takes `brandId: string` as its primary prop (except `BrandIdentityForm` which takes `brand: Brand` and `onSaved: (b: Brand) => void`).

The components are already written in `app/admin/brands/[id]/page.tsx` — do not rewrite them from scratch. Move them to `components/admin/BrandEditor.tsx`, add the `export` keyword to each, and clean up imports.

### Step 2: Add `BrandCardFields` Component

This is new — it doesn't exist yet. Add it to `components/admin/BrandEditor.tsx`:

```tsx
// BrandCardFields — controls how the card looks on the public site
// Fields to manage on the brands table:
//   hero_image_path (text — path in Supabase storage, uploaded via file input)
//   card_bg_color   (text — hex colour, used when no hero image)
//   heading_font    (text — CSS font-family string, e.g. "'Playfair Display', serif")
//   body_font       (text — CSS font-family string)
//   public_slug     (text — URL slug for case study page, e.g. "concierge-styled")
//   public_show_case_study (boolean)
//   public_extended_description (text — longer description for case study page)

export function BrandCardFields({ brand, onSaved }: { brand: Brand; onSaved: (b: Brand) => void }) {
  // Hero image upload — same pattern as LogosEditor:
  //   supabase.storage.from("brand-assets").upload(`${brandId}/hero/${filename}`, file)
  //   then save the storage_path to brands.hero_image_path
  // Card bg color — color picker + hex text input (same as colour editor)
  // heading_font, body_font — plain text inputs with placeholder e.g. "'Playfair Display', serif"
  // public_slug — text input (validate: lowercase, hyphens only, no spaces)
  //   show a live preview of the URL: staatwright.co.za/work/[slug]
  // public_show_case_study — checkbox toggle
  // public_extended_description — textarea (5 rows)
  // Save button calls: supabase.from("brands").update({...}).eq("id", brand.id)
}
```

**Important:** The `brands` table needs these columns. If they don't exist yet, add them with a migration at the top of this file as a comment block (the developer can run it in Supabase):

```sql
-- Run in Supabase SQL Editor if these columns don't exist:
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS hero_image_path text,
  ADD COLUMN IF NOT EXISTS card_bg_color text,
  ADD COLUMN IF NOT EXISTS heading_font text,
  ADD COLUMN IF NOT EXISTS body_font text,
  ADD COLUMN IF NOT EXISTS public_slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS public_show_case_study boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_extended_description text;
```

### Step 3: Update `app/admin/brands/[id]/page.tsx`

Replace the inline component definitions with imports from `components/admin/BrandEditor.tsx`. The page structure, tabs, and data fetching stay the same — just swap the component definitions for imports. The page should look much shorter after this.

### Step 4: Replace the Brand Tab in Partner Detail

In `app/admin/partners/[id]/page.tsx`, replace the read-only brand display (lines ~1069–1190) with a fully functional editor using the extracted components.

The brand tab content when a brand IS linked should be:

```tsx
{activeTab === "brand" && (
  <div className="space-y-6">
    {!overviewForm.brand_id ? (
      // "Create Brand Identity" button — keep as is
    ) : (
      <>
        {/* Public Site Card Preview */}
        <div className="bg-white border border-linen p-6" style={{ borderRadius: 0 }}>
          <h3 className="text-navy font-bold text-xs uppercase tracking-wider mb-4"
              style={{ fontFamily: "var(--font-inter)" }}>
            Public Site Preview
          </h3>
          <div className="max-w-sm">
            {/* Render the shared BrandCard component with live data */}
            {/* Import BrandCardData and BrandCard from components/shared/BrandCard */}
            {/* Fetch linkedBrand with brand_colours and brand_logos joined */}
            <BrandCard brand={linkedBrandWithJoins} />
          </div>
          <p className="text-xs text-steel mt-3" style={{ fontFamily: "var(--font-montserrat)" }}>
            This is how the card appears on staatwright.co.za
          </p>
        </div>

        {/* Radix Tabs for the brand sub-sections */}
        <Tabs.Root defaultValue="identity">
          <Tabs.List className="flex border-b border-linen mb-4">
            <Tabs.Trigger value="identity" className={tabTriggerClass}>Identity</Tabs.Trigger>
            <Tabs.Trigger value="card" className={tabTriggerClass}>Card Appearance</Tabs.Trigger>
            <Tabs.Trigger value="colours" className={tabTriggerClass}>Colours</Tabs.Trigger>
            <Tabs.Trigger value="typography" className={tabTriggerClass}>Typography</Tabs.Trigger>
            <Tabs.Trigger value="logos" className={tabTriggerClass}>Logos</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="identity">
            <BrandIdentityForm brand={linkedBrand} onSaved={handleBrandSaved} />
          </Tabs.Content>
          <Tabs.Content value="card">
            <BrandCardFields brand={linkedBrand} onSaved={handleBrandSaved} />
          </Tabs.Content>
          <Tabs.Content value="colours">
            <BrandColoursEditor brandId={overviewForm.brand_id} />
          </Tabs.Content>
          <Tabs.Content value="typography">
            <BrandTypographyEditor brandId={overviewForm.brand_id} />
          </Tabs.Content>
          <Tabs.Content value="logos">
            <BrandLogosEditor brandId={overviewForm.brand_id} />
          </Tabs.Content>
        </Tabs.Root>
      </>
    )}
  </div>
)}
```

**Data fetching addition:** In the `loadData` function for the partner detail page, when `partner.brand_id` exists, fetch:

```ts
const { data: brandWithJoins } = await supabase
  .from("brands")
  .select("*, brand_colours(*), brand_logos(*)")
  .eq("id", partner.brand_id)
  .single();
```

Store this as `linkedBrandWithJoins` in state.

**Handler addition:**

```ts
function handleBrandSaved(updatedBrand: Brand) {
  setLinkedBrand(updatedBrand);
  // Re-fetch brand_colours and brand_logos for the preview
  loadBrandJoins();
}
```

### Step 5: Make the Brand Tab Available to Clients Too

Currently the `brand` tab only appears in `ventureTabs`. A client can also have a brand identity (you built their platform, you hold their brand assets). Add `{ value: "brand", label: "Brand & Identity" }` to `clientTabs` as well, after Overview. The same brand tab content renders for both types.

**Checkpoint 1:** The Brand & Identity tab in Partner detail shows a live card preview at the top, then sub-tabs for Identity / Card Appearance / Colours / Typography / Logos — all editable inline. No "Edit Brand →" link needed. The `/admin/brands/[id]` page also still works (it imports the same components). Both clients and ventures have the brand tab.

---

## SECTION 2 — ADD SPEC & BRIEF TAB TO CLIENTS

### The Problem

The `Spec & Brief` tab only appears for ventures (`isVenture`). Client builds absolutely deserve a spec — you built their platform, there's a problem statement, a target audience, a tech stack, scope items.

### Fix

In `app/admin/partners/[id]/page.tsx`, add `{ value: "spec", label: "Spec & Brief" }` to `clientTabs`, positioned after `Projects`:

```ts
const clientTabs = [
  { value: "overview",  label: "Overview" },
  { value: "brand",     label: "Brand & Identity" },  // added in Section 1
  { value: "projects",  label: "Projects" },
  { value: "spec",      label: "Spec & Brief" },       // add here
  { value: "invoices",  label: `Invoices (${invoices.length})` },
  { value: "quotes",    label: `Quotes (${quotes.length})` },
  { value: "files",     label: "Files" },
  { value: "notes",     label: "Notes" },
  { value: "statement", label: "Statement" },
];
```

The spec tab render block already exists (`{activeTab === "spec" && isVenture && (...)}`). Change the condition to `{activeTab === "spec" && (` so it renders for both types. The content is identical — there's no venture-specific content in the spec form.

**Checkpoint 2:** Clients have Brand & Identity and Spec & Brief tabs. The spec form saves correctly for both types.

---

## SECTION 3 — DELETE DEAD CLIENT PAGES

### The Problem

`app/admin/clients/[id]/page.tsx` (607 lines) and `app/admin/clients/new/page.tsx` are full, functional legacy pages that are still live. Navigating directly to `/admin/clients/abc-123` shows the old client detail page — not the new unified partner page. This creates a split-brain situation where the same partner can be edited from two different places.

### Fix

**Replace `app/admin/clients/[id]/page.tsx`** entirely with:

```tsx
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/admin/partners/${id}`);
}
```

**Replace `app/admin/clients/new/page.tsx`** entirely with:

```tsx
import { redirect } from "next/navigation";

export default function ClientNewRedirect() {
  redirect("/admin/partners/new?type=client");
}
```

Also update `app/admin/partners/new/page.tsx` to pre-select the type based on the `type` query param. In the `emptyForm` initialisation, check `searchParams` for a `type` value:

```tsx
interface Props {
  searchParams: Promise<{ type?: string }>;
}

export default function NewPartnerPage({ searchParams }: Props) {
  // Inside the component, use useSearchParams() to read ?type=client or ?type=venture
  // and set the initial type toggle accordingly
}
```

Since this is a `"use client"` page, use `useSearchParams()`:

```tsx
"use client";
import { useSearchParams } from "next/navigation";

// Inside component:
const searchParams = useSearchParams();
const defaultType = (searchParams.get("type") === "venture" ? "venture" : "client") as "client" | "venture";

const [form, setForm] = useState<FormState>({
  ...emptyForm,
  type: defaultType,
});
```

**Checkpoint 3:** `/admin/clients/abc-123` redirects to `/admin/partners/abc-123`. `/admin/clients/new` redirects to `/admin/partners/new?type=client` with Client pre-selected. The old 607-line page is gone.

---

## SECTION 4 — FIX STALE LINKS TO `/admin/ventures`

### The Problem

Two places still link to `/admin/ventures` which now redirects — it works but is sloppy and creates an unnecessary redirect hop.

### Fixes

**1. Dashboard active ventures panel** (`app/admin/dashboard/page.tsx`, line ~389):

```tsx
// BEFORE:
href="/admin/ventures"

// AFTER:
href="/admin/partners?type=venture"
```

**2. Any other hardcoded `/admin/ventures` or `/admin/clients` links** — search the entire codebase:

```bash
grep -rn "admin/ventures\|admin/clients" app/ components/
```

Replace every result with the equivalent `/admin/partners` URL. Specifically:
- `/admin/ventures` → `/admin/partners?type=venture`
- `/admin/ventures/[id]` → `/admin/partners/[id]`
- `/admin/clients` → `/admin/partners?type=client`
- `/admin/clients/[id]` → `/admin/partners/[id]`

**Checkpoint 4:** No stale links remain. `grep -rn "admin/ventures\|/admin/clients" app/ components/` returns zero results (except the redirect files themselves and the `app/admin/clients/page.tsx` redirect).

---

## SECTION 5 — FIX `SendInvoiceButton` DESIGN SYSTEM VIOLATION

### The Problem

`components/admin/SendInvoiceButton.tsx` uses `bg-blue-600 hover:bg-blue-700` which is completely outside the design system. Every other button in the admin uses `#1F2A38`.

### Fix

In `components/admin/SendInvoiceButton.tsx`, find and replace all blue button instances:

```tsx
// BEFORE (line ~70):
className="w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
style={{ borderRadius: 0, fontFamily: "var(--font-inter)" }}

// AFTER:
className="w-full px-4 py-2.5 text-white text-sm font-semibold transition-opacity hover:opacity-80"
style={{ backgroundColor: "#1F2A38", borderRadius: 0, fontFamily: "var(--font-inter)" }}
```

```tsx
// BEFORE (line ~133, inside modal):
className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
style={{ borderRadius: 0, fontFamily: "var(--font-inter)" }}

// AFTER:
className="flex-1 px-4 py-2.5 text-white text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
style={{ backgroundColor: "#1F2A38", borderRadius: 0, fontFamily: "var(--font-inter)" }}
```

Also check the Cancel button in the modal — it should be a ghost/outline style consistent with the rest of the app:

```tsx
// Cancel button inside modal:
className="flex-1 px-4 py-2.5 border border-linen text-sm text-steel hover:border-navy hover:text-navy transition-colors"
style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
```

**Checkpoint 5:** The Send Invoice button and its modal are visually indistinguishable from other primary actions in the admin. No blue anywhere.

---

## SECTION 6 — WRITE DOCUMENT EVENTS AT EVERY STATUS CHANGE

### The Problem

The dashboard activity feed queries `document_events` but shows "No recent activity" for most day-to-day actions because events are only written in two places:
1. `components/admin/DocumentBuilder.tsx` — when status is changed in the builder (correct)
2. `components/admin/PartialPayments.tsx` — when a payment is recorded (correct)

Events are **not** written when:
- Send Invoice button fires (the API route writes one — good, but check it's correct)
- An expense inbox item is approved
- Quote status is changed outside the builder

### Fix 1: Verify `app/api/invoices/send/route.ts` writes a proper event

Check the event insert in this file — it should look like:

```ts
await supabase.from("document_events").insert({
  document_id: doc.id,
  event_type: "sent",
  detail: { sent_to: partner.email, method: "email" },
  created_by: user?.id ?? null,
});
```

If it doesn't exist or the `event_type` is wrong, add/fix it. The `event_type` should be `"sent"` not `"status_changed"` so it renders clearly in the feed.

### Fix 2: Expense Inbox Approval

In `app/admin/expenses/inbox/page.tsx`, find the approval handler (where `status` is set to `"approved"` and an expense record is created). After the expense insert succeeds, add:

```ts
// Note: expense_inbox items aren't "documents" so they don't get document_events.
// Instead, just ensure the expense is created and the inbox item is marked approved.
// No document_event needed here — the activity feed only shows document events.
// This is correct behaviour.
```

The expense inbox approval does NOT need a document event — the activity feed is for document lifecycle events (invoices, quotes, credit notes), not expenses. Leave the inbox as-is.

### Fix 3: Quote Accept/Decline in `components/admin/DocumentBuilder.tsx`

The `DocumentBuilder` already writes events when status is saved (lines ~324, ~343). Verify that `accepted` and `declined` statuses on quotes trigger the event write. They should, since the event is written whenever `saveStatus !== initialDoc.status`. If they do, no change needed.

### Fix 4: Make the Activity Feed Render Meaningfully

The activity feed in `app/admin/dashboard/page.tsx` currently renders:

```tsx
{event.document?.number ? `${event.document.type} ${event.document.number} — ` : ""}
<span className="capitalize">{event.event_type.replace(/_/g, " ")}</span>
```

This is functional but dry. Improve it to be more human-readable:

```tsx
// Helper function to describe an event:
function describeEvent(event: DocumentEvent & { document?: { number: string; type: string; partner?: { company_name: string } } }): string {
  const docRef = event.document?.number
    ? `${event.document.type === "invoice" ? "Invoice" : event.document.type === "quote" ? "Quote" : "Credit Note"} ${event.document.number}`
    : "Document";
  
  const partner = event.document?.partner?.company_name
    ? ` · ${event.document.partner.company_name}`
    : "";

  const descriptions: Record<string, string> = {
    sent:             `${docRef} sent${partner}`,
    paid:             `${docRef} marked as paid${partner}`,
    payment_recorded: `Payment recorded on ${docRef}${partner}`,
    status_changed:   `${docRef} status updated${partner}`,
    created:          `${docRef} created${partner}`,
  };

  return descriptions[event.event_type] ?? `${docRef} — ${event.event_type.replace(/_/g, " ")}`;
}
```

Update the `recentEvents` query to also join the partner:

```ts
const { data: recentEvents } = await supabase
  .from("document_events")
  .select("*, document:documents(number, type, partner:partners(company_name))")
  .order("created_at", { ascending: false })
  .limit(20);
```

**Checkpoint 6:** The activity feed shows human-readable descriptions. The Send Invoice event writes to `document_events` with `event_type: "sent"`. Events populate when invoices are sent or paid.

---

## SECTION 7 — WRITE THE COMPLETE SCHEMA FILE

### The Problem

`supabase/schema.sql` (251 lines) still describes the original V1 schema with the old `clients` table. It cannot be used to bootstrap a fresh Supabase project. The live database has a completely different structure.

### Fix

**Replace the entire contents of `supabase/schema.sql`** with the following complete V3 schema. Do not keep anything from the old file — it's all wrong.

```sql
-- ============================================================
-- StaatWright Solutions Ltd — Complete Database Schema V3
-- Generated: March 2026
-- Run in full on a fresh Supabase project.
-- On an existing project, use the ALTER TABLE migrations below.
-- ============================================================

-- ── COMPANY SETTINGS (single row) ────────────────────────────────────────────
create table if not exists public.company_settings (
  id                          uuid primary key default gen_random_uuid(),
  name                        text,
  reg_number                  text,
  vat_number                  text,
  address                     text,
  phone                       text,
  email                       text,
  logo_path                   text,
  bank_name                   text,
  bank_account_holder         text,
  bank_account_number         text,
  bank_branch_code            text,
  bank_account_type           text,
  invoice_default_terms       text,
  invoice_default_notes       text,
  invoice_vat_rate            numeric default 15,
  invoice_prefix              text default 'INV-',
  quote_prefix                text default 'QUO-',
  cn_prefix                   text default 'CN-',
  quote_validity_days         integer default 30,
  hero_tagline_1              text default 'Complexity, managed.',
  hero_tagline_2              text default 'Simplicity, experienced.',
  hero_subheading             text,
  service_1_title             text default 'Digital Products',
  service_1_body              text,
  service_2_title             text default 'Systems & Integrations',
  service_2_body              text,
  service_3_title             text default 'Consultancy',
  service_3_body              text,
  contact_email               text,
  reminder_templates          jsonb default '{}',
  updated_at                  timestamptz default now()
);

alter table public.company_settings enable row level security;
create policy "Anon can read public settings" on public.company_settings
  for select using (true);
create policy "Authenticated can update settings" on public.company_settings
  for all using (auth.role() = 'authenticated');

insert into public.company_settings (name, contact_email)
values ('StaatWright Solutions Ltd', 'contact@staatwright.co.za')
on conflict do nothing;

-- ── BRANDS ───────────────────────────────────────────────────────────────────
create table if not exists public.brands (
  id                          uuid primary key default gen_random_uuid(),
  name                        text not null,
  tagline                     text,
  description                 text,
  status                      text default 'active'
                              check (status in ('active','archived','in_development')),
  live_url                    text,
  show_on_public_site         boolean default false,
  public_one_liner            text,
  public_logo_variant         text,
  public_sort_order           integer default 0,
  public_slug                 text unique,
  public_extended_description text,
  public_show_case_study      boolean default false,
  hero_image_path             text,
  card_bg_color               text,
  heading_font                text,
  body_font                   text,
  created_at                  timestamptz default now(),
  updated_at                  timestamptz default now()
);

alter table public.brands enable row level security;
create policy "Anon can read brands" on public.brands for select using (true);
create policy "Authenticated full access to brands" on public.brands
  for all using (auth.role() = 'authenticated');

-- ── BRAND COLOURS ─────────────────────────────────────────────────────────────
create table if not exists public.brand_colours (
  id        uuid primary key default gen_random_uuid(),
  brand_id  uuid references public.brands(id) on delete cascade,
  name      text,
  hex       text,
  role      text check (role in ('primary','secondary','accent','background','text'))
);

alter table public.brand_colours enable row level security;
create policy "Authenticated full access to brand_colours" on public.brand_colours
  for all using (auth.role() = 'authenticated');

-- ── BRAND TYPOGRAPHY ──────────────────────────────────────────────────────────
create table if not exists public.brand_typography (
  id        uuid primary key default gen_random_uuid(),
  brand_id  uuid references public.brands(id) on delete cascade,
  font_name text,
  weight    text,
  role      text check (role in ('display','body','ui')),
  source    text check (source in ('google','custom','system'))
);

alter table public.brand_typography enable row level security;
create policy "Authenticated full access to brand_typography" on public.brand_typography
  for all using (auth.role() = 'authenticated');

-- ── BRAND LOGOS ───────────────────────────────────────────────────────────────
create table if not exists public.brand_logos (
  id           uuid primary key default gen_random_uuid(),
  brand_id     uuid references public.brands(id) on delete cascade,
  variant      text check (variant in ('primary','icon','dark','light','horizontal','stacked')),
  storage_path text not null,
  uploaded_at  timestamptz default now()
);

alter table public.brand_logos enable row level security;
create policy "Authenticated full access to brand_logos" on public.brand_logos
  for all using (auth.role() = 'authenticated');

-- ── PARTNERS (unified: clients + ventures) ────────────────────────────────────
create table if not exists public.partners (
  id                  uuid primary key default gen_random_uuid(),
  company_name        text not null,
  type                text not null default 'client'
                      check (type in ('client','venture')),
  contact_name        text,
  email               text,
  phone               text,
  address             text,
  website             text,
  vat_number          text,
  relationship_type   text,
  status              text,
  founding_date       date,
  show_on_site        boolean default false,
  brand_id            uuid references public.brands(id) on delete set null,
  tags                text[] default '{}',
  notes_log           jsonb default '[]',
  venture_ownership   jsonb default '{}',
  external_billing    jsonb default '[]',
  spec                jsonb default '{}',
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table public.partners enable row level security;
create policy "Authenticated full access to partners" on public.partners
  for all using (auth.role() = 'authenticated');

-- ── DOCUMENTS (Invoices, Quotes, Credit Notes) ────────────────────────────────
create table if not exists public.documents (
  id                  uuid primary key default gen_random_uuid(),
  type                text not null check (type in ('invoice','quote','credit_note')),
  number              text not null unique,
  partner_id          uuid references public.partners(id) on delete set null,
  status              text not null default 'draft'
                      check (status in (
                        'draft','sent','paid','overdue','cancelled','partially_paid',
                        'accepted','declined','expired','issued'
                      )),
  issue_date          date,
  due_date            date,
  valid_until         date,
  line_items          jsonb not null default '[]',
  subtotal            numeric,
  vat_total           numeric,
  total               numeric,
  notes               text,
  terms               text,
  pdf_path            text,
  currency            text default 'ZAR',
  exchange_rate       numeric,
  zar_equivalent      numeric,
  vat_rate            numeric,
  payment_terms       text,
  linked_document_id  uuid references public.documents(id) on delete set null,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table public.documents enable row level security;
create policy "Authenticated full access to documents" on public.documents
  for all using (auth.role() = 'authenticated');

-- ── DOCUMENT EVENTS ───────────────────────────────────────────────────────────
create table if not exists public.document_events (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid references public.documents(id) on delete cascade,
  event_type  text,
  detail      jsonb,
  created_at  timestamptz default now(),
  created_by  uuid references auth.users(id)
);

alter table public.document_events enable row level security;
create policy "Authenticated full access to document_events" on public.document_events
  for all using (auth.role() = 'authenticated');

-- ── INVOICE PAYMENTS ──────────────────────────────────────────────────────────
create table if not exists public.invoice_payments (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid references public.documents(id) on delete cascade,
  amount       numeric not null,
  payment_date date not null,
  reference    text,
  notes        text,
  created_at   timestamptz default now()
);

alter table public.invoice_payments enable row level security;
create policy "Authenticated full access to invoice_payments" on public.invoice_payments
  for all using (auth.role() = 'authenticated');

-- ── EXPENSE CATEGORIES ────────────────────────────────────────────────────────
create table if not exists public.expense_categories (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null,
  parent_category         text,
  is_deductible           boolean default true,
  deductibility_notes     text,
  requires_documentation  boolean default false,
  sort_order              integer default 0,
  is_archived             boolean default false
);

alter table public.expense_categories enable row level security;
create policy "Authenticated full access to expense_categories" on public.expense_categories
  for all using (auth.role() = 'authenticated');

-- ── EXPENSES ──────────────────────────────────────────────────────────────────
create table if not exists public.expenses (
  id              uuid primary key default gen_random_uuid(),
  date            date not null,
  description     text not null,
  category        text,
  amount_excl_vat numeric,
  vat_amount      numeric,
  amount_incl_vat numeric,
  slip_path       text,
  notes           text,
  partner_id      uuid references public.partners(id) on delete set null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.expenses enable row level security;
create policy "Authenticated full access to expenses" on public.expenses
  for all using (auth.role() = 'authenticated');

-- ── EXPENSE INBOX (AI-parsed slips) ──────────────────────────────────────────
create table if not exists public.expense_inbox (
  id                    uuid primary key default gen_random_uuid(),
  status                text default 'pending'
                        check (status in ('pending','approved','rejected')),
  raw_image_path        text,
  ai_vendor_name        text,
  ai_date               date,
  ai_total_amount       numeric,
  ai_vat_amount         numeric,
  ai_currency           text,
  ai_suggested_category text,
  ai_confidence         numeric,
  ai_notes              text,
  vendor_name           text,
  expense_date          date,
  total_amount          numeric,
  vat_amount            numeric,
  currency              text default 'ZAR',
  category              text,
  notes                 text,
  expense_id            uuid references public.expenses(id) on delete set null,
  reviewed_at           timestamptz,
  created_at            timestamptz default now()
);

alter table public.expense_inbox enable row level security;
create policy "Authenticated full access to expense_inbox" on public.expense_inbox
  for all using (auth.role() = 'authenticated');

-- ── RETAINERS ─────────────────────────────────────────────────────────────────
create table if not exists public.retainers (
  id                   uuid primary key default gen_random_uuid(),
  partner_id           uuid references public.partners(id) on delete cascade,
  project_id           uuid,
  name                 text not null,
  monthly_amount       numeric not null,
  invoice_day          integer default 1,
  currency             text default 'ZAR',
  services_description text,
  start_date           date not null,
  end_date             date,
  status               text default 'active'
                       check (status in ('active','paused','cancelled')),
  last_invoice_date    date,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

alter table public.retainers enable row level security;
create policy "Authenticated full access to retainers" on public.retainers
  for all using (auth.role() = 'authenticated');

-- ── PROJECTS ──────────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  partner_id    uuid references public.partners(id) on delete cascade,
  name          text not null,
  status        text default 'active'
                check (status in ('active','complete','on_hold','archived')),
  start_date    date,
  end_date      date,
  budget_type   text check (budget_type in ('fixed','time_and_materials','retainer','none')),
  budget_amount numeric,
  description   text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.projects enable row level security;
create policy "Authenticated full access to projects" on public.projects
  for all using (auth.role() = 'authenticated');

-- ── TIME LOGS ─────────────────────────────────────────────────────────────────
create table if not exists public.time_logs (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid references public.projects(id) on delete set null,
  partner_id       uuid references public.partners(id) on delete set null,
  owner_id         uuid references auth.users(id),
  date             date not null,
  hours            numeric not null,
  description      text,
  billable         boolean default true,
  hourly_rate      numeric,
  calculated_value numeric,
  created_at       timestamptz default now()
);

alter table public.time_logs enable row level security;
create policy "Authenticated full access to time_logs" on public.time_logs
  for all using (auth.role() = 'authenticated');

-- ── EQUITY LEDGER ─────────────────────────────────────────────────────────────
create table if not exists public.equity_ledger (
  id               uuid primary key default gen_random_uuid(),
  entry_type       text not null check (entry_type in (
    'capital_injection','sweat_equity','distribution',
    'loan_in','loan_out','repayment'
  )),
  owner_id         uuid references auth.users(id),
  partner_id       uuid references public.partners(id) on delete set null,
  project_id       uuid references public.projects(id) on delete set null,
  date             date not null,
  description      text not null,
  category         text,
  hours            numeric,
  hourly_rate_used numeric,
  amount           numeric not null,
  currency         text default 'ZAR',
  notes            text,
  created_at       timestamptz default now()
);

alter table public.equity_ledger enable row level security;
create policy "Authenticated full access to equity_ledger" on public.equity_ledger
  for all using (auth.role() = 'authenticated');

-- ── DRAWINGS ──────────────────────────────────────────────────────────────────
create table if not exists public.drawings (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid references auth.users(id),
  date       date not null,
  amount     numeric not null,
  method     text,
  reference  text,
  notes      text,
  created_at timestamptz default now()
);

alter table public.drawings enable row level security;
create policy "Authenticated full access to drawings" on public.drawings
  for all using (auth.role() = 'authenticated');

-- ── OWNER SETTINGS ────────────────────────────────────────────────────────────
create table if not exists public.owner_settings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) unique,
  display_name text,
  initials     text,
  hourly_rate  numeric,
  updated_at   timestamptz default now()
);

alter table public.owner_settings enable row level security;
create policy "Authenticated full access to owner_settings" on public.owner_settings
  for all using (auth.role() = 'authenticated');

-- ── FILE NODES ────────────────────────────────────────────────────────────────
create table if not exists public.file_nodes (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  type         text not null check (type in ('folder','file')),
  parent_id    uuid references public.file_nodes(id) on delete cascade,
  storage_path text,
  mime_type    text,
  size_bytes   bigint,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  created_by   uuid references auth.users(id)
);

alter table public.file_nodes enable row level security;
create policy "Authenticated full access to file_nodes" on public.file_nodes
  for all using (auth.role() = 'authenticated');

-- ── CONTACT SUBMISSIONS ───────────────────────────────────────────────────────
create table if not exists public.contact_submissions (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  company    text,
  email      text,
  message    text,
  read       boolean default false,
  created_at timestamptz default now()
);

alter table public.contact_submissions enable row level security;
create policy "Anon can insert contact submissions" on public.contact_submissions
  for insert with check (true);
create policy "Authenticated can read contact submissions" on public.contact_submissions
  for select using (auth.role() = 'authenticated');

-- ============================================================
-- MIGRATIONS FOR EXISTING DATABASE
-- Run these if upgrading from V1/V2 (tables already exist)
-- ============================================================

-- Add missing columns to company_settings
alter table public.company_settings
  add column if not exists reminder_templates jsonb default '{}';

-- Add missing columns to brands
alter table public.brands
  add column if not exists public_slug text unique,
  add column if not exists public_extended_description text,
  add column if not exists public_show_case_study boolean default false,
  add column if not exists hero_image_path text,
  add column if not exists card_bg_color text,
  add column if not exists heading_font text,
  add column if not exists body_font text;

-- Add notes_log and spec to partners (if upgrading from old clients table)
alter table public.partners
  add column if not exists notes_log jsonb default '[]',
  add column if not exists spec jsonb default '{}',
  add column if not exists venture_ownership jsonb default '{}',
  add column if not exists external_billing jsonb default '[]';

-- Fix documents status constraint
alter table public.documents
  drop constraint if exists documents_status_check;
alter table public.documents
  add constraint documents_status_check
  check (status in (
    'draft','sent','paid','overdue','cancelled','partially_paid',
    'accepted','declined','expired','issued'
  ));

-- Add currency and other new columns to documents
alter table public.documents
  add column if not exists currency text default 'ZAR',
  add column if not exists exchange_rate numeric,
  add column if not exists zar_equivalent numeric,
  add column if not exists vat_rate numeric,
  add column if not exists payment_terms text,
  add column if not exists linked_document_id uuid references public.documents(id) on delete set null,
  add column if not exists partner_id uuid references public.partners(id) on delete set null;

-- Add partner_id to expenses
alter table public.expenses
  add column if not exists partner_id uuid references public.partners(id) on delete set null;

-- ── Seed: initial brands ──────────────────────────────────────────────────────
insert into public.brands (name, public_one_liner, live_url, show_on_public_site, public_sort_order, status)
values
  ('Concierge Styled',
   'AI-powered luxury travel stylist — curated outfits, activities, and packing lists for your destination.',
   'https://conciergestyled.netlify.app', true, 1, 'active'),
  ('In the Absence of a Soapbox',
   'Author platform for a debut memoir — part rant, part revelation, entirely a thirty-something single mum.',
   'https://intheabsence.co.za', true, 2, 'active'),
  ('AirShot Base',
   'CSV-driven field performance tracker with compliance grids for sales reps and store visit management.',
   null, true, 3, 'active'),
  ('KZN Youth Choir',
   'Mobile-first platform for event management, communications, and content for a youth choral society.',
   null, true, 4, 'in_development'),
  ('Refrag',
   'Multi-platform workflow OS for assessors and inspectors — case management, evidence capture, and AI-powered report generation.',
   null, true, 5, 'in_development')
on conflict do nothing;
```

**Checkpoint 7:** `supabase/schema.sql` accurately describes the full V3 database. Running it on a fresh Supabase project creates a fully functional database. The old `supabase-schema.LEGACY.sql` file can remain for historical reference.

---

## SECTION 8 — FINAL CODEBASE AUDIT

Run these searches and fix every result:

### 8.1 Find any remaining `clients` table queries

```bash
grep -rn 'from("clients")' app/ components/ lib/
```

Expected result: zero. If any remain, change to `from("partners")`.

### 8.2 Find any remaining `contact_person` references

```bash
grep -rn "contact_person" app/ components/ lib/
```

Expected result: zero. Replace with `contact_name`.

### 8.3 Find any remaining `Client` type references (not pages, not comments)

```bash
grep -rn ": Client\b\|<Client " app/ components/ lib/ | grep -v "ClientRedirect\|NewClient\|ClientDetail"
```

Expected result: zero. Replace with `: Partner`.

### 8.4 Confirm TypeScript compiles

```bash
npx tsc --noEmit
```

Fix every error. Common issues after these changes:
- `Partner` vs `Client` type mismatches
- Missing `type` field on partner queries (add it to the select)
- `BrandCardData` may need `brand_colours` and `brand_logos` to be non-optional arrays (use `?? []`)

### 8.5 Confirm lint passes

```bash
npm run lint
```

Fix all errors. Warnings about `react-hooks/exhaustive-deps` may be left as-is (they're pre-existing and intentional in several places).

---

## SECTION 9 — MINOR CLEANUPS (Do These Last)

These are small, each takes under 5 minutes.

### 9.1 Partners detail page header — add quick-action buttons

The partner detail header (the fixed top bar) currently shows the company name and a Statement link for clients. Improve it:

**For clients:**
```tsx
// Top bar right side — replace Statement link with:
<div className="flex items-center gap-2">
  <Link href={`/admin/invoices/new?partner_id=${id}`} ...>+ Invoice</Link>
  <Link href={`/admin/quotes/new?partner_id=${id}`} ...>+ Quote</Link>
  <Link href={`/admin/partners/${id}/statement`} ...>Statement</Link>
</div>
```

Wait — the statement page is at `/admin/clients/[id]/statement/page.tsx`. This also needs to redirect:

**Replace `app/admin/clients/[id]/statement/page.tsx`** with a redirect:

```tsx
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function StatementRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/admin/partners/${id}/statement`);
}
```

Then create **`app/admin/partners/[id]/statement/page.tsx`** by copying the full content from the old `app/admin/clients/[id]/statement/page.tsx` — it's already correct, just in the wrong location.

**For ventures:**
```tsx
// Top bar right side:
<div className="flex items-center gap-2">
  <Link href={`/admin/invoices/new?partner_id=${id}`} ...>+ Invoice</Link>
  <button onClick={() => setActiveTab("equity")} ...>+ Equity Entry</button>
</div>
```

Note: The `setActiveTab` call from within the top bar requires the top bar to be inside the same component. Since the whole page is already `"use client"`, this works — just call `setActiveTab("equity")` from the button's `onClick`.

### 9.2 Remove the standalone Brands nav item awareness

The sidebar has no `Brand Assets` entry now — confirm it was removed. If the standalone `/admin/brands` page still gets direct traffic, add a note to the top of that page:

```tsx
// At the top of app/admin/brands/page.tsx, add an info banner:
<div className="bg-amber-50 border-b border-amber-200 px-8 py-3">
  <p className="text-xs text-amber-700" style={{ fontFamily: "var(--font-montserrat)" }}>
    Brand identities are now managed from each Partner's Brand & Identity tab.
    This page shows a global overview of all brands.
  </p>
</div>
```

This keeps the page functional as a cross-partner brand overview while making it clear where the editing lives.

### 9.3 Ensure `app/admin/partners/new/page.tsx` pre-selects type

Verify Section 3's fix is in place: navigating to `/admin/partners/new?type=venture` pre-selects the Venture toggle. Test both `?type=client` and `?type=venture`.

---

## FINAL CHECKLIST

Work through this before marking the PR complete:

**Section 1 — Brand Editor**
- [ ] `components/admin/BrandEditor.tsx` exists with all 5 exported components
- [ ] `BrandCardFields` component handles hero image upload, card_bg_color, heading/body fonts, public_slug, case study toggle
- [ ] Brand & Identity tab in Partner detail has a live card preview at the top
- [ ] Brand & Identity tab has sub-tabs: Identity / Card Appearance / Colours / Typography / Logos
- [ ] All sub-tabs work without navigating away
- [ ] `app/admin/brands/[id]/page.tsx` imports from `BrandEditor.tsx` (no duplicate code)
- [ ] Brand tab is available for both clients and ventures

**Section 2 — Spec tab for clients**
- [ ] `clientTabs` includes `spec` tab
- [ ] Spec form saves for clients

**Section 3 — Dead pages removed**
- [ ] `app/admin/clients/[id]/page.tsx` is a redirect (not 607 lines)
- [ ] `app/admin/clients/new/page.tsx` is a redirect
- [ ] `/admin/partners/new?type=client` pre-selects Client

**Section 4 — Stale links**
- [ ] Dashboard "View all ventures" → `/admin/partners?type=venture`
- [ ] Zero results from `grep -rn "admin/ventures\|/admin/clients" app/ components/` (except redirect files)

**Section 5 — Design system**
- [ ] `SendInvoiceButton` uses `#1F2A38` not `bg-blue-600`

**Section 6 — Activity feed**
- [ ] Send Invoice API writes `event_type: "sent"` document event
- [ ] Activity feed joins `partner` in the query
- [ ] Activity feed renders human-readable descriptions

**Section 7 — Schema**
- [ ] `supabase/schema.sql` is the full V3 schema (not the old V1)
- [ ] Running the schema on a fresh project creates all required tables
- [ ] Migration ALTER TABLE statements are included for existing projects

**Section 8 — Audit**
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run lint` passes with zero errors
- [ ] No `clients` table queries anywhere
- [ ] No `contact_person` references anywhere

**Section 9 — Cleanups**
- [ ] Partner detail top bar has quick-action + Invoice / + Quote buttons
- [ ] Statement page moved to `/admin/partners/[id]/statement/`
- [ ] `/admin/clients/[id]/statement` redirects to the new path
- [ ] `/admin/brands` page has the info banner

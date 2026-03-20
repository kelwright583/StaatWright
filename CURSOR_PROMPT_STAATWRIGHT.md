# StaatWright — Comprehensive Cursor Build Prompt
**Version 3.0 | Full Rebuild & Extension**

---

## HOW TO USE THIS PROMPT

This is a large prompt. Work through it **section by section**, completing each before moving to the next. Do not attempt all sections in one pass. Each section ends with a checkpoint — verify it works before continuing.

The project is a Next.js 15 + Supabase + Tailwind application. All code lives in the App Router. The database is Supabase Postgres. Styling uses Tailwind utility classes with CSS variables defined in `globals.css`.

---

## SECTION 0 — CONTEXT & PHILOSOPHY

### What StaatWright Is

StaatWright Solutions Ltd is a two-person digital consultancy based in South Africa. It does three things:

1. **Builds digital products** for external clients (web apps, platforms, PWAs)
2. **Co-owns ventures** — products it has built and retains equity in
3. **Consults** — advisory and architecture work

The admin suite is the **operational nervous system** for all of this. It is not just invoicing software. It is the complete source of truth for everything StaatWright does: every rand earned, spent, or invested in sweat equity; every client relationship; every brand identity; every build specification; every legal document. It should function as the company's institutional memory.

### The Public Website Philosophy

The public website is **deliberately, aggressively plain**. White. Neutral. Minimal. This is intentional — the website itself makes no visual claims. The brands and ventures do the talking. When a visitor lands on the site, the only colour, personality, and energy comes from the Partners & Builds section, where each card is fully immersed in that brand's identity. The StaatWright shell is the neutral gallery; the work fills it.

This means:
- The admin suite is where brands come to life: logos, colours, typography, hero images, copy — all managed there
- Changes in admin flow through to the public site automatically
- Every venture and client can have a radically different visual identity, and the site celebrates that

### Mental Model for Partners

Everything that StaatWright has a relationship with is a **Partner**. A Partner has a `type`:

- `client` — a company that pays StaatWright for services (project-based or retainer)
- `venture` — a product StaatWright co-owns, has built equity in, or operates independently

These are the same entity (same database table: `partners`) with different operational views. A venture can also be a client (if StaatWright bills itself or co-owners for work). The distinction is in the type field and what tabs/features are surfaced.

---

## SECTION 1 — CRITICAL BUG FIXES (Do These First)

These are production-breaking. Fix before anything else.

### 1.1 Rename `proxy.ts` → `middleware.ts`

The file `proxy.ts` in the project root contains Next.js middleware logic but is named incorrectly. Next.js only recognises `middleware.ts` at the project root.

**Action:**
1. Rename `proxy.ts` to `middleware.ts`
2. Rename the exported function from `proxy` to `middleware`:

```ts
// middleware.ts
export async function middleware(request: NextRequest) {
  // ... existing body unchanged ...
}

export const config = {
  matcher: ["/admin/:path*", "/bookkeeper/:path*"],
};
```

### 1.2 Fix Print Pages — Wrong Table Join

All three print pages query the old `clients` table which no longer exists. The join silently returns null, producing invoices/quotes/credit notes with no recipient information.

**Files to fix:**
- `app/admin/invoices/[id]/print/page.tsx`
- `app/admin/quotes/[id]/print/page.tsx`
- `app/admin/credit-notes/[id]/print/page.tsx`

**Change in each file:**

```ts
// BEFORE (broken):
.select("*, client:clients(*)")
// ...
const doc = docData as Document & { client: Client | null };

// AFTER (fixed):
.select("*, partner:partners(*)")
// ...
const doc = docData as Document & { partner: Partner | null };
```

Then in the render JSX of each print page, replace all `doc.client` references with `doc.partner`, and note that the partners table uses `contact_name` not `contact_person`. Update accordingly:

```tsx
// BEFORE:
{doc.client.contact_person && <div>{doc.client.contact_person}</div>}

// AFTER:
{doc.partner?.contact_name && <div>{doc.partner.contact_name}</div>}
```

Also update the import at the top: replace `import type { Document, Client, CompanySettings }` with `import type { Document, Partner, CompanySettings }`.

### 1.3 Fix `DocumentBuilder` — Remove Dual Write to Dead `client_id` Column

In `components/admin/DocumentBuilder.tsx`, the save function writes to both `partner_id` and `client_id`. The `client_id` column on the `documents` table has a foreign key reference to the `clients` table, which no longer exists. This causes a constraint error when creating/updating documents.

**Find these two lines in the save handler and remove the `client_id` line:**

```ts
// BEFORE:
partner_id: clientId || null,
client_id: clientId || null,   // DELETE THIS LINE

// AFTER:
partner_id: clientId || null,
```

Also find anywhere `initialDoc?.client_id` is used to initialise the partner ID and ensure `initialDoc?.partner_id` is the primary source (keep client_id as fallback only for old data migration):

```ts
// This is fine to keep as a one-time migration fallback:
initialDoc?.partner_id ?? initialDoc?.client_id ?? initialPartnerId ?? initialClientId ?? ""
```

### 1.4 Add Missing Schema Columns

Run the following SQL in the Supabase SQL Editor. This adds columns that the app already reads/writes but that are missing from the schema:

```sql
-- Add reminder_templates to company_settings
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS reminder_templates jsonb DEFAULT '{}';

-- Add partially_paid to the documents status check
-- First drop the existing constraint, then recreate it
ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_status_check;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_status_check
  CHECK (status IN ('draft','sent','paid','overdue','cancelled','partially_paid'));

-- Add currency and exchange_rate to documents if not present
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'ZAR',
  ADD COLUMN IF NOT EXISTS exchange_rate numeric,
  ADD COLUMN IF NOT EXISTS zar_equivalent numeric,
  ADD COLUMN IF NOT EXISTS vat_rate numeric,
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS linked_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL;

-- Update the documents table to use partner_id instead of client_id
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL;

-- Update expenses table similarly
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL;

-- Migrate existing data if client_id has values (run once)
UPDATE public.documents SET partner_id = client_id WHERE partner_id IS NULL AND client_id IS NOT NULL;
UPDATE public.expenses SET partner_id = client_id WHERE partner_id IS NULL AND client_id IS NOT NULL;
```

> **Note:** The `partners` table, `equity_ledger`, `drawings`, `owner_settings`, `invoice_payments`, `projects`, `expense_inbox`, `expense_categories`, and `time_logs` tables are assumed to already exist in the live Supabase instance. If you need to recreate from scratch, see Section 9 — Full Schema Reference.

### 1.5 Fix the Notes Field — Make It Append-Only JSON

The `notes` column on `partners` is currently plain `text`, but `lib/types.ts` defines it as `PartnerNote[]` (an array of `{ text, created_at, initials }` objects). The two are inconsistent.

**Database change:**
```sql
-- Convert notes from text to jsonb (handles existing data gracefully)
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS notes_log jsonb DEFAULT '[]';

-- Migrate any existing plain text notes into the new structure
UPDATE public.partners
SET notes_log = jsonb_build_array(
  jsonb_build_object(
    'text', notes,
    'created_at', created_at::text,
    'initials', 'SW'
  )
)
WHERE notes IS NOT NULL AND notes != '' AND notes_log = '[]';
```

**Code change in `app/admin/clients/[id]/page.tsx` and `app/admin/ventures/[id]/page.tsx`:**

Replace the plain textarea Notes tab with an append-only log:

```tsx
// Notes tab — append-only log
{activeTab === "notes" && (
  <div className="bg-white border border-linen p-8" style={{ borderRadius: 0 }}>
    <h3 className="text-navy font-bold text-xs uppercase tracking-wider mb-6"
        style={{ fontFamily: "var(--font-inter)" }}>
      Activity Notes
    </h3>

    {/* Existing notes log */}
    <div className="space-y-3 mb-8">
      {(partner.notes_log ?? []).length === 0 ? (
        <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
          No notes yet.
        </p>
      ) : (
        [...(partner.notes_log ?? [])].reverse().map((note: PartnerNote, i: number) => (
          <div key={i} className="border-l-2 border-linen pl-4 py-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-navy"
                    style={{ fontFamily: "var(--font-inter)" }}>
                {note.initials}
              </span>
              <span className="text-xs text-steel" style={{ fontFamily: "var(--font-montserrat)" }}>
                {new Date(note.created_at).toLocaleDateString("en-ZA", {
                  day: "2-digit", month: "short", year: "numeric",
                  hour: "2-digit", minute: "2-digit"
                })}
              </span>
            </div>
            <p className="text-sm text-ink" style={{ fontFamily: "var(--font-montserrat)" }}>
              {note.text}
            </p>
          </div>
        ))
      )}
    </div>

    {/* Add note form */}
    <form onSubmit={handleAddNote} className="border-t border-linen pt-6">
      <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>
        Add Note
      </label>
      <textarea
        rows={3}
        value={newNoteText}
        onChange={(e) => setNewNoteText(e.target.value)}
        placeholder="Add an internal note…"
        className="border border-linen focus:border-navy outline-none bg-transparent p-3 w-full text-ink text-sm resize-y mt-1"
        style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
      />
      <button
        type="submit"
        disabled={savingNote || !newNoteText.trim()}
        className="mt-3 px-5 py-2 text-white text-sm font-semibold transition-opacity disabled:opacity-40"
        style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
      >
        {savingNote ? "Saving…" : "Add Note"}
      </button>
    </form>
  </div>
)}
```

Add the state and handler:
```ts
const [newNoteText, setNewNoteText] = useState("");
const [savingNote, setSavingNote] = useState(false);

async function handleAddNote(e: React.FormEvent) {
  e.preventDefault();
  if (!newNoteText.trim()) return;
  setSavingNote(true);

  // Get current user initials from owner_settings
  const { data: ownerData } = await supabase
    .from("owner_settings")
    .select("initials")
    .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
    .single();

  const initials = ownerData?.initials ?? "SW";

  const newNote: PartnerNote = {
    text: newNoteText.trim(),
    created_at: new Date().toISOString(),
    initials,
  };

  const currentNotes = partner?.notes_log ?? [];
  const updatedNotes = [...currentNotes, newNote];

  await supabase
    .from("partners")
    .update({ notes_log: updatedNotes })
    .eq("id", id);

  setNewNoteText("");
  setSavingNote(false);
  await loadData();
}
```

**Checkpoint 1:** All print pages render recipient info. Creating a new invoice doesn't throw a DB error. The middleware file exists at the project root. Notes are appendable.

---

## SECTION 2 — INFORMATION ARCHITECTURE RESTRUCTURE

### 2.1 Unify Clients & Ventures Under "Partners"

The current setup has two separate top-level nav items: "Clients" and "Ventures". These split a single `partners` table into two pages that are nearly identical in code but have drifted apart in features. The fix is:

**Sidebar change in `components/admin/AdminSidebar.tsx`:**

Replace the current nav array with:

```ts
const mainNav: NavItem[] = [
  { label: "Dashboard",    href: "/admin/dashboard",    icon: <GridIcon /> },
  { label: "Partners",     href: "/admin/partners",     icon: <UsersIcon /> },
  { label: "Invoices",     href: "/admin/invoices",     icon: <DocumentIcon /> },
  { label: "Quotes",       href: "/admin/quotes",       icon: <ClipboardIcon /> },
  { label: "Credit Notes", href: "/admin/credit-notes", icon: <MinusCircleIcon /> },
  { label: "Retainers",    href: "/admin/retainers",    icon: <RepeatIcon /> },
  { label: "Expenses",     href: "/admin/expenses",     icon: <ReceiptIcon /> },
  { label: "Files",        href: "/admin/files",        icon: <FolderIcon /> },
  { label: "Reports",      href: "/admin/reports",      icon: <BarChartIcon /> },
];

const bottomNav: NavItem[] = [
  { label: "Settings", href: "/admin/settings", icon: <CogIcon /> },
];
```

**Remove** `Brand Assets` from the nav entirely. Brands now live inside each Partner's detail page.

**Create new route** `app/admin/partners/` that supersedes both `/admin/clients/` and `/admin/ventures/`. The old routes should redirect:

```ts
// app/admin/clients/page.tsx — replace entire content with:
import { redirect } from "next/navigation";
export default function ClientsRedirect() {
  redirect("/admin/partners?type=client");
}

// app/admin/ventures/page.tsx — replace entire content with:
import { redirect } from "next/navigation";
export default function VenturesRedirect() {
  redirect("/admin/partners?type=venture");
}
```

### 2.2 Build the New Partners List Page

**File: `app/admin/partners/page.tsx`**

This is a server component. It shows all partners with a type filter.

```tsx
import { createClient } from "@/lib/supabase/server";
import AdminTopBar from "@/components/admin/AdminTopBar";
import Link from "next/link";

// Type filter tabs: All | Clients | Ventures
// Card grid — each card shows:
//   - Partner name (bold)
//   - Type badge (Client / Venture) with colour dot
//   - Relationship type or venture status
//   - Outstanding invoice total (if any)
//   - Brand colour accent on left border if brand is linked
//   - "Open →" link

// Filter via searchParams: ?type=all|client|venture
// Default: all

// Query:
const { data: partners } = await supabase
  .from("partners")
  .select(`
    id, company_name, type, relationship_type, status, brand_id,
    brands:brands(id, name, public_logo_variant)
  `)
  .order("company_name");

// For outstanding totals, join documents:
// Use a separate query: documents grouped by partner_id where status in ('sent','overdue')
```

The page must include:
- A filter bar at the top: **All** | **Clients** | **Ventures** (uses URL search params, not client state — the page re-renders server-side)
- A **+ New Partner** button that opens `/admin/partners/new`
- Each card renders the partner's `type` as a coloured badge: clients get a blue square, ventures get an orange/amber square
- If the partner has a linked `brand_id`, pull the brand's primary colour from `brand_colours` and use it as a left-border accent on the card

### 2.3 Build the New Partner Detail Page

**File: `app/admin/partners/[id]/page.tsx`**

This is the most important page in the system. It is the **single source of truth** for everything related to a partner. It must be a `"use client"` component (tabs, forms, live data).

**Tab structure depends on partner type:**

For **clients** (`type = "client"`):
- Overview (contact details, relationship type, linked brand)
- Projects
- Invoices
- Quotes
- Files
- Notes (append-only log)
- Statement

For **ventures** (`type = "venture"`):
- Overview (contact details, status, founding date, website, ownership)
- Brand & Identity ← **NEW — this is where brands live now**
- Spec & Brief ← **NEW**
- Projects
- Invoices
- Equity Ledger
- Files
- Notes (append-only log)

The **Header strip** for both types should show:
- Partner name (large, bold)
- Type badge
- Key stats: Total invoiced | Paid | Outstanding
- For ventures: ownership split (e.g., "JP 60% · AW 40%")
- Quick action buttons: + Invoice | + Quote (for clients); + Equity Entry (for ventures)

### 2.4 Build the "Brand & Identity" Tab

This tab replaces the old standalone `/admin/brands/[id]` page. It lives inside each venture's (and client's) detail page.

**What this tab manages:**

```
Brand Identity
├── Brand name, tagline, description
├── Status: Active | In Development | Archived
├── Live URL
├── Public site visibility toggle
├── Public one-liner (shown on the public website card)
├── Public sort order
│
Brand Colours
├── List of colour swatches: name, hex, role (primary/secondary/accent/background/text)
├── + Add Colour button
├── Each colour has a visual swatch rendered inline
│
Typography
├── Font name, weight, role (display/body/ui), source (google/custom/system)
├── + Add Font button
│
Logos & Assets
├── Upload areas for each logo variant: primary, icon, dark, light, horizontal, stacked
├── Each uploaded logo shows a preview
├── Delete button per logo
│
Hero Image
├── Upload a hero image for this brand (used on the public site card background)
├── Preview at ~300px wide
│
Public Site Preview
├── A live preview of how this brand's card will appear on the public website
├── Renders the same BrandCard component used on the public site
├── Real-time: updates as you change the fields above
```

**Database:** When a partner has no `brand_id`, show a "Create Brand Identity" button that creates a new `brands` record and links it via `partners.brand_id`. The brand record creation and the partner update happen in a single transaction.

**The `BrandCard` preview** in this tab must render the actual card from `components/public/PartnersSection.tsx` (or extract `BrandCard` into a shared component at `components/shared/BrandCard.tsx` used by both the public site and the admin preview).

### 2.5 Build the "Spec & Brief" Tab

This is the **source of truth for what was built**. Each venture and client can have a rich project brief, technical spec, and living documentation that:

- Serves as the internal brief for the build
- Drives the public website description (the `public_one_liner` and extended description)
- Becomes the audit trail for what was scoped and built

**Fields:**

```
Project Brief
├── One-liner (syncs to brand.public_one_liner)
├── Full description (rich text / markdown)
├── Problem being solved
├── Target audience
├── Key features / deliverables (list — add/remove items)
├── Tech stack used (tags: Next.js, Supabase, etc.)
├── Launch date (or expected launch date)
├── Live URL
│
Scope of Work
├── Status: In Spec | In Build | Live | Paused | Complete
├── Scope items (checkbox list — check off as completed)
│
Links & Resources
├── GitHub repo URL
├── Figma/design URL
├── Staging URL
├── Production URL
├── Other links (add/remove)
│
Internal Notes
├── Architecture decisions
├── Known technical debt
├── Future roadmap items
```

**Storage:** Most of this lives in a new `partner_briefs` JSONB column on the `partners` table (or a separate `partner_specs` table). Use a single JSONB column `spec` on partners for now:

```sql
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS spec jsonb DEFAULT '{}';
```

The spec object shape:
```json
{
  "one_liner": "string",
  "description": "string",
  "problem": "string",
  "target_audience": "string",
  "key_features": ["string"],
  "tech_stack": ["string"],
  "launch_date": "YYYY-MM-DD",
  "live_url": "string",
  "scope_status": "in_spec|in_build|live|paused|complete",
  "scope_items": [{"text": "string", "done": false}],
  "github_url": "string",
  "figma_url": "string",
  "staging_url": "string",
  "production_url": "string",
  "other_links": [{"label": "string", "url": "string"}],
  "architecture_notes": "string",
  "technical_debt": "string",
  "roadmap": "string"
}
```

The one-liner field in this tab should have a character counter and a "Sync to public site" button that writes it to `brands.public_one_liner` if a brand is linked.

**Checkpoint 2:** The `/admin/partners` page loads. Old `/admin/clients` and `/admin/ventures` redirect properly. The new Partner detail page shows the correct tabs per type. The Brand & Identity tab renders a working brand editor with a live card preview.

---

## SECTION 3 — PUBLIC WEBSITE: BRAND-DRIVEN ARCHITECTURE

The public website must be updated so that all brand data comes from the admin, including the visual identity of each card.

### 3.1 Make `BrandCard` a Shared Component

Currently `BrandCard` is defined inline inside `components/public/PartnersSection.tsx` with a hardcoded `BRAND_META` lookup by name. This is fragile — add a new brand and it gets no styling.

**Create `components/shared/BrandCard.tsx`:**

The card must source all its visual identity from the `brands` + `brand_colours` + `brand_logos` database records, not from a hardcoded map. The admin's Brand & Identity tab is what controls appearance.

The card needs these fields from the database:
- `brand.name`
- `brand.public_one_liner`
- `brand.live_url`
- `brand.status`
- `brand.hero_image_path` (new field — add to brands table)
- `brand_colours` — the primary colour is used as the accent
- `brand_logos` — the `icon` variant is used as the card logo

```sql
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS hero_image_path text,
  ADD COLUMN IF NOT EXISTS card_bg_color text,
  ADD COLUMN IF NOT EXISTS heading_font text,
  ADD COLUMN IF NOT EXISTS body_font text;
```

The `BrandCard` component accepts a `brand` prop with joined colours and logos, and renders dynamically. The accent colour comes from the first `brand_colour` with `role = 'primary'`. The background is `hero_image_path` if set, or `card_bg_color` if set, or the primary colour darkened, or the StaatWright navy as fallback.

### 3.2 Update the Public Homepage Query

**`app/page.tsx`** — extend the brands query to join colours and logos:

```ts
const { data: brands } = await supabase
  .from("brands")
  .select(`
    id, name, tagline, description, live_url, show_on_public_site,
    public_one_liner, public_sort_order, status, hero_image_path,
    card_bg_color, heading_font, body_font,
    brand_colours(id, hex, role, name),
    brand_logos(id, variant, storage_path)
  `)
  .eq("show_on_public_site", true)
  .order("public_sort_order", { ascending: true });
```

### 3.3 Add Individual Brand/Project Pages

Each venture and client shown on the public site should have its own page — a full brand showcase that acts as a case study. This is optional but should be architected now.

**Route: `/work/[slug]`** (or `/[slug]` at root level — decide based on preference)

Each brand record needs a `slug` field:
```sql
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS public_slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS public_extended_description text,
  ADD COLUMN IF NOT EXISTS public_show_case_study boolean DEFAULT false;
```

The public brand page shows:
- Full hero (the brand's hero image, full width)
- Brand name, tagline, extended description
- Key features list
- Tech stack tags
- Link to live site
- Back to StaatWright link

For now, these pages do not need to be built — but the schema and slug field should be added so the admin can start populating them, and the `BrandCard` on the homepage should link to `/work/[slug]` if `public_show_case_study = true`.

**Checkpoint 3:** The public homepage renders all brands with dynamic styling from the database. Adding a primary colour to a brand in the admin changes the card accent on the homepage within 60 seconds (ISR revalidation).

---

## SECTION 4 — ADMIN DASHBOARD COMPLETION

The dashboard currently shows 5 stat cards and a read-only invoice table. The spec calls for much more.

### 4.1 Complete the Dashboard

**File: `app/admin/dashboard/page.tsx`**

The dashboard is a server component. Add the following zones:

**Zone A — Financial Pulse (already exists, improve it):**
- Outstanding (Sent): sum of all sent-not-paid invoices — add count badge
- Overdue: sum + count — render in red if > 0
- This Month Revenue: sum of invoices paid this calendar month
- This Month Expenses: sum of expenses this calendar month
- Net This Month: revenue minus expenses — green if positive, red if negative

**Zone B — Middle row (3 panels, new):**

*Panel 1: Outstanding Invoices (existing — add inline actions)*
Change the read-only table to include action buttons per row:
```tsx
<td>
  <div className="flex items-center gap-2">
    <form action={markPaidAction}>
      <input type="hidden" name="id" value={invoice.id} />
      <button className="text-xs px-2 py-1 border border-linen hover:border-navy text-steel hover:text-navy">
        Mark Paid
      </button>
    </form>
    <Link href={`/admin/invoices/${invoice.id}`} className="text-xs text-steel hover:text-navy underline">
      View →
    </Link>
  </div>
</td>
```

*Panel 2: Slip Inbox Preview (new)*
```tsx
// Fetch pending inbox items (already fetched — just not rendered)
<div className="bg-white border border-linen p-6">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-xs uppercase tracking-wider text-steel font-medium">Expense Inbox</h3>
    {pendingInboxCount > 0 && (
      <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 font-medium">
        {pendingInboxCount} pending
      </span>
    )}
  </div>
  {/* Last 3 inbox items */}
  {/* "Review All →" link */}
</div>
```

*Panel 3: Active Ventures Snapshot (new)*
```tsx
// Query: partners where type='venture' and status='active'
// Show name, ownership split, linked brand colour dot
// Max 4, "View all →" link to /admin/partners?type=venture
```

**Zone C — Activity Feed (existing but broken — fix it)**

The activity feed queries `document_events` but shows "No recent activity" because events aren't being created. Ensure events are written whenever:
- An invoice status changes (already partially done in some places — audit and complete)
- A quote is accepted or declined
- An expense is approved from inbox
- A payment is recorded

For each event, write to `document_events`:
```ts
await supabase.from("document_events").insert({
  document_id: docId,
  event_type: "status_changed", // or "paid", "sent", etc.
  detail: { from: oldStatus, to: newStatus },
  created_by: user.id,
});
```

The dashboard should then query `document_events` joined with `documents` and `partners` for the last 20 events and render them as a timeline.

**Checkpoint 4:** Dashboard shows all 5 zones. Inline "Mark Paid" works. Inbox preview shows pending count. Activity feed populates when invoices change status.

---

## SECTION 5 — SETTINGS RESTRUCTURE

**File: `app/admin/settings/SettingsForm.tsx`** (1,134 lines — needs splitting)

### 5.1 Split Settings into Tabbed Sub-sections

The settings form is a single monolith. Convert it to use the Radix Tabs component already in the project, with these distinct sections:

**Tabs:**
1. **Company** — name, reg number, VAT number, address, phone, email, logo
2. **Banking** — bank name, account holder, account number, branch code, account type
3. **Invoice Defaults** — VAT rate, invoice prefix, quote prefix, CN prefix, payment terms defaults, default notes, default terms text
4. **Reminder Templates** — the 4 reminder types (3_days_before, due_today, 7_days_overdue, 14_days_overdue) with subject + body editors per template
5. **Public Site** — hero taglines, service titles/bodies, contact email
6. **Team / Owners** — owner display names, initials, hourly rates (from `owner_settings` table)

Each tab saves independently (its own Save button and its own Supabase update call), so a mistake in one section doesn't affect others.

### 5.2 Add Expense Categories Management

Add a 7th Settings tab: **Expense Categories**

The `expense_categories` table needs a management UI:
- List all categories with their parent, deductibility, and sort order
- Add new category
- Edit name, parent, deductibility toggle
- Archive (soft delete — set `is_archived = true`)
- Reorder (drag or up/down arrows)

This replaces the hardcoded `ExpenseCategoryLegacy` type used on expense forms. Once the UI is built, the expense creation form should use a dynamic dropdown populated from `expense_categories` where `is_archived = false`.

**Checkpoint 5:** Settings page has 7 tabs. Each saves independently. Expense categories are manageable.

---

## SECTION 6 — INVOICING & DOCUMENT IMPROVEMENTS

### 6.1 Partner Filter on Invoice/Quote List Pages

**Files:** `app/admin/invoices/page.tsx`, `app/admin/quotes/page.tsx`, `app/admin/credit-notes/page.tsx`

Currently these pages show a flat list. Add:
- A partner filter dropdown (populated from `partners` table)
- A status filter
- A date range filter (from/to)
- CSV export button (uses the existing ExcelJS dependency)

### 6.2 Invoice Status — Add `partially_paid`

After Section 1.4 adds the `partially_paid` status to the DB constraint, update:

**`lib/types.ts`:**
```ts
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled" | "partially_paid";
```

**`PartialPayments` component:** When the total paid is > 0 but < invoice total, automatically set status to `partially_paid`. When total paid equals invoice total, automatically set status to `paid`.

**All status badge maps** across the app — add `partially_paid` with an indigo/blue colour.

### 6.3 Add "Send Invoice" Button

Currently invoices can be marked as sent but there's no actual email send from the invoice detail page. Add a **Send Invoice** button to `app/admin/invoices/[id]/page.tsx` that:
- Is only shown when status is `draft`
- Opens a confirmation modal showing: To (partner email), Subject (auto-populated "Invoice [number] from StaatWright Solutions"), preview of the invoice
- On confirm: calls a new API route `/api/invoices/send` that uses Resend to email the invoice PDF, then sets status to `sent` and writes a `document_events` record

```ts
// app/api/invoices/send/route.ts
// POST { document_id }
// 1. Fetch document with partner
// 2. Check partner has email
// 3. Build email body with invoice summary
// 4. Send via Resend
// 5. Update document status to 'sent'
// 6. Write document_event
// 7. Return { success: true }
```

**Checkpoint 6:** Invoice list has filters. Partial payments auto-set status. Send Invoice button works.

---

## SECTION 7 — EXPENSES IMPROVEMENTS

### 7.1 Vendor Auto-complete on Manual Expense Entry

The expense creation form should offer auto-complete on the vendor name field, pulling from previously entered vendor names in the `expenses` table:

```ts
// When user types in vendor/description field, query:
const { data } = await supabase
  .from("expenses")
  .select("description")
  .ilike("description", `%${query}%`)
  .limit(5);
// Show as a datalist or dropdown
```

### 7.2 Link Expenses to Partners

The expense form currently has a `partner_id` field but it's not always surfaced clearly. Make it prominent: a searchable dropdown of all partners, with the ability to leave it blank (general business expense). This enables the per-partner expense tracking in the Reports page.

### 7.3 Expense Category Dropdown — Dynamic from DB

Replace the hardcoded `ExpenseCategoryLegacy` dropdown in the expense forms with a live query from `expense_categories` where `is_archived = false`, ordered by `sort_order`. Group by `parent_category` using `<optgroup>`.

**Checkpoint 7:** Expense entry has working partner link and dynamic categories.

---

## SECTION 8 — REPORTS & CASH FLOW ACCURACY

### 8.1 Fix the Cash Flow Tab

The current cash flow tab shows "future-dated logged expenses" as outflows — but expenses are recorded after the fact, so this shows nothing useful.

**Replace the outflows logic:**

Instead of querying past expenses, project outflows from:
1. **Active retainers** — each active retainer contributes `monthly_amount` per month
2. **Recurring expenses** — query `expenses` for the last 3 months, identify items that appear monthly (same description, similar amount), project them forward
3. **Known upcoming costs** — (optional) a simple "planned expense" field that can be added manually

```ts
// Outflow projection from retainers:
const { data: retainers } = await supabase
  .from("retainers")
  .select("monthly_amount, name, partner:partners(company_name)")
  .eq("status", "active");

const monthlyRetainerCost = retainers?.reduce((s, r) => s + r.monthly_amount, 0) ?? 0;
```

Label it **"Cash Flow Projection"** not "Cash Flow Forecast" to be accurate about what it's doing.

### 8.2 Add Per-Partner Report Filtering for Expenses

The `PerPartnerTab` in reports only shows invoice data. Add expenses attributed to that partner (from `expenses.partner_id`) so the margin calculation is meaningful:

```
Total Invoiced: R45,000
Total Paid: R38,000  
Outstanding: R7,000
Partner Expenses: R12,000  ← expenses where partner_id = selectedId
Net Margin: R26,000        ← paid - partner expenses
```

**Checkpoint 8:** Cash flow tab shows retainer-based projections. Per-partner report includes expenses.

---

## SECTION 9 — FULL SCHEMA REFERENCE

If you need to recreate the full database from scratch (e.g. on a new Supabase project), run this SQL. This is the canonical, complete schema reflecting everything the app actually uses.

```sql
-- ============================================================
-- StaatWright Solutions — Complete Schema V3
-- ============================================================

-- COMPANY SETTINGS
create table if not exists public.company_settings (
  id                      uuid primary key default gen_random_uuid(),
  name                    text,
  reg_number              text,
  vat_number              text,
  address                 text,
  phone                   text,
  email                   text,
  logo_path               text,
  bank_name               text,
  bank_account_holder     text,
  bank_account_number     text,
  bank_branch_code        text,
  bank_account_type       text,
  invoice_default_terms   text,
  invoice_default_notes   text,
  invoice_vat_rate        numeric default 15,
  invoice_prefix          text default 'INV-',
  quote_prefix            text default 'QUO-',
  cn_prefix               text default 'CN-',
  quote_validity_days     integer default 30,
  hero_tagline_1          text,
  hero_tagline_2          text,
  hero_subheading         text,
  service_1_title         text,
  service_1_body          text,
  service_2_title         text,
  service_2_body          text,
  service_3_title         text,
  service_3_body          text,
  contact_email           text,
  reminder_templates      jsonb default '{}',
  updated_at              timestamptz default now()
);

-- PARTNERS (unified: clients + ventures)
create table if not exists public.partners (
  id                  uuid primary key default gen_random_uuid(),
  company_name        text not null,
  type                text not null default 'client' check (type in ('client','venture')),
  contact_name        text,
  email               text,
  phone               text,
  address             text,
  website             text,
  vat_number          text,
  relationship_type   text,        -- for clients: retainer|project|advisory|other
  status              text,        -- for ventures: active|paused|winding_down|exited
  founding_date       date,        -- for ventures
  show_on_site        boolean default false,
  brand_id            uuid,        -- links to brands
  tags                text[] default '{}',
  notes_log           jsonb default '[]',   -- PartnerNote[]
  venture_ownership   jsonb default '{}',   -- { "Owner Name": { percentage, role } }
  external_billing    jsonb default '[]',   -- ExternalBillingRow[]
  spec                jsonb default '{}',   -- ProjectSpec
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- BRANDS
create table if not exists public.brands (
  id                        uuid primary key default gen_random_uuid(),
  name                      text not null,
  tagline                   text,
  description               text,
  status                    text default 'active' check (status in ('active','archived','in_development')),
  live_url                  text,
  show_on_public_site       boolean default false,
  public_one_liner          text,
  public_logo_variant       text,
  public_sort_order         integer default 0,
  public_slug               text unique,
  public_extended_description text,
  public_show_case_study    boolean default false,
  hero_image_path           text,
  card_bg_color             text,
  heading_font              text,
  body_font                 text,
  created_at                timestamptz default now(),
  updated_at                timestamptz default now()
);

-- Add FK from partners to brands (after both tables exist)
alter table public.partners
  add constraint if not exists partners_brand_id_fkey
  foreign key (brand_id) references public.brands(id) on delete set null;

-- BRAND COLOURS
create table if not exists public.brand_colours (
  id        uuid primary key default gen_random_uuid(),
  brand_id  uuid references public.brands(id) on delete cascade,
  name      text,
  hex       text,
  role      text check (role in ('primary','secondary','accent','background','text'))
);

-- BRAND TYPOGRAPHY
create table if not exists public.brand_typography (
  id        uuid primary key default gen_random_uuid(),
  brand_id  uuid references public.brands(id) on delete cascade,
  font_name text,
  weight    text,
  role      text check (role in ('display','body','ui')),
  source    text check (source in ('google','custom','system'))
);

-- BRAND LOGOS
create table if not exists public.brand_logos (
  id           uuid primary key default gen_random_uuid(),
  brand_id     uuid references public.brands(id) on delete cascade,
  variant      text check (variant in ('primary','icon','dark','light','horizontal','stacked')),
  storage_path text not null,
  uploaded_at  timestamptz default now()
);

-- DOCUMENTS (Invoices, Quotes, Credit Notes)
create table if not exists public.documents (
  id                 uuid primary key default gen_random_uuid(),
  type               text not null check (type in ('invoice','quote','credit_note')),
  number             text not null unique,
  partner_id         uuid references public.partners(id) on delete set null,
  status             text not null default 'draft'
                     check (status in ('draft','sent','paid','overdue','cancelled','partially_paid','accepted','declined','expired','issued')),
  issue_date         date,
  due_date           date,
  valid_until        date,
  line_items         jsonb not null default '[]',
  subtotal           numeric,
  vat_total          numeric,
  total              numeric,
  notes              text,
  terms              text,
  pdf_path           text,
  currency           text default 'ZAR',
  exchange_rate      numeric,
  zar_equivalent     numeric,
  vat_rate           numeric,
  payment_terms      text,
  linked_document_id uuid references public.documents(id) on delete set null,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- DOCUMENT EVENTS
create table if not exists public.document_events (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid references public.documents(id) on delete cascade,
  event_type  text,
  detail      jsonb,
  created_at  timestamptz default now(),
  created_by  uuid references auth.users(id)
);

-- INVOICE PAYMENTS
create table if not exists public.invoice_payments (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid references public.documents(id) on delete cascade,
  amount       numeric not null,
  payment_date date not null,
  reference    text,
  notes        text,
  created_at   timestamptz default now()
);

-- EXPENSES
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

-- EXPENSE CATEGORIES
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

-- EXPENSE INBOX (AI-parsed slips)
create table if not exists public.expense_inbox (
  id                    uuid primary key default gen_random_uuid(),
  status                text default 'pending' check (status in ('pending','approved','rejected')),
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

-- RETAINERS
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
  status               text default 'active' check (status in ('active','paused','cancelled')),
  last_invoice_date    date,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- PROJECTS
create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  partner_id    uuid references public.partners(id) on delete cascade,
  name          text not null,
  status        text default 'active' check (status in ('active','complete','on_hold','archived')),
  start_date    date,
  end_date      date,
  budget_type   text check (budget_type in ('fixed','time_and_materials','retainer','none')),
  budget_amount numeric,
  description   text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- TIME LOGS
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

-- EQUITY LEDGER
create table if not exists public.equity_ledger (
  id              uuid primary key default gen_random_uuid(),
  entry_type      text not null check (entry_type in (
    'capital_injection','sweat_equity','distribution',
    'loan_in','loan_out','repayment'
  )),
  owner_id        uuid references auth.users(id),
  partner_id      uuid references public.partners(id) on delete set null,
  project_id      uuid references public.projects(id) on delete set null,
  date            date not null,
  description     text not null,
  category        text,
  hours           numeric,
  hourly_rate_used numeric,
  amount          numeric not null,
  currency        text default 'ZAR',
  notes           text,
  created_at      timestamptz default now()
);

-- DRAWINGS
create table if not exists public.drawings (
  id        uuid primary key default gen_random_uuid(),
  owner_id  uuid references auth.users(id),
  date      date not null,
  amount    numeric not null,
  method    text,
  reference text,
  notes     text,
  created_at timestamptz default now()
);

-- OWNER SETTINGS
create table if not exists public.owner_settings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) unique,
  display_name text,
  initials     text,
  hourly_rate  numeric,
  updated_at   timestamptz default now()
);

-- FILE NODES
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

-- CONTACT SUBMISSIONS
create table if not exists public.contact_submissions (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  company    text,
  email      text,
  message    text,
  read       boolean default false,
  created_at timestamptz default now()
);

-- ── RLS Policies ───────────────────────────────────────────────────────────

-- All operational tables: authenticated users have full access
do $$
declare
  t text;
begin
  foreach t in array array[
    'partners','brands','brand_colours','brand_typography','brand_logos',
    'documents','document_events','invoice_payments',
    'expenses','expense_categories','expense_inbox',
    'retainers','projects','time_logs','equity_ledger',
    'drawings','owner_settings','file_nodes','company_settings'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "Authenticated full access to %I" on public.%I for all using (auth.role() = ''authenticated'')',
      t, t
    );
  end loop;
end $$;

-- Public read access
create policy "Anon can read brands" on public.brands for select using (true);
create policy "Anon can read public settings" on public.company_settings for select using (true);
create policy "Anon can insert contact submissions" on public.contact_submissions
  for insert with check (true);
create policy "Authenticated can read contact submissions" on public.contact_submissions
  for select using (auth.role() = 'authenticated');
```

---

## SECTION 10 — TYPE SYSTEM CLEANUP

### 10.1 Update `lib/types.ts`

Replace the entire file with a clean, V3 version. Key changes:
- Remove `Client` and `ClientNote` type aliases (the migration is complete — use `Partner` and `PartnerNote` everywhere)
- Add `partially_paid` to `InvoiceStatus`
- Add all missing V2 types that were already in the file but need the schema aligned
- Add new types: `PartnerSpec`, `BrandCardData` (with joined colours and logos)

```ts
// lib/types.ts — key changes/additions

export type InvoiceStatus =
  | "draft" | "sent" | "paid" | "overdue"
  | "cancelled" | "partially_paid";

export type PartnerType = "client" | "venture";

export interface Partner {
  id: string;
  company_name: string;
  type: PartnerType;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  vat_number: string | null;
  relationship_type: string | null;  // for clients
  status: string | null;             // for ventures
  founding_date: string | null;      // for ventures
  show_on_site: boolean;
  brand_id: string | null;
  tags: string[];
  notes_log: PartnerNote[];
  venture_ownership: VentureOwnership | null;
  spec: PartnerSpec | null;
  created_at: string;
  updated_at: string;
}

export interface PartnerSpec {
  one_liner?: string;
  description?: string;
  problem?: string;
  target_audience?: string;
  key_features?: string[];
  tech_stack?: string[];
  launch_date?: string;
  live_url?: string;
  scope_status?: "in_spec" | "in_build" | "live" | "paused" | "complete";
  scope_items?: { text: string; done: boolean }[];
  github_url?: string;
  figma_url?: string;
  staging_url?: string;
  production_url?: string;
  other_links?: { label: string; url: string }[];
  architecture_notes?: string;
  technical_debt?: string;
  roadmap?: string;
}

export interface BrandCardData extends Brand {
  brand_colours: BrandColour[];
  brand_logos: BrandLogo[];
}

// Remove these legacy aliases:
// export type Client = Partner;       ← DELETE
// export type ClientNote = PartnerNote; ← DELETE

// Keep all V2 types (Project, TimeLog, EquityEntry, etc.) as-is
```

### 10.2 Find and Replace Legacy Type References

After updating `lib/types.ts`, search the entire codebase for:
- `Client` type usage → replace with `Partner`
- `ClientNote` → replace with `PartnerNote`
- `doc.client` in any render code → replace with `doc.partner`
- `.contact_person` → replace with `.contact_name` (the column was renamed in the partners table)
- Any remaining `from("clients")` queries → replace with `from("partners")`

Run this search across all `.tsx` and `.ts` files:
```
grep -r "contact_person\|from(\"clients\")\|: Client\b\|ClientNote" src/ app/ components/ lib/
```

**Checkpoint 10:** TypeScript compilation passes with zero type errors. No `clients` table queries remain anywhere in the codebase.

---

## SECTION 11 — CONVERT CLIENT COMPONENTS TO SERVER COMPONENTS

The following pages are `"use client"` but have no interactive reason to be — they just fetch and display data. Convert them to server components for instant rendering (no loading flash):

**`app/admin/brands/page.tsx`** — already a server component, will be deprecated in favour of the Brand & Identity tab, but keep as a redirect to Partners for now.

**`app/admin/ventures/page.tsx`** → will redirect to `/admin/partners?type=venture`

**New Partners list page** (`app/admin/partners/page.tsx`) → build as server component from the start.

For list pages that need filtering (Partners, Invoices, Quotes), use **URL search params** for filter state instead of React state. This means filters survive page refresh and can be linked to, and the page is a server component:

```tsx
// app/admin/partners/page.tsx
interface Props {
  searchParams: Promise<{ type?: string; q?: string }>;
}

export default async function PartnersPage({ searchParams }: Props) {
  const { type, q } = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("partners").select("...");
  if (type && type !== "all") query = query.eq("type", type);
  if (q) query = query.ilike("company_name", `%${q}%`);
  
  const { data: partners } = await query.order("company_name");
  // ...
}
```

---

## SECTION 12 — FINAL AUDIT CHECKLIST

Before marking this build as complete, verify every item:

### Critical Bugs (Section 1)
- [ ] `middleware.ts` exists at project root (not `proxy.ts`)
- [ ] All 3 print pages use `partners` join and render recipient info correctly
- [ ] `DocumentBuilder` no longer writes `client_id`
- [ ] `reminder_templates` column exists in `company_settings`
- [ ] `partially_paid` is a valid status in DB constraint and TypeScript type
- [ ] Notes are append-only JSONB arrays with initials + timestamp

### Architecture
- [ ] `/admin/clients` and `/admin/ventures` redirect to `/admin/partners`
- [ ] Brand Assets removed from main sidebar
- [ ] `Brand & Identity` tab exists in Partner detail for ventures (and clients)
- [ ] `Spec & Brief` tab exists in Partner detail
- [ ] No `clients` table queries remain in the codebase
- [ ] `contact_person` fully replaced with `contact_name` everywhere

### Features
- [ ] Partners list page shows type filter (All | Clients | Ventures)
- [ ] Partner detail page shows correct tabs per type
- [ ] Brand editor with live card preview works in Brand & Identity tab
- [ ] Public homepage BrandCard pulls colours/images from DB dynamically
- [ ] Dashboard has slip inbox preview and working Mark Paid action
- [ ] Activity feed populates on status changes
- [ ] Settings has 7 tabs, each saves independently
- [ ] Expense categories are manageable in Settings
- [ ] Invoice list has partner and status filters
- [ ] Send Invoice button exists and calls Resend
- [ ] Cash flow projection uses retainer data for outflows

### Schema
- [ ] Full schema SQL in `supabase/schema.sql` matches live database
- [ ] Old `supabase-schema.sql` in root is deleted or renamed to `supabase-schema.LEGACY.sql`
- [ ] `lib/types.ts` has no `Client` or `ClientNote` aliases

### TypeScript
- [ ] `npm run build` completes with zero errors
- [ ] `npm run lint` completes with zero errors

---

## APPENDIX A — DESIGN SYSTEM REFERENCE

Do not change the design system. The system uses:

```css
/* Colours */
--color-ink:   #1A1A1A
--color-cream: #F3F2EE
--color-steel: #5C6E81
--color-linen: #EAE4DC
--color-navy:  #1F2A38

/* Fonts */
--font-inter: Inter (headings, labels, UI)
--font-montserrat: Montserrat (body, secondary)
```

**Rules that must not be violated:**
- No border-radius anywhere (all elements use `borderRadius: 0`)
- No box shadows (use `border: 1px solid var(--color-linen)` instead)
- Status dots are square (not circular) inside the admin. Only document status badges use `rounded-full`
- All buttons: square corners, navy background (`#1F2A38`), white text, hover opacity 80%
- Uppercase tracking on all labels: `text-xs uppercase tracking-wider`
- The admin sidebar background is `#1F2A38`, width `240px`, fixed left

**Admin component patterns (copy these exactly for new components):**

```tsx
// Label
<label className="block text-xs text-steel uppercase tracking-wider mb-1"
       style={{ fontFamily: "var(--font-montserrat)" }}>
  Field Name
</label>

// Text input
<input
  className="border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm"
  style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
/>

// Primary button
<button
  className="px-5 py-2.5 text-white text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
  style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
>
  Action
</button>

// Card
<div className="bg-white border border-linen p-6" style={{ borderRadius: 0 }}>
  ...
</div>

// Section header inside a card
<h3 className="text-navy font-bold text-xs uppercase tracking-wider mb-4"
    style={{ fontFamily: "var(--font-inter)" }}>
  Section Title
</h3>
```

---

## APPENDIX B — SUGGESTED BUILD ORDER

Work through these in order. Each is a complete, shippable increment:

1. **Sprint 1 — Bug fixes** (Section 1 only): Fixes critical breakage. Deployable immediately.
2. **Sprint 2 — Schema + types** (Sections 9 + 10): Foundation for everything else. No UI changes.
3. **Sprint 3 — Partners IA** (Section 2): New Partners page + detail page with all tabs. Biggest sprint.
4. **Sprint 4 — Public site** (Section 3): Brand-driven card system. Visible to the public immediately.
5. **Sprint 5 — Dashboard + Settings** (Sections 4 + 5): Operational improvements.
6. **Sprint 6 — Invoicing** (Section 6): Send invoice, partial payment status, filters.
7. **Sprint 7 — Expenses** (Section 7): Dynamic categories, vendor autocomplete.
8. **Sprint 8 — Reports** (Section 8): Cash flow fix, per-partner expenses.
9. **Sprint 9 — Server components** (Section 11): Performance pass.
10. **Sprint 10 — Final audit** (Section 12): Clean up, TypeScript, lint.

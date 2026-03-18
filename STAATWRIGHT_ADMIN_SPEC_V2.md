# StaatWright Solutions Ltd — Enhanced Admin Suite Specification
**Version 2.0 | March 2026**
*Supersedes and extends the Admin section of the original V1 spec*

---

## Table of Contents

1. [Philosophy & Mental Model](#1-philosophy--mental-model)
2. [Terminology Changes](#2-terminology-changes)
3. [Updated Information Architecture](#3-updated-information-architecture)
4. [Module 1 — Dashboard](#4-module-1--dashboard)
5. [Module 2 — Partners](#5-module-2--partners)
6. [Module 3 — Equity & Capital Ledger](#6-module-3--equity--capital-ledger)
7. [Module 4 — Invoicing, Quotes & Credit Notes](#7-module-4--invoicing-quotes--credit-notes)
8. [Module 5 — Expense Management & Slip Ingestion](#8-module-5--expense-management--slip-ingestion)
9. [Module 6 — Reporting & Exports](#9-module-6--reporting--exports)
10. [Module 7 — File Manager](#10-module-7--file-manager)
11. [Module 8 — Brand Assets](#11-module-8--brand-assets)
12. [Module 9 — Retainer Infrastructure](#12-module-9--retainer-infrastructure)
13. [Module 10 — Cash Flow Forecast](#13-module-10--cash-flow-forecast)
14. [Module 11 — Bookkeeper Portal](#14-module-11--bookkeeper-portal)
15. [Module 12 — Settings](#15-module-12--settings)
16. [Database Schema Additions](#16-database-schema-additions)
17. [External Services & APIs](#17-external-services--apis)
18. [Claude Code Build Prompts](#18-claude-code-build-prompts)
19. [Future Roadmap (Not in Current Build)](#19-future-roadmap-not-in-current-build)

---

## 1. Philosophy & Mental Model

StaatWright's admin suite is not accounting software. It is an **operational command centre** for a two-person digital consultancy that:

- Builds products for clients and for itself
- Has uneven cash flow and significant sweat equity investment
- Wants financial clarity without a $300/month Sage subscription
- Needs to be bookkeeper-ready twice a year without any manual data assembly
- Will eventually hand this system to an outside party to extract clean numbers

The system must be **opinionated but configurable**. It makes decisions (auto-categorise a slip, generate the next invoice number, flag an overdue invoice) but always lets the human override.

The two guiding principles:
1. **Capture everything now, report it cleanly later**
2. **Build for the bookkeeper you don't have yet**

---

## 2. Terminology Changes

| Old Term | New Term | Reason |
|---|---|---|
| Clients | Partners | StaatWright's relationships are co-builders, retainer clients, and product partners — not just "clients" |
| Projects (implied) | Projects | Each Partner has one or more Projects |
| Admin Users | Owners | Only two — you two |

> **Note:** The public website still uses "Partners & Builds" — this is consistent. Inside the admin, everything is Partners and Projects.

---

## 3. Updated Information Architecture

```
/admin
├── /dashboard                    ← Command centre
├── /partners                     ← All partners (formerly clients)
│   ├── /new
│   └── /[id]
│       ├── overview
│       ├── projects
│       │   └── /[project-id]
│       ├── invoices
│       ├── quotes
│       ├── credit-notes
│       ├── equity              ← Capital & sweat equity ledger per partner
│       └── files
├── /equity                       ← Global equity & capital dashboard
│   └── /terms                  ← Repayment terms configuration
├── /invoices
│   ├── /new
│   └── /[id]
├── /quotes
│   ├── /new
│   └── /[id]
├── /credit-notes
│   └── /[id]
├── /expenses
│   └── /inbox                  ← AI slip ingestion queue
├── /reports
│   ├── /pl                     ← Profit & loss
│   ├── /cashflow               ← Cash flow forecast
│   ├── /partner/[id]           ← Per-partner P&L
│   └── /bookkeeper             ← Bookkeeper export portal
├── /retainers
│   ├── /new
│   └── /[id]
├── /files
│   └── /[...path]
├── /brands
│   └── /[id]
└── /settings
    ├── /company
    ├── /banking
    ├── /invoice-defaults
    ├── /expense-categories
    ├── /public-site
    └── /team
```

---

## 4. Module 1 — Dashboard

The dashboard is a **live snapshot of StaatWright's financial and operational health**.

### Layout: 3-Zone Design

**Zone A — Financial Pulse (top row, 5 cards)**
| Card | Data | Colour Signal |
|---|---|---|
| Outstanding (Sent) | Sum of all sent-not-paid invoices | Neutral |
| Overdue | Sum + count of overdue invoices | Red if > 0 |
| This Month Revenue | Sum of invoices marked paid this calendar month | Green |
| This Month Expenses | Sum of expenses this calendar month | Neutral |
| Net This Month | Revenue minus expenses | Green/red |

**Zone B — Middle row (3 panels)**

*Outstanding Invoices table*
- Partner | Invoice # | Amount | Due Date | Days Overdue | Actions
- Sorted by most overdue first
- One-click: Send Reminder | Mark Paid | View

*Cash Flow Forecast (30-day mini chart)*
- Bar chart: expected inflows (outstanding invoices by due date) vs expected outflows (recurring expenses, retainer costs)
- Click → opens full /reports/cashflow page

*Slip Inbox Badge*
- Count of AI-ingested slips awaiting sign-off
- Preview of last 3 items
- "Review All" → /expenses/inbox

**Zone C — Activity Feed (bottom)**
- Chronological log of all system events (last 20)
- Event types: invoice created/sent/paid, quote accepted, expense logged, slip ingested, retainer invoice generated, payment reminder sent
- Each entry: icon + description + relative timestamp + link

---

## 5. Module 2 — Partners

### Partner List `/admin/partners`
- Card grid view (not table) — each card shows: partner logo (from brand assets if linked), name, relationship type badge, active project count, outstanding invoice total
- Filter bar: All | Active | Retainer | Partner Build | Prospect | Archived
- Sort: Name | Outstanding | Last Activity

### Relationship Types
```
Active Client       — paying work currently in progress
Retainer Client     — on a monthly retainer arrangement
Partner Build       — a product StaatWright co-owns or built for equity
Prospect            — not yet engaged
Archived            — no longer active
```

### Partner Detail `/admin/partners/[id]`

**Header strip:** Logo + Name + Relationship Type + Quick stats (total invoiced, total paid, outstanding)

**Tabs:**

#### Tab 1: Overview
- Contact details (editable): company name, contact person, email, phone, physical address, VAT number
- Internal notes (append-only, timestamped, initialled)
- Linked brand (dropdown → links to brand assets module)
- Tags (custom, freeform)

#### Tab 2: Projects
- Project list for this partner
- Each project: name, status (Active / Complete / On Hold / Archived), start date, time logged, budget (if set)
- "+ New Project" button

**Project Detail (slide-over or sub-page):**
```
Project Name
Status
Start Date / End Date
Budget (optional — fixed fee or T&M)
Description / Scope notes
Time Log entries (see time logging below)
Expenses tagged to this project
Sweat Equity entries (see equity module)
Total revenue from this partner attributed to this project
```

**Time Logging (within project):**
- Add entry: Date | Owner (dropdown: you or co-owner) | Hours | Description | Billable? (toggle)
- Running total: billable hours | non-billable hours | estimated value (hours × owner rate from settings)
- Export: CSV of all time entries

#### Tab 3: Invoices
- All invoices for this partner
- Same table as main invoices list, filtered to this partner
- "New Invoice" pre-selects this partner

#### Tab 4: Quotes
- Same pattern as invoices

#### Tab 5: Credit Notes
- Same pattern

#### Tab 6: Equity
- This partner's capital and sweat equity ledger (see Module 3)
- Only relevant for Partner Build type relationships

#### Tab 7: Files
- Partner-specific file manager (scoped to /files/partners/[id]/)
- Full folder/subfolder functionality (same component as global file manager)

---

## 6. Module 3 — Equity & Capital Ledger

This is one of the most important and unique modules. It tracks what has been **invested into StaatWright and its partner builds** — in cash and in sweat — and establishes the legal and financial terms under which it gets repaid.

### 6.1 Concept

Every contribution — a laptop purchase, a subscription payment, hours of development work, CIPC registration fees — is a **ledger entry**. The system accumulates these and presents a clear picture of:

- What each co-owner is owed
- What each partner/investor is owed (if external capital is ever taken)
- Whether repayment happens via profit distributions, salary, or on business sale

### 6.2 Equity Terms Configuration `/admin/equity/terms`

Before any entries are made, the two owners define the **gospel** of how equity is valued and repaid. These terms are locked and versioned (any change creates a new version with a timestamp — the old version is never deleted).

**Terms fields:**

```
SWEAT EQUITY
─────────────────────────────────────────────────────
Owner 1 hourly rate (ZAR)          [e.g. R850/hr]
Owner 2 hourly rate (ZAR)          [e.g. R500/hr]
Sweat equity valuation method:     [Hourly rate | Agreed flat value | Both]

CAPITAL CONTRIBUTIONS
─────────────────────────────────────────────────────
Interest on capital loans:         [0% | Prime rate | Fixed %: ___]
Interest accrues from:             [Date of contribution | Agreed start date]

REPAYMENT TERMS
─────────────────────────────────────────────────────
Repayment trigger:                 [Select one or more]
  ☐ Ongoing — distribute from profit monthly
  ☐ Milestone — when business reaches R___ MRR
  ☐ On sale of business
  ☐ Manual — owner decides per distribution

Repayment priority:                [e.g. Capital before sweat | Pro-rata | Owner 1 first]
Distribution method:               [Equal split | Pro-rata to contribution | Custom %]

NOTES / LEGAL NOTES
─────────────────────────────────────────────────────
[Free text — this is your internal shareholders agreement summary]
```

**Version history:** Every time terms are saved, the system creates a new version entry with the date and both owners' initials as confirmation. The current version is always shown; past versions are accessible but read-only.

### 6.3 Global Equity Dashboard `/admin/equity`

**Summary cards:**
- Total Capital Contributed (cash) — all time
- Total Sweat Equity (calculated) — all time
- Total Distributions Made — all time
- Net Outstanding to Each Owner

**Per-Owner Panel (side by side, one per co-owner):**
```
[Owner Name]
─────────────────────────────────
Capital contributed:    R XX,XXX
Sweat equity:          R XX,XXX
Interest accrued:      R  X,XXX
Distributions received: R  X,XXX
─────────────────────────────────
NET OUTSTANDING:        R XX,XXX
```

**Contribution Ledger (full table):**
Columns: Date | Owner | Type (Capital / Sweat / Distribution) | Description | Amount | Running Balance per Owner

Filter: By owner | By type | By date range | By linked project

### 6.4 Adding Ledger Entries

**Capital Entry form:**
- Date
- Owner (select)
- Description (e.g. "Laptop — MacBook Pro 14" M3")
- Amount (ZAR)
- Category: Equipment | Subscription | Registration/Legal | Office | Travel | Software | Other
- Receipt/slip (upload — linked to expense if already in expense module)
- Linked project (optional)
- Notes

**Sweat Equity Entry form:**
- Date
- Owner (select)
- Description (e.g. "CAIRN Solutions — Phase 3 build")
- Entry type:
  - Time-based: Hours → auto-calculates value at owner's rate from Terms
  - Agreed value: Skip hours, enter R value directly
- Linked project (optional)
- Notes

**Distribution Entry form:**
- Date
- Owner(s) receiving (multi-select)
- Amount per owner
- Method: Bank transfer | Offset against invoice | Other
- Reference (e.g. bank transaction ref)
- Notes

### 6.5 Per-Partner Equity (for Partner Builds)

When a partner/investor contributes to a specific build, their ledger entries are scoped to that partner record. Access via Partner → Equity tab.

Same entry types: Capital | Sweat | Distribution

Additional field: **Equity % agreed** (if the contribution converts to ownership rather than a loan).

---

## 7. Module 4 — Invoicing, Quotes & Credit Notes

*Extends the V1 spec with the following additions:*

### 7.1 Excel/CSV Export

Every document list (invoices, quotes, credit notes) has an **Export** button:
- **Export Current View as Excel (.xlsx)** — respects active filters
- **Export All as Excel (.xlsx)**
- **Export as CSV**

Excel export columns (invoices):
```
Invoice # | Partner | Issue Date | Due Date | Status | Subtotal (ZAR) | VAT (ZAR) | Total (ZAR) | Paid Date | Days to Pay | Project
```

Excel export is generated server-side using the `exceljs` library. Styling: header row in navy (#1F2A38), white text, auto-column widths.

### 7.2 Multi-Currency Invoicing

When creating an invoice:
- Currency selector: ZAR (default) | USD | EUR | GBP | Other
- If non-ZAR: live exchange rate fetched from ExchangeRate-API (free tier) at time of invoice creation
- Rate recorded on the invoice (so it's fixed — doesn't change after creation)
- ZAR equivalent recorded separately for reporting
- All internal reporting in ZAR (using the locked exchange rate)
- PDF invoice shows original currency + ZAR equivalent

### 7.3 Payment Reminder Automation

Per invoice, a reminder schedule can be set:
- Reminder 1: 3 days before due date (optional)
- Reminder 2: On due date
- Reminder 3: 7 days overdue
- Reminder 4: 14 days overdue (escalated tone)

Each reminder: auto-generated email via Resend using a template. Template editable in Settings → Invoice Defaults.

Global toggle in Settings: "Enable automatic payment reminders" (on/off).

Per-invoice override: "Reminders: On | Off | Custom schedule"

All reminders logged in document_events.

### 7.4 Invoice Status Lifecycle

```
Draft → Sent → [Paid | Overdue | Disputed | Cancelled]
                     ↑
              Partially Paid (new status — records partial payment amounts)
```

**Partial Payment tracking:**
- "Record Payment" button on invoice
- Enter: amount received, date, reference
- Invoice status becomes "Partially Paid" with outstanding balance shown
- Multiple partial payments supported
- Fully paid when balance = 0

Payments logged in a new `invoice_payments` table.

### 7.5 Logo on Documents

Company logo (from Settings → Company) is rendered in the PDF header. If a partner has a linked brand with a logo, optionally show partner's logo alongside StaatWright's on the document (toggle on document builder).

### 7.6 Quote → Invoice Conversion

On an accepted quote: "Convert to Invoice" button. This:
- Creates a new invoice pre-filled with all line items from the quote
- Links the invoice back to the quote (for audit trail)
- Updates quote status to "Converted"
- Quote and invoice remain linked (viewable from either document)

---

## 8. Module 5 — Expense Management & Slip Ingestion

This is the most technically sophisticated module. The slip ingestion pipeline is what makes this genuinely useful day-to-day.

### 8.1 Expense Categories

The system ships with a comprehensive category list covering everything relevant to a SA digital consultancy, with tax deductibility notes. Categories are configurable in Settings → Expense Categories.

**Default categories (with SA tax deductibility context):**

```
TECHNOLOGY & SOFTWARE
  ├── Software Subscriptions (SaaS)          ✓ Fully deductible
  ├── Hosting & Infrastructure               ✓ Fully deductible
  ├── Domain Names                           ✓ Fully deductible
  ├── Cloud Storage                          ✓ Fully deductible
  ├── API Services & Credits                 ✓ Fully deductible
  └── Hardware & Equipment                   ✓ Deductible (may require depreciation)

PROFESSIONAL SERVICES
  ├── Legal & Compliance (CIPC, contracts)   ✓ Fully deductible
  ├── Accounting & Bookkeeping               ✓ Fully deductible
  ├── Consulting & Subcontractors            ✓ Fully deductible
  └── Professional Memberships               ✓ Partly deductible

OFFICE & OPERATIONS
  ├── Office Supplies & Stationery           ✓ Fully deductible
  ├── Printing & Copying                     ✓ Fully deductible
  ├── Postage & Courier                      ✓ Fully deductible
  └── Home Office (% of home costs)          ✓ Proportional — needs calculation

TRAVEL & TRANSPORT
  ├── Fuel                                   ✓ Deductible (business use %)
  ├── Parking                                ✓ Deductible
  ├── Toll Fees                              ✓ Deductible
  ├── Uber / Bolt / Taxi                     ✓ Deductible (business travel)
  ├── Flights (domestic)                     ✓ Fully deductible
  ├── Flights (international)                ✓ Fully deductible
  └── Accommodation (business travel)        ✓ Fully deductible

MEALS & ENTERTAINMENT
  ├── Client Entertainment                   ✓ Deductible (with caution — needs documentation)
  ├── Business Meals (working lunches)       ✓ Partly deductible
  └── Team Meals                             ✗ Generally not deductible — track separately

MARKETING & SALES
  ├── Advertising (digital)                  ✓ Fully deductible
  ├── Website & Domain Costs                 ✓ Fully deductible
  ├── Design Assets (Fonts, Stock, etc.)     ✓ Fully deductible
  └── Promotional Materials                  ✓ Fully deductible

BANKING & FINANCE
  ├── Bank Charges                           ✓ Fully deductible
  ├── Payment Gateway Fees (PayFast etc.)    ✓ Fully deductible
  ├── Currency Conversion Fees              ✓ Fully deductible
  └── Interest on Business Loans            ✓ Fully deductible

INSURANCE
  └── Business Insurance                    ✓ Fully deductible

TRAINING & DEVELOPMENT
  ├── Online Courses & Subscriptions         ✓ Deductible
  ├── Books & Reference Materials            ✓ Deductible
  └── Conference & Event Tickets            ✓ Deductible (with business purpose)

EQUIPMENT (Capital Items)
  ├── Computers & Laptops                    ✓ Deductible (may depreciate over 3 years)
  ├── Monitors & Peripherals                 ✓ Deductible
  ├── Phones & Tablets                       ✓ Deductible (business % only)
  └── Furniture (home office)                ✓ Proportional

UNCATEGORISED
  └── Other / Unassigned                     — Review before submitting to bookkeeper
```

Each category has metadata: `is_deductible` (bool), `deductibility_notes` (text), `requires_documentation` (bool).

### 8.2 Slip Ingestion Pipeline

**The Flow:**
```
Phone camera → Email to slips@staatwright.co.za
    → Webhook triggers ingestion function
    → OpenAI Vision extracts data
    → Slip added to Inbox queue with extracted data
    → Owner reviews and signs off in /expenses/inbox
    → Signed-off slip becomes a confirmed expense record
```

**Technical Implementation:**

*Email ingestion:*
Use **Postmark Inbound** (or Mailgun Inbound) — these services provide a webhook that fires when an email arrives at a configured address. Free tiers exist for both.

Set up: slips@staatwright.co.za forwards inbound emails to your Supabase Edge Function endpoint via Postmark's inbound webhook.

*Supabase Edge Function: `process-slip-email`*
```
1. Receive Postmark webhook payload
2. Extract attachments (images: JPG/PNG, or PDF)
3. Save raw attachment to Supabase Storage: /expenses/inbox/raw/{uuid}.{ext}
4. Call OpenAI GPT-4o Vision with the image
5. Parse structured response
6. Insert record into `expense_inbox` table with status='pending'
7. Send push notification or email to owners: "New slip received — review required"
```

*OpenAI Vision prompt (engineered for SA context):*
```
You are a financial document parser for a South African company.
Analyse this receipt/slip/invoice image and extract:
{
  "vendor_name": "string",
  "date": "YYYY-MM-DD",
  "total_amount": number,          // In ZAR. If USD/EUR, note currency separately
  "currency": "ZAR|USD|EUR|GBP",
  "subtotal_excl_vat": number,     // If VAT is shown separately
  "vat_amount": number,            // 15% VAT if shown
  "line_items": [                  // If itemised
    {"description": "string", "amount": number}
  ],
  "suggested_category": "string",  // Match to category list provided
  "vendor_vat_number": "string",   // SA VAT number if shown (format: 4XXXXXXXX)
  "payment_method": "card|cash|eft|unknown",
  "confidence": 0.0-1.0,          // Your confidence in the extraction
  "notes": "string"               // Anything unusual or unclear
}
Only return valid JSON. If a field cannot be determined, use null.
```

The category list (from Settings) is injected into the prompt at runtime so the AI matches to your actual categories.

### 8.3 Expense Inbox `/admin/expenses/inbox`

**The sign-off queue for AI-ingested slips.**

Layout: Split-pane — left: list of pending items, right: detail view of selected item.

**Left pane — Inbox list:**
- Each item: thumbnail of slip + vendor name + amount + date extracted + confidence badge
- Confidence badge: Green (>85%) | Amber (60–85%) | Red (<60%)
- Sort: newest first
- Filter: Pending | Approved | Rejected

**Right pane — Review panel:**
```
[Slip image — full view, pinch to zoom on mobile]

EXTRACTED DATA (all fields editable):
  Vendor:           [input] ← pre-filled by AI
  Date:             [date picker] ← pre-filled
  Amount (total):   [number input] ← pre-filled
  VAT Amount:       [number input] ← pre-filled (if detected)
  Currency:         [select] ← pre-filled
  Category:         [searchable select] ← AI suggestion highlighted
  Linked Project:   [optional select]
  Notes:            [text input]

AI CONFIDENCE: 87% — "Clear image, all fields extracted. VAT number found: 4xxxxxxxx"

[APPROVE & SAVE]    [REJECT]    [← Previous]    [Next →]
```

On **Approve**: creates confirmed expense record + moves slip to /expenses/confirmed/ in storage.
On **Reject**: marks as rejected, slip stays in storage for reference.

**Bulk actions:** Select multiple → Approve All | Reject All (only when confidence is high).

### 8.4 Manual Expense Entry

Unchanged from V1 spec, but now with full category list and optional "Link to Equity Entry" (if this expense is also a capital contribution from a co-owner).

---

## 9. Module 6 — Reporting & Exports

The reports module is the **bookkeeper's best friend** and the owners' financial compass.

### 9.1 Profit & Loss `/admin/reports/pl`

**Filters:**
- Period: This Month | Last Month | This Quarter | Last Quarter | This Financial Year (Mar–Feb) | Last FY | Custom Range
- Partner filter (for per-partner P&L)

**Report layout:**

```
STAATWRIGHT SOLUTIONS — PROFIT & LOSS
Period: 1 March 2025 – 28 February 2026

INCOME
──────────────────────────────────────────────
  Partner Invoices (paid)                R XXX,XXX
  Retainer Income                        R  XX,XXX
  Other Income                           R   X,XXX
  ─────────────────────────────────────────────
  TOTAL INCOME                           R XXX,XXX

EXPENSES
──────────────────────────────────────────────
  Technology & Software                  R  XX,XXX
  Professional Services                  R  XX,XXX
  Travel & Transport                     R   X,XXX
  Marketing & Sales                      R   X,XXX
  Banking & Finance                      R   X,XXX
  Equipment                              R  XX,XXX
  Other                                  R   X,XXX
  ─────────────────────────────────────────────
  TOTAL EXPENSES                         R  XX,XXX

──────────────────────────────────────────────
NET PROFIT / (LOSS)                      R XXX,XXX
══════════════════════════════════════════════
```

**Export options:**
- Download as Excel (.xlsx) — formatted, branded
- Download as PDF
- Download as CSV (raw data)

### 9.2 Per-Partner P&L `/admin/reports/partner/[id]`

Same structure but scoped to one partner:

```
Income: all paid invoices for this partner
Expenses: all expenses tagged to this partner or their projects
Net: income - expenses = partner profitability
Time: hours logged × owner rates = cost of delivery
True Margin: Net after time cost
```

This tells you whether each engagement is actually profitable.

### 9.3 Cash Flow Forecast `/admin/reports/cashflow`

**30 / 60 / 90 day toggle**

```
INFLOWS (expected)
  Outstanding invoices due in period:
    [Partner A] INV-0012   R15,000   due 25 Mar
    [Partner B] INV-0015   R 8,500   due 2 Apr
    [Retainer]  Auto-gen   R 5,000   due 1 Apr (monthly)
  ─────────────────────────────────────────────
  Total Expected Inflows:             R28,500

OUTFLOWS (expected)
  Known recurring expenses:
    AWS Hosting              R   650   1 Apr
    GitHub                   R   280   15 Apr
    [Any recurring expenses marked as recurring]
  ─────────────────────────────────────────────
  Total Expected Outflows:            R 1,200

NET FORECAST:                         R27,300
```

**Chart:** Waterfall or bar chart — daily/weekly buckets showing running balance.

**Assumptions panel:** List of what the forecast is based on (so user knows what's real vs assumed).

### 9.4 Payment Drawings Tracker

Track what each owner takes out of the business:

```
DRAWINGS / DISTRIBUTIONS LOG
─────────────────────────────────────────────
Date     | Owner    | Amount  | Method | Notes
─────────────────────────────────────────────
15 Mar   | Owner 1  | R8,000  | EFT    | March salary
15 Mar   | Owner 2  | R8,000  | EFT    | March salary
28 Feb   | Owner 1  | R2,000  | EFT    | Expense reimbursement
```

- Add drawing: same form as equity Distribution entry (linked)
- Monthly summary: what each owner drew vs what the business earned
- Year-to-date drawings per owner

### 9.5 Excel Export Infrastructure

All exports use `exceljs`. Standard formatting applied:
- Header row: navy (#1F2A38) fill, white text, Poppins Bold
- Data rows: alternating white and linen (#EAE4DC)
- Currency cells: South African format (R #,##0.00)
- Date cells: DD MMM YYYY
- Auto-width columns
- Freeze top row
- StaatWright logo in top-left of first sheet (if available)
- Sheet tab named with the report type + date range

Multi-sheet exports (for bookkeeper package):
- Sheet 1: Summary
- Sheet 2: Invoices detail
- Sheet 3: Expenses detail
- Sheet 4: Drawings

---

## 10. Module 7 — File Manager

*Unchanged from V1 spec — drag-and-drop virtual folder tree using Supabase Storage + file_nodes table.*

**Addition:** Partner-scoped views. When accessing files from a Partner's Files tab, the file manager is pre-navigated to /Partners/[partner-name]/ and only shows that subtree. The global /admin/files shows everything.

---

## 11. Module 8 — Brand Assets

*Unchanged from V1 spec.*

**Addition:** Brand assets module now links to Partners. When viewing a Partner, a "Linked Brand" field lets you associate a brand record. The partner card on the public website pulls logo + one-liner from the linked brand automatically.

---

## 12. Module 9 — Retainer Infrastructure

*No active retainers yet — but the infrastructure is built so it takes 2 minutes to activate one.*

### What a Retainer Record Contains
```
Partner (select)
Project (select)
Retainer Name (e.g. "CAIRN Solutions — Monthly Support")
Monthly Amount (ZAR)
Invoice Day (default: 1st of month)
Start Date
End Date (optional — leave blank for ongoing)
Status: Active | Paused | Cancelled
Services included (text — appears on auto-generated invoice)
```

### How It Works
- A Supabase scheduled function (pg_cron or Vercel cron) runs on the 1st of each month
- For each Active retainer, it generates a draft invoice pre-filled with the retainer details
- Owners receive a notification: "3 retainer invoices generated — review and send"
- Owners review, edit if needed, then send — never fully automatic (always a human in the loop before sending)

### Retainer List `/admin/retainers`
- Table: Partner | Retainer Name | Monthly Amount | Next Invoice Date | Status | Actions
- "New Retainer" button
- Pause / Resume / Cancel per record
- History: list of all invoices generated from this retainer

---

## 13. Module 10 — Cash Flow Forecast

*Covered in Section 9.3 above. The /admin/reports/cashflow page.*

Additional feature: **Scenario planning**

Toggle: "What if I add R10,000 expected income on [date]?" — lets you add hypothetical inflows/outflows to the forecast without saving them, to model decisions.

---

## 14. Module 11 — Bookkeeper Portal

A **self-serve, read-only portal** for the external bookkeeper to access what they need, twice a year, without you having to do anything.

### Access
- Separate login credentials (not owner credentials)
- Role: `bookkeeper` — read-only access to all financial data
- Access can be revoked after each session
- Bookkeeper sees a **simplified interface** — not the full admin UI

### Bookkeeper Interface `/admin/bookkeeper` (owner view to manage)
- "Generate Bookkeeper Package" button
- Select period (date range)
- System generates a package including:
  - P&L statement (Excel)
  - Full invoice register (Excel)
  - Full expense register with categories (Excel)
  - All expense slips (ZIP of images/PDFs)
  - Drawings log (Excel)
  - Equity ledger summary (Excel)

**Bookkeeper login view** (what the bookkeeper sees at `/bookkeeper`):
```
[StaatWright wordmark]
Welcome, [Bookkeeper Name]

SELECT PERIOD:
  [ Date From ] — [ Date To ]   [Generate Package]

Or download pre-generated packages:
  📦 Mar 2025 – Aug 2025 package     [Download ZIP]   Generated: 12 Sep 2025
  📦 Sep 2024 – Feb 2025 package     [Download ZIP]   Generated: 14 Mar 2025

INDIVIDUAL REPORTS:
  📊 Profit & Loss               [Download Excel]
  📋 Invoice Register            [Download Excel]
  💳 Expense Register            [Download Excel]
  🧾 Expense Slips               [Download ZIP]
  💰 Drawings Log                [Download Excel]
```

The bookkeeper cannot create, edit, or delete anything. They cannot see the equity terms or the file manager.

---

## 15. Module 12 — Settings

*Extends V1 spec with:*

### New: Expense Categories Tab
- Full list of expense categories (editable)
- Toggle: is_deductible
- Edit: deductibility_notes
- Add custom category
- Reorder (drag)
- Cannot delete a category with existing expenses (archive instead)

### New: Slip Ingestion Tab
- Inbound email address (display only — configured at infrastructure level)
- OpenAI API key (encrypted, stored in Supabase vault)
- Default confidence threshold for auto-flagging (default: 75%)
- Notification preference: Email notification | In-app only | Both
- Test: "Send test slip" button — processes a sample image to verify pipeline

### New: Owner Rates Tab (for sweat equity calculation)
- Owner 1 name + hourly rate (ZAR)
- Owner 2 name + hourly rate (ZAR)
- These rates feed into time logging and sweat equity calculations

### New: Reminder Templates Tab
Editable email templates for:
- Invoice: 3 days before due
- Invoice: on due date
- Invoice: 7 days overdue
- Invoice: 14 days overdue (escalated)
- Quote: expiry reminder (3 days before valid_until)

Each template: Subject line + Body (with variables: {{partner_name}}, {{invoice_number}}, {{amount}}, {{due_date}}, {{days_overdue}}, {{payment_link_placeholder}})

### Updated: Team Tab
Roles:
- `owner` — full access
- `bookkeeper` — read-only financial data + download exports
- Future: `partner_viewer` (not in this build)

---

## 16. Database Schema Additions

*All additions to the V1 schema:*

```sql
-- PROJECTS (under partners)
create table projects (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid references partners(id) on delete cascade,
  name text not null,
  status text default 'active' check (status in ('active','complete','on_hold','archived')),
  start_date date,
  end_date date,
  budget_type text check (budget_type in ('fixed','time_and_materials','retainer','none')),
  budget_amount numeric,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- TIME LOGS
create table time_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id),
  partner_id uuid references partners(id),
  owner_id uuid references auth.users(id),
  date date not null,
  hours numeric not null,
  description text,
  billable boolean default true,
  hourly_rate numeric, -- snapshot of owner's rate at time of entry
  calculated_value numeric, -- hours × hourly_rate
  created_at timestamptz default now()
);

-- EQUITY TERMS (versioned)
create table equity_terms (
  id uuid primary key default gen_random_uuid(),
  version integer not null,
  is_current boolean default true,
  owner_1_id uuid references auth.users(id),
  owner_1_hourly_rate numeric,
  owner_2_id uuid references auth.users(id),
  owner_2_hourly_rate numeric,
  sweat_valuation_method text, -- 'hourly' | 'agreed' | 'both'
  capital_interest_rate numeric default 0,
  interest_accrues_from text, -- 'contribution_date' | 'agreed_date'
  repayment_triggers text[], -- array: ['profit','milestone','sale','manual']
  repayment_milestone_amount numeric,
  repayment_priority text,
  distribution_method text,
  legal_notes text,
  confirmed_by_owner_1 boolean default false,
  confirmed_by_owner_2 boolean default false,
  effective_from timestamptz default now(),
  created_at timestamptz default now()
);

-- EQUITY LEDGER
create table equity_ledger (
  id uuid primary key default gen_random_uuid(),
  entry_type text not null check (entry_type in ('capital','sweat','distribution')),
  owner_id uuid references auth.users(id),
  partner_id uuid references partners(id), -- null = StaatWright-level entry
  project_id uuid references projects(id), -- optional
  date date not null,
  description text not null,
  category text, -- for capital entries
  hours numeric, -- for sweat entries
  hourly_rate_used numeric, -- snapshot for sweat entries
  amount numeric not null, -- ZAR value
  expense_id uuid references expenses(id), -- link if this is also an expense
  receipt_path text,
  notes text,
  equity_terms_version integer, -- which terms version applied
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

-- RETAINERS
create table retainers (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid references partners(id),
  project_id uuid references projects(id),
  name text not null,
  monthly_amount numeric not null,
  invoice_day integer default 1, -- day of month to generate invoice
  currency text default 'ZAR',
  services_description text,
  start_date date not null,
  end_date date,
  status text default 'active' check (status in ('active','paused','cancelled')),
  last_invoice_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- EXPENSE INBOX (AI-ingested slips awaiting sign-off)
create table expense_inbox (
  id uuid primary key default gen_random_uuid(),
  status text default 'pending' check (status in ('pending','approved','rejected')),
  raw_image_path text not null,
  email_from text,
  email_subject text,
  email_received_at timestamptz,
  -- AI extracted fields
  ai_vendor_name text,
  ai_date date,
  ai_total_amount numeric,
  ai_currency text,
  ai_subtotal_excl_vat numeric,
  ai_vat_amount numeric,
  ai_line_items jsonb,
  ai_suggested_category text,
  ai_vendor_vat_number text,
  ai_payment_method text,
  ai_confidence numeric, -- 0.0 to 1.0
  ai_notes text,
  -- Override fields (what owner set during review)
  vendor_name text,
  expense_date date,
  total_amount numeric,
  currency text,
  vat_amount numeric,
  category text,
  linked_project_id uuid references projects(id),
  notes text,
  -- Result
  expense_id uuid references expenses(id), -- set when approved
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- INVOICE PAYMENTS (partial payment tracking)
create table invoice_payments (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id),
  amount numeric not null,
  payment_date date not null,
  reference text,
  notes text,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

-- DRAWINGS (owner distributions / salary)
create table drawings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id),
  date date not null,
  amount numeric not null,
  method text, -- 'eft' | 'offset' | 'other'
  reference text,
  notes text,
  equity_ledger_id uuid references equity_ledger(id), -- link if this reduces equity balance
  created_at timestamptz default now()
);

-- EXPENSE CATEGORIES (configurable)
create table expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_category text, -- for grouping in reports
  is_deductible boolean default true,
  deductibility_notes text,
  requires_documentation boolean default false,
  sort_order integer default 0,
  is_archived boolean default false
);

-- OWNER SETTINGS (per user)
create table owner_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) unique,
  display_name text,
  initials text, -- 2 chars, used in notes and time logs
  hourly_rate numeric,
  updated_at timestamptz default now()
);

-- Rename clients → partners (migration)
-- ALTER TABLE clients RENAME TO partners;
-- ALTER TABLE clients_id_seq RENAME TO partners_id_seq;

-- Add to existing documents table:
-- ALTER TABLE documents ADD COLUMN currency text default 'ZAR';
-- ALTER TABLE documents ADD COLUMN exchange_rate numeric; -- rate at time of creation
-- ALTER TABLE documents ADD COLUMN zar_equivalent numeric; -- total in ZAR
-- ALTER TABLE documents ADD COLUMN retainer_id uuid references retainers(id);
-- ALTER TABLE documents ADD COLUMN converted_from_quote_id uuid references documents(id);
-- ALTER TABLE documents ADD COLUMN reminder_schedule jsonb; -- custom reminder config
-- ALTER TABLE documents ADD COLUMN last_reminder_sent timestamptz;
-- ALTER TABLE documents ADD COLUMN partner_logo_on_pdf boolean default false;

-- Add to existing expenses table:
-- ALTER TABLE expenses ADD COLUMN is_recurring boolean default false;
-- ALTER TABLE expenses ADD COLUMN recurrence_period text; -- 'monthly' | 'annual'
-- ALTER TABLE expenses ADD COLUMN inbox_id uuid references expense_inbox(id);
```

---

## 17. External Services & APIs

| Service | Purpose | Tier | Cost |
|---|---|---|---|
| Supabase | DB + Auth + Storage | Free (scale later) | Free |
| OpenAI GPT-4o | Slip image parsing (Vision API) | Pay per use | ~R0.15 per slip |
| Postmark Inbound | Email → webhook for slip ingestion | Free (100/month) | Free |
| Resend | Outbound email (invoices, reminders) | Free (3000/month) | Free |
| ExchangeRate-API | Live currency conversion | Free (1500 req/month) | Free |
| Vercel | Hosting + cron jobs | Free (Hobby) | Free |
| exceljs | Excel file generation | npm package | Free |

**Total running cost at launch: ~R0 fixed + ~R0.15 per AI-parsed slip.**

---

## 18. Claude Code Build Prompts

These prompts extend and replace the admin prompts from V1. Run in order. Prompts 1–3 from V1 (scaffold, schema, public site) remain valid — start these admin prompts after those are complete.

---

### PROMPT A — Rename & Restructure (run after V1 Prompts 1–3)

```
In the staatwright project, rename all references from "clients" to "partners" throughout:

1. Rename the database table `clients` to `partners` (update schema.sql and create a migration)
2. Rename all API routes from /admin/clients to /admin/partners
3. Rename all component files: ClientList → PartnerList, ClientDetail → PartnerDetail, etc.
4. Update all TypeScript interfaces: Client → Partner
5. Update all sidebar navigation labels from "Clients" to "Partners"
6. Update all page titles, headings, and form labels

Then add the Projects system:
- Create /app/admin/partners/[id]/projects/ route
- Create the `projects` table (see schema)
- Build a ProjectList component (shown as a tab on partner detail page):
  - Table: Name | Status | Start Date | Budget Type | Budget Amount | Actions
  - "New Project" button → opens a slide-over form
  - Project form fields: Name, Status (select), Start Date, End Date (optional), Budget Type (select: Fixed / T&M / Retainer / None), Budget Amount (conditional on type), Description (textarea)
- Build a ProjectDetail slide-over (clicking a project opens it):
  - Header: project name + status badge + partner name
  - Tabs: Overview | Time Log | Expenses
  - Overview: all project fields, editable
  - Time Log tab: (placeholder for now — will be built in Prompt C)
  - Expenses tab: list of expenses tagged to this project

Also add owner_settings table and a basic owner settings form in /admin/settings under a new "Team & Rates" tab:
- For each owner: Display Name, Initials (2 chars), Hourly Rate (ZAR)
- These rates are used by the sweat equity and time log modules
```

---

### PROMPT B — Equity & Capital Ledger

```
Build the Equity & Capital Ledger module for the staatwright admin.

This module tracks financial contributions (cash and sweat equity) from each co-owner, and distributions back to them. It is the authoritative record of what the business owes each owner.

Create the following database tables (add to schema):
- equity_terms (versioned terms configuration)
- equity_ledger (individual entries)
- drawings (owner distributions/salary)

BUILD: /admin/equity/terms — Terms Configuration page

Layout: Single long form, save button at bottom.

Sections:
1. "Sweat Equity Valuation"
   - Owner 1 Hourly Rate: number input (ZAR) — pre-filled from owner_settings
   - Owner 2 Hourly Rate: number input (ZAR) — pre-filled from owner_settings
   - Valuation method: radio — Hourly Rate | Agreed Value | Both (case by case)

2. "Capital Contributions"
   - Interest on capital loans: select — 0% (no interest) | Prime Rate (auto-fetch) | Fixed Rate: [number]%
   - Interest accrues from: radio — Date of contribution | A fixed agreed date: [date picker]

3. "Repayment Terms"
   - Repayment triggers: checkboxes (multi-select):
     ☐ Ongoing profit distributions (monthly)
     ☐ When business reaches monthly revenue of R___ [conditional number input]
     ☐ On sale of business
     ☐ Manual — owners decide per distribution
   - Distribution method: select — Equal split | Pro-rata to contribution | Custom: [Owner 1 %] / [Owner 2 %]

4. "Legal Notes"
   - Large textarea: "Document your internal agreement here. This is not a legally binding document but serves as your internal reference."

Save button: requires both owners to confirm (show two checkboxes: "Owner 1 confirms" / "Owner 2 confirms" — both must be checked to save).

On save: insert new equity_terms row with version = max(version)+1, set is_current=true on new row, set is_current=false on all previous rows.

Show version history below the form: "Version 3 — Effective 15 Mar 2026 — [View]"

---

BUILD: /admin/equity — Global Equity Dashboard

Top: 4 summary cards:
- Total Capital Contributed (sum of all capital entries in equity_ledger)
- Total Sweat Equity (sum of all sweat entries)
- Total Distributions Made (sum of all distribution entries)
- Net Outstanding (capital + sweat - distributions)

Two owner panels (side by side, responsive stacked on mobile):
Per owner: show capital contributed, sweat equity, distributions received, net outstanding — all as calculated from equity_ledger filtered by owner_id.

Full ledger table below:
Columns: Date | Owner | Type (badge: Capital/Sweat/Distribution) | Description | Category | Amount (ZAR) | Running Balance
- Running balance per owner (two separate running totals, one per owner)
- Filter: By owner | By type | By date range | By linked project
- "Add Entry" button → opens slide-over form

Add Entry slide-over:
Toggle at top: Capital | Sweat Equity | Distribution

Capital form:
- Date, Owner (select), Description, Amount (ZAR), Category (select from expense categories with capital-relevant ones highlighted), Receipt upload, Linked project (optional), Notes

Sweat Equity form:
- Date, Owner (select), Description
- Entry method: radio — Time-based | Agreed value
  - If Time-based: Hours input + auto-calculated value (hours × owner rate, shown read-only)
  - If Agreed value: Amount (ZAR) input directly
- Linked project (optional), Notes

Distribution form:
- Date, Owner(s) receiving (multi-select, with amount per owner), Method (select: EFT / Offset / Other), Reference, Notes

All entries use optimistic UI. On save, refresh summary cards and ledger table.

Export: "Export Ledger as Excel" button — full ledger with running balances, formatted.
```

---

### PROMPT C — Time Logging

```
Build the Time Logging system within the staatwright admin.

Time logs are scoped to projects. They feed into:
1. Partner P&L (cost of delivery)
2. Sweat equity calculations (when billable hours become equity entries)
3. Project profitability reporting

CREATE: time_logs table (see schema spec)

BUILD: Time Log tab within ProjectDetail (accessed via Partner → Projects → [project] → Time Log tab)

Layout:
- Summary strip at top: Total Hours | Billable Hours | Non-billable Hours | Estimated Value (billable hours × owner rate)
- "Log Time" button → opens inline form or slide-over

Log Time form:
- Date (date picker, default today)
- Owner (select — shows initials + name, pre-selects current user)
- Hours (number input, 0.5 increments)
- Description (text input — what was done)
- Billable? (toggle, default on)
- The hourly_rate field is auto-populated from owner_settings at time of save (snapshot — doesn't change if rate changes later)
- calculated_value = hours × hourly_rate (shown read-only in form)

Time log table:
- Columns: Date | Owner | Hours | Description | Billable | Value (ZAR) | Actions (edit/delete)
- Sorted newest first
- Totals row at bottom

Also build a global time view at /admin/reports/time:
- All time logs across all projects
- Filter: by owner | by project | by partner | by date range | billable only
- Summary: total hours, total value, breakdown by project
- Export as Excel
```

---

### PROMPT D — Expense Module with AI Slip Ingestion

```
Build the full Expense module with AI slip ingestion for the staatwright admin.

PART 1: Expense Categories seed data
Create a seed file at /supabase/seed-categories.sql that inserts the full expense category list with all subcategories, is_deductible flags, deductibility_notes, and sort_order. Use the full category list from the spec (Technology & Software, Professional Services, Office & Operations, Travel & Transport, Meals & Entertainment, Marketing & Sales, Banking & Finance, Insurance, Training & Development, Equipment, Uncategorised).

PART 2: Supabase Edge Function — slip ingestion
Create /supabase/functions/process-slip-email/index.ts

This edge function:
1. Accepts POST requests from Postmark Inbound webhook
2. Validates the request (check a shared secret header)
3. Extracts image attachments from the Postmark payload (Base64 encoded)
4. Saves each image to Supabase Storage at /expenses/inbox/{uuid}.{ext}
5. Calls OpenAI GPT-4o Vision API with the image and a structured prompt
6. Parses the JSON response from OpenAI
7. Inserts a record into expense_inbox with status='pending' and all AI-extracted fields
8. Sends a notification email via Resend to the owner email (from company_settings): "New slip received — {vendor_name}, {amount}. Review in StaatWright admin."

The OpenAI prompt must:
- Request structured JSON output only
- Include the full list of expense category names (fetched from expense_categories table) so the AI can match to your actual categories
- Handle both clear and unclear images (use confidence score)
- Be optimised for South African receipts (ZAR, VAT at 15%, SA vendor VAT number format)

PART 3: Expense Inbox page — /admin/expenses/inbox
Split-pane layout (left: list, right: review):

Left pane:
- "Pending" tab (default) | "Approved" tab | "Rejected" tab
- Each item: small thumbnail + vendor name + amount + date + confidence badge (Green/Amber/Red)
- Click item → loads in right pane
- Bulk select: "Approve selected" (only shows when all selected items have confidence > 0.80)

Right pane (review panel):
- Slip image (large, with ability to zoom)
- All editable fields pre-filled from AI extraction:
  - Vendor Name (text input)
  - Date (date picker)
  - Total Amount (number, ZAR)
  - VAT Amount (number)
  - Currency (select: ZAR/USD/EUR/GBP)
  - Category (searchable select — AI suggestion shown with a small "AI suggested" badge)
  - Linked Project (optional select)
  - Notes (text input)
- AI info panel: confidence score + AI notes + raw extracted line items (collapsible)
- Action buttons: [Approve & Save] [Reject] [← Prev] [Next →]
- Keyboard shortcuts: A = approve, R = reject, ← → = navigate (show hint bar)

On Approve:
- Create expense record from the reviewed (potentially edited) fields
- Set expense.inbox_id = this inbox record
- Move image in Supabase Storage from /expenses/inbox/ to /expenses/confirmed/
- Update expense_inbox.status = 'approved', reviewed_at, reviewed_by, expense_id

PART 4: Main expenses page /admin/expenses/page.tsx — update from V1
- Add "Slip Inbox" button in top bar with a badge showing pending count
- Add "Recurring" toggle to expense form (marks expense as recurring, stores recurrence_period)
- Add "Link to Equity" toggle (if this expense is also a capital contribution — creates equity_ledger entry automatically)
- Summary cards: this month total | this financial year total | deductible expenses this FY | pending slips
```

---

### PROMPT E — Enhanced Invoicing (Multi-currency, Partial Payments, Reminders)

```
Enhance the invoicing module in the staatwright admin with the features from the V2 spec.

PART 1: Multi-currency
Add to the DocumentBuilder component:
- Currency selector (ZAR default | USD | EUR | GBP)
- When non-ZAR selected:
  - Fetch live exchange rate from ExchangeRate-API: GET https://v6.exchangerate-api.com/v6/{API_KEY}/pair/{currency}/ZAR
  - Show: "Rate: 1 USD = R18.42 (live rate, locked on save)"
  - Store exchange_rate and zar_equivalent on the document record
  - PDF shows: amount in original currency + "ZAR equivalent at time of invoice: RXX,XXX"
- All internal reporting always uses zar_equivalent

PART 2: Partial Payments
Add to invoice detail view (when status is 'sent' or 'overdue'):
- "Record Payment" button
- Opens a slide-over: Amount Received (ZAR) | Payment Date | Reference | Notes
- Creates invoice_payments record
- Recalculates outstanding balance: total - sum(payments)
- If balance = 0: auto-sets status to 'paid'
- If balance > 0: status becomes 'partially_paid'
- Show payment history on invoice: table of payments received with dates and references
- Outstanding balance shown prominently on invoice detail page

PART 3: Quote → Invoice conversion
Add "Convert to Invoice" button on accepted quotes:
- Creates new invoice with all line items copied
- Sets documents.converted_from_quote_id = quote.id
- Updates quote status to 'converted'
- Shows on both documents: "This invoice was converted from Quote QUO-XXXX" (with link)

PART 4: Payment Reminders
Add reminder configuration to invoice detail:
- "Reminder Schedule" section (collapsible):
  - Global setting from Settings is default, but per-invoice override available
  - Show: 3 days before | on due date | 7 days overdue | 14 days overdue — each with toggle
- Create Vercel cron job at /api/cron/reminders (runs daily at 08:00 SAST):
  - Query all invoices where status in ('sent','partially_paid')
  - For each invoice, check if any reminder should fire today based on schedule
  - Send via Resend using template from settings
  - Log to document_events: {event_type: 'reminder_sent', detail: {reminder_type, sent_to}}
  - Update documents.last_reminder_sent

PART 5: Excel Export for all document lists
Add export functionality to /admin/invoices, /admin/quotes, /admin/credit-notes:
- "Export" dropdown button: "Current view (.xlsx)" | "All (.xlsx)" | "CSV"
- Server action at /api/export/documents accepts: type, filters, format
- Uses exceljs to generate formatted Excel file
- Branded: navy header row, alternating data rows, auto-width columns, freeze top row
- Invoice export columns: Invoice # | Partner | Issue Date | Due Date | Currency | Amount (original) | ZAR Equivalent | VAT | Status | Paid Date | Project
```

---

### PROMPT F — Reporting Suite

```
Build the Reporting module for the staatwright admin at /admin/reports.

Reports index page: grid of report cards — P&L | Cash Flow Forecast | Per-Partner P&L | Time Summary | Drawings | Expense by Category

BUILD EACH REPORT:

--- /admin/reports/pl — Profit & Loss ---

Filter bar: period selector (This Month | Last Month | This Quarter | Last Quarter | This FY | Last FY | Custom) + Partner filter (All or specific partner)

Report table: structured as per spec — Income section, Expenses section (by category group), Net result.

All figures link through: click on "Technology & Software: R12,450" → shows filtered expense list for that category in that period.

Export: Download Excel (formatted, branded) | Download PDF | Download CSV

--- /admin/reports/partner/[id] — Per-Partner P&L ---

Same structure but scoped to one partner:
- Income: paid invoices for this partner in period
- Expenses: expenses tagged to this partner/projects
- Time cost: hours × owner rates (from time_logs)
- True margin: income - expenses - time cost
- Shown as a profitability summary card + detailed breakdown

--- /admin/reports/cashflow — Cash Flow Forecast ---

Period toggle: 30 days | 60 days | 90 days
Scenario toggle: Baseline | + Custom (add hypothetical items without saving)

Two sections:
1. Expected Inflows: outstanding invoices grouped by due date + retainer expected invoices
2. Expected Outflows: recurring expenses (is_recurring=true) + retainer commitments

Bar chart (recharts): daily/weekly buckets, inflows vs outflows, running balance line

Assumptions panel: list what's included/excluded so the user trusts the numbers

--- /admin/reports/time --- (see Prompt C)

--- /admin/reports/drawings ---

Table: Date | Owner | Amount | Method | Reference | Notes | Running total per owner
Period filter
Add Drawing button (creates drawings record + optionally links to equity_ledger distribution)
Export Excel

--- Bookkeeper Portal /admin/bookkeeper (owner management view) ---

"Generate Package" section:
- Date range picker
- Checklist of what to include: ☑ P&L ☑ Invoice Register ☑ Expense Register ☑ Expense Slips (ZIP) ☑ Drawings Log ☑ Equity Summary
- "Generate Package" button → server action that:
  1. Generates each selected Excel/PDF
  2. Zips expense slip images for the period
  3. Bundles everything into a ZIP at /bookkeeper-packages/{uuid}.zip in Supabase Storage
  4. Creates a signed URL (7-day expiry)
  5. Shows download link + copies to clipboard

Past packages list: table of generated packages with date, period, download link (if not expired), re-generate button

Bookkeeper user management: generate a bookkeeper login (separate Supabase auth user with 'bookkeeper' role), revoke access button.

--- Bookkeeper self-serve view /bookkeeper ---

Separate route (not /admin). Only accessible with bookkeeper role.
Clean, minimal: just StaatWright wordmark, period selector, download buttons.
No navigation, no create buttons, no sensitive data beyond financial reports.
```

---

### PROMPT G — Retainer Infrastructure

```
Build the Retainer module for the staatwright admin.

This builds the infrastructure for monthly retainer billing. No active retainers yet but the system is ready to activate.

CREATE: retainers table (see schema)

BUILD: /admin/retainers — Retainer list
- Table: Partner | Project | Name | Monthly Amount | Currency | Invoice Day | Next Invoice Date | Status | Actions
- Status badge: Active (green) | Paused (amber) | Cancelled (muted)
- "New Retainer" button

New/Edit Retainer slide-over form:
- Partner (select — searchable)
- Project (select — filtered to selected partner's projects)
- Retainer Name (text)
- Monthly Amount (number, ZAR)
- Currency (select: ZAR/USD/EUR/GBP)
- Invoice Day (number 1-28, default 1)
- Services Included (textarea — this text appears in the generated invoice line item)
- Start Date (date)
- End Date (optional date — leave blank for ongoing)
- Status (Active/Paused)

Retainer detail page /admin/retainers/[id]:
- All editable fields
- History section: table of all invoices generated from this retainer (with links to invoice records)
- "Pause" / "Resume" / "Cancel" action buttons

Auto-generation cron job at /api/cron/retainers (Vercel cron, runs 1st of each month at 07:00 SAST):
- Query all retainers where status='active' AND start_date <= today AND (end_date IS NULL OR end_date >= today)
- For each: generate a draft invoice pre-filled with retainer details
  - Partner, amount, services description as line item, correct invoice number (next in sequence)
  - Set retainers.last_invoice_date = today
  - Log to document_events
- Send notification to owners: "X retainer invoice(s) generated and ready to review. [Link to /admin/invoices?filter=draft]"
- Never send invoices automatically — always draft → owner reviews → owner sends

Show on dashboard: "X retainer invoices pending review" card when drafts exist from auto-generation.
```

---

### PROMPT H — Settings (Full Enhanced Version)

```
Build the complete Settings module for the staatwright admin — replacing the V1 settings with the enhanced V2 version.

Route: /admin/settings with shadcn Tabs for 8 tabs:

TAB 1: Company
Fields: Company Name, Registration Number, VAT Number, Address (textarea), Phone, Email
Logo upload: drag-drop area, preview current logo, replace button
Saves to company_settings table. Triggers revalidatePath for public site.

TAB 2: Banking
Fields: Bank Name, Account Holder, Account Number, Branch Code, Account Type (select)
Note shown: "These details appear on all invoices and quotes."

TAB 3: Invoice Defaults
Fields: Default Payment Terms (textarea), Default Notes (textarea), VAT Rate (%), Quote Validity (days), Invoice Prefix, Quote Prefix, Credit Note Prefix
Preview: shows "Next invoice will be numbered: INV-0012"
Reminder toggles: "Enable automatic payment reminders" (master toggle)
Default reminder schedule: checkboxes for each reminder type (3 days before, on due date, 7 days overdue, 14 days overdue)

TAB 4: Reminder Templates
For each reminder type: Subject (text input) + Body (textarea with variable hints)
Variable reference shown: {{partner_name}} {{invoice_number}} {{amount}} {{due_date}} {{days_overdue}} {{company_name}}
"Preview Email" button: opens modal with rendered preview of the template

TAB 5: Expense Categories
Full CRUD for expense categories:
- Drag-to-reorder list (parent categories as sections, subcategories indented)
- Each row: Category Name | Parent | Deductible? (toggle) | Notes | Archive button
- "Add Category" button: form with Name, Parent (select existing or "Top-level"), Is Deductible (toggle), Deductibility Notes, Requires Documentation (toggle)
- Cannot delete categories with expenses — archive only (archived categories hidden from expense form but historical data preserved)

TAB 6: Slip Ingestion
Display: "Inbound email address: slips@staatwright.co.za (configure this in Postmark)"
OpenAI API Key: password input (stored encrypted in Supabase vault) + test button
Confidence threshold: slider 0-100%, default 75%
Notification: radio — Email only | In-app only | Both
"Send Test Slip" button: lets you upload an image to test the pipeline end-to-end, shows the raw AI response

TAB 7: Public Site
Editable fields that sync to public homepage:
- Hero line 1, Hero line 2, Hero subheading
- Service 1/2/3: Title + Body
- Contact email
"Preview Public Site" → opens / in new tab

TAB 8: Team & Rates
Owner rates section: for each owner — display name, initials (2 chars), hourly rate (ZAR). These feed sweat equity calculations.
Team users table: email | role | last login | actions (remove)
Invite: input email + select role (owner / bookkeeper) → Supabase invite
Bookkeeper access: show current bookkeeper user (if any) + "Revoke Access" button

First-run setup wizard:
If company_settings is empty on first admin load, show a 4-step modal wizard:
Step 1: Company details
Step 2: Banking details  
Step 3: Owner rates (Owner 1 name/rate, Owner 2 name/rate)
Step 4: "You're set up. Add your first partner to get started."
Cannot be dismissed until Step 4 is complete.
```

---

### PROMPT I — Polish, Mobile & Final QA

```
Final polish pass for the staatwright admin suite.

MOBILE RESPONSIVENESS
The admin is primarily desktop but must be functional on a phone for:
- Checking the slip inbox (reviewing AI-parsed receipts)
- Checking the dashboard
- Quickly logging time

For these pages specifically, ensure:
- Slip inbox: full mobile layout (single pane — list view, tap to open review, swipe left = reject, swipe right = approve)
- Dashboard: all 5 cards stack to 1 column, charts remain readable
- Time log entry: slide-over form is full-width on mobile, all inputs accessible

LOADING STATES
- All data-fetching pages: shadcn Skeleton components while loading
- Long operations (PDF generation, Excel export, slip processing): show progress indicator with status text ("Generating PDF...", "Processing slip with AI...")

EMPTY STATES
Every list/table needs an empty state (no data yet):
- Partners list: "No partners yet. Add your first partner to get started." + Add button
- Invoice list: "No invoices yet. Create your first invoice." + Create button
- Expense inbox: "Your inbox is clear. Take a photo of a slip and email it to slips@staatwright.co.za"
- Equity ledger: "No entries yet. Start by configuring your equity terms." + link to /equity/terms
- Time logs: "No time logged for this project yet." + Log Time button

NOTIFICATIONS
Implement a simple in-app notification system:
- Bell icon in top bar with badge count
- Notification types: new slip in inbox | retainer invoice generated | invoice overdue | payment received
- Notifications stored in a `notifications` table (user_id, type, message, link, read, created_at)
- Mark as read on click
- "Mark all read" button

KEYBOARD SHORTCUTS (document throughout with a ? help modal)
- G then D: go to dashboard
- G then P: go to partners
- G then I: go to invoices
- N then I: new invoice
- N then Q: new quote
- In slip inbox: A = approve, R = reject, ← → = navigate

SECURITY CHECKS
- Verify all /admin/* routes are protected by middleware
- Verify bookkeeper role cannot access equity, team settings, or file manager
- Verify all Supabase queries use RLS (no service role key on client-side)
- Verify OpenAI API key is never exposed to client

FINAL ENVIRONMENT VARIABLES (.env.example):
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
OPENAI_API_KEY=
EXCHANGERATE_API_KEY=
POSTMARK_INBOUND_SECRET=
NEXT_PUBLIC_APP_URL=
CRON_SECRET=
```

---

## 19. Future Roadmap (Not in Current Build)

*Spec these when the time is right — the database design above does not block them.*

### API Integration with Own Builds (CAIRN, Concierge Styled, Mendly)

Each build would expose a `/api/health` and `/api/metrics` endpoint returning:
```json
{
  "active_users": 142,
  "mrr_zar": 12400,
  "last_deployment": "2026-03-15T09:23:00Z",
  "uptime_30d_pct": 99.8,
  "open_issues": 3
}
```

StaatWright admin would poll these endpoints and display a "Project Health" dashboard card per build. Implementation requires:
1. Building auth-gated metric endpoints in each project (use a shared secret header)
2. Storing metric snapshots in a `project_metrics` table for trending
3. Building the dashboard widget

### SARS VAT201 Reporting

If/when VAT registered: a VAT report page that pre-calculates the VAT201 return fields for a given 2-month period, exportable as a PDF with the exact SARS VAT201 layout. Requires tracking output tax (on invoices) and input tax (on expense VAT amounts) separately.

### Client/Partner Portal

A read-only portal where partners can log in to view their own invoices, download statements, and see project status. Would require a new `partner_users` table and a separate `/portal` route with heavily scoped Supabase RLS policies.

### Automated Bank Statement Reconciliation

Import bank statement CSV (FNB, Nedbank, Standard Bank all export CSVs) → auto-match transactions to invoices and expenses → flag unmatched items for manual review. This would make the bookkeeper's job even simpler and give real-time cash clarity.

### Payroll (if you hire)

If StaatWright starts employing people: PAYE calculation (using SARS tax tables), UIF contributions, payslip generation, IRP5 at year end. Build this only when there's an actual employee — do not over-engineer early.

---

*StaatWright Solutions Ltd — Complexity, managed. Simplicity, experienced.*
*This document is the authoritative specification for the StaatWright admin suite. All build decisions should reference this document.*

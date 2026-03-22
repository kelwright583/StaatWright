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

-- ============================================================
-- INDEXES
-- Safe to run on both fresh and existing databases.
-- ============================================================

create index if not exists idx_documents_partner_id   on public.documents(partner_id);
create index if not exists idx_documents_status        on public.documents(status);
create index if not exists idx_documents_type_status   on public.documents(type, status);
create index if not exists idx_documents_issue_date    on public.documents(issue_date);
create index if not exists idx_document_events_doc_id  on public.document_events(document_id);
create index if not exists idx_document_events_created on public.document_events(created_at desc);
create index if not exists idx_expenses_date           on public.expenses(date);
create index if not exists idx_expenses_partner_id     on public.expenses(partner_id);
create index if not exists idx_brand_colours_brand_id  on public.brand_colours(brand_id);
create index if not exists idx_brand_logos_brand_id    on public.brand_logos(brand_id);
create index if not exists idx_brand_typography_brand  on public.brand_typography(brand_id);
create index if not exists idx_partners_type           on public.partners(type);
create index if not exists idx_partners_status         on public.partners(status);
create index if not exists idx_time_logs_partner_id    on public.time_logs(partner_id);
create index if not exists idx_time_logs_project_id    on public.time_logs(project_id);
create index if not exists idx_projects_partner_id     on public.projects(partner_id);
create index if not exists idx_retainers_partner_id    on public.retainers(partner_id);
create index if not exists idx_invoice_payments_doc_id on public.invoice_payments(document_id);
create index if not exists idx_equity_ledger_partner   on public.equity_ledger(partner_id);
create index if not exists idx_expense_inbox_status    on public.expense_inbox(status);

-- ============================================================
-- SERVICE PROVIDERS
-- ============================================================

create table if not exists public.service_providers (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  contact_name        text,
  email               text,
  phone               text,
  address             text,
  website             text,
  vat_number          text,
  reg_number          text,
  bank_name           text,
  bank_account_holder text,
  bank_account_number text,
  bank_branch_code    text,
  bank_account_type   text default 'Cheque',
  notes               text,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.service_providers enable row level security;

drop policy if exists "Authenticated access to service_providers" on public.service_providers;
create policy "Authenticated access to service_providers" on public.service_providers
  for all to authenticated using (true) with check (true);

-- ============================================================
-- BILLS
-- ============================================================

create table if not exists public.bills (
  id                  uuid primary key default gen_random_uuid(),
  number              text not null default 'BILL-' || to_char(now(), 'YYYYMMDD-HH24MISS'),
  venture_id          uuid references public.partners(id) on delete set null,
  service_provider_id uuid references public.service_providers(id) on delete set null,
  status              text not null default 'draft' check (status in ('draft','received','paid','overdue')),
  issue_date          date,
  due_date            date,
  reference           text,
  description         text,
  amount_excl_vat     numeric(14,2),
  vat_amount          numeric(14,2),
  total_amount        numeric(14,2),
  currency            text not null default 'ZAR',
  exchange_rate       numeric(14,6),
  zar_equivalent      numeric(14,2),
  invoice_path        text,
  ocr_raw             jsonb,
  category            text,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.bills enable row level security;

drop policy if exists "Authenticated access to bills" on public.bills;
create policy "Authenticated access to bills" on public.bills
  for all to authenticated using (true) with check (true);

create index if not exists idx_bills_venture_id          on public.bills(venture_id);
create index if not exists idx_bills_service_provider_id on public.bills(service_provider_id);
create index if not exists idx_bills_status              on public.bills(status);
create index if not exists idx_bills_issue_date          on public.bills(issue_date);

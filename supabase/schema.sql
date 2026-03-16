-- ============================================================
-- StaatWright Solutions — Full Database Schema
-- Run in Supabase SQL Editor on a fresh project
-- ============================================================

-- COMPANY SETTINGS (single row)
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
  hero_tagline_1          text default 'Complexity, managed.',
  hero_tagline_2          text default 'Simplicity, experienced.',
  hero_subheading         text default 'We build digital platforms, products, and systems for businesses that mean it.',
  service_1_title         text default 'Digital Products',
  service_1_body          text default 'We design and build web apps, PWAs, and platforms from the ground up.',
  service_2_title         text default 'Systems & Integrations',
  service_2_body          text default 'We connect the tools your business already uses into coherent, automated systems.',
  service_3_title         text default 'Consultancy',
  service_3_body          text default 'We assess, architect, and advise — without the agency overhead.',
  contact_email           text,
  updated_at              timestamptz default now()
);

alter table public.company_settings enable row level security;

create policy "Anon can read public settings" on public.company_settings
  for select using (true);

create policy "Authenticated can update settings" on public.company_settings
  for all using (auth.role() = 'authenticated');

-- CLIENTS
create table if not exists public.clients (
  id              uuid primary key default gen_random_uuid(),
  company_name    text not null,
  contact_person  text,
  email           text,
  phone           text,
  address         text,
  vat_number      text,
  tags            text[] default '{}',
  notes           jsonb default '[]',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.clients enable row level security;
create policy "Authenticated full access to clients" on public.clients
  for all using (auth.role() = 'authenticated');

-- DOCUMENTS (Invoices, Quotes, Credit Notes)
create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('invoice','quote','credit_note')),
  number      text not null unique,
  client_id   uuid references public.clients(id) on delete set null,
  status      text not null default 'draft',
  issue_date  date,
  due_date    date,
  valid_until date,
  line_items  jsonb not null default '[]',
  subtotal    numeric,
  vat_total   numeric,
  total       numeric,
  notes       text,
  terms       text,
  pdf_path    text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.documents enable row level security;
create policy "Authenticated full access to documents" on public.documents
  for all using (auth.role() = 'authenticated');

-- DOCUMENT EVENTS
create table if not exists public.document_events (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid references public.documents(id) on delete cascade,
  event_type  text,
  detail      jsonb,
  created_at  timestamptz default now(),
  created_by  uuid references auth.users(id)
);

alter table public.document_events enable row level security;
create policy "Authenticated full access to document events" on public.document_events
  for all using (auth.role() = 'authenticated');

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
  client_id       uuid references public.clients(id) on delete set null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.expenses enable row level security;
create policy "Authenticated full access to expenses" on public.expenses
  for all using (auth.role() = 'authenticated');

-- FILE NODES (virtual file tree)
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
create policy "Authenticated full access to file nodes" on public.file_nodes
  for all using (auth.role() = 'authenticated');

-- BRANDS
create table if not exists public.brands (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  tagline               text,
  description           text,
  status                text default 'active' check (status in ('active','archived','in_development')),
  live_url              text,
  show_on_public_site   boolean default false,
  public_one_liner      text,
  public_logo_variant   text,
  public_sort_order     integer default 0,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

alter table public.brands enable row level security;
create policy "Anon can read public brand fields" on public.brands
  for select using (true);
create policy "Authenticated full access to brands" on public.brands
  for all using (auth.role() = 'authenticated');

-- BRAND COLOURS
create table if not exists public.brand_colours (
  id        uuid primary key default gen_random_uuid(),
  brand_id  uuid references public.brands(id) on delete cascade,
  name      text,
  hex       text,
  role      text
);

alter table public.brand_colours enable row level security;
create policy "Authenticated full access to brand colours" on public.brand_colours
  for all using (auth.role() = 'authenticated');

-- BRAND TYPOGRAPHY
create table if not exists public.brand_typography (
  id        uuid primary key default gen_random_uuid(),
  brand_id  uuid references public.brands(id) on delete cascade,
  font_name text,
  weight    text,
  role      text,
  source    text
);

alter table public.brand_typography enable row level security;
create policy "Authenticated full access to brand typography" on public.brand_typography
  for all using (auth.role() = 'authenticated');

-- BRAND LOGOS
create table if not exists public.brand_logos (
  id           uuid primary key default gen_random_uuid(),
  brand_id     uuid references public.brands(id) on delete cascade,
  variant      text,
  storage_path text,
  uploaded_at  timestamptz default now()
);

alter table public.brand_logos enable row level security;
create policy "Authenticated full access to brand logos" on public.brand_logos
  for all using (auth.role() = 'authenticated');

-- CONTACT SUBMISSIONS
create table if not exists public.contact_submissions (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  company    text,
  email      text,
  message    text,
  created_at timestamptz default now()
);

alter table public.contact_submissions enable row level security;
create policy "Anon can insert contact submissions" on public.contact_submissions
  for insert with check (true);
create policy "Authenticated can read contact submissions" on public.contact_submissions
  for select using (auth.role() = 'authenticated');

-- ── Seed: company settings row ──────────────────────────────────
insert into public.company_settings (name, contact_email)
values ('StaatWright Solutions Ltd', 'contact@staatwright.co.za')
on conflict do nothing;

-- ── Seed: initial brands ────────────────────────────────────────
insert into public.brands (name, public_one_liner, show_on_public_site, public_sort_order, status)
values
  ('CAIRN Solutions',          'Enterprise workforce management, simplified.',        true, 1, 'active'),
  ('Concierge Styled',         'AI travel wardrobe planning — arrive impeccably.',   true, 2, 'active'),
  ('Airshot Base',             'Podcast production management for studios.',          true, 3, 'in_development'),
  ('KZN Youth Choirs',         'Administration platform for youth choral groups.',    true, 4, 'active'),
  ('In the Absence of a Soapbox', 'Author site and memoir platform for Kel Wright.', true, 5, 'active')
on conflict do nothing;

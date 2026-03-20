// ─── Company Settings ────────────────────────────────────────────────────────

export interface CompanySettings {
  id: string;
  name: string | null;
  reg_number: string | null;
  vat_number: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_path: string | null;
  bank_name: string | null;
  bank_account_holder: string | null;
  bank_account_number: string | null;
  bank_branch_code: string | null;
  bank_account_type: string | null;
  invoice_default_terms: string | null;
  invoice_default_notes: string | null;
  invoice_vat_rate: number;
  invoice_prefix: string;
  quote_prefix: string;
  cn_prefix: string;
  quote_validity_days: number;
  hero_tagline_1: string | null;
  hero_tagline_2: string | null;
  hero_subheading: string | null;
  service_1_title: string | null;
  service_1_body: string | null;
  service_2_title: string | null;
  service_2_body: string | null;
  service_3_title: string | null;
  service_3_body: string | null;
  contact_email: string | null;
  reminder_templates: Record<string, unknown> | null;
  updated_at: string;
}

// ─── Partners ────────────────────────────────────────────────────────────────

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
  relationship_type: string | null;
  status: string | null;
  founding_date: string | null;
  show_on_site: boolean;
  brand_id: string | null;
  tags: string[];
  notes_log: PartnerNote[];
  venture_ownership: VentureOwnership | null;
  external_billing: ExternalBillingRow[] | null;
  spec: PartnerSpec | null;
  created_at: string;
  updated_at: string;
}

export interface PartnerNote {
  text: string;
  created_at: string;
  initials: string;
}

export interface VentureOwnership {
  [ownerName: string]: {
    percentage: number;
    role: string;
    joined_date?: string;
    notes?: string;
  };
}

export interface ExternalBillingRow {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  type: "revenue" | "subscription_cost";
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

// ─── Documents ───────────────────────────────────────────────────────────────

export interface DocumentLineItem {
  id: string;
  type: "item" | "heading";
  description: string;
  qty?: number;
  unit_price?: number;
  vat_rate?: number;
  line_total?: number;
}

export type DocumentType = "invoice" | "quote" | "credit_note";
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled" | "partially_paid";
export type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "expired";
export type CreditNoteStatus = "draft" | "issued";
export type DocumentStatus = InvoiceStatus | QuoteStatus | CreditNoteStatus;

export interface Document {
  id: string;
  type: DocumentType;
  number: string;
  partner_id: string | null;
  partner?: Partner;
  status: DocumentStatus;
  issue_date: string | null;
  due_date: string | null;
  valid_until: string | null;
  line_items: DocumentLineItem[];
  subtotal: number | null;
  vat_total: number | null;
  total: number | null;
  notes: string | null;
  terms: string | null;
  pdf_path: string | null;
  currency: string | null;
  exchange_rate: number | null;
  zar_equivalent: number | null;
  vat_rate: number | null;
  payment_terms: string | null;
  linked_document_id: string | null;
  created_at: string;
  updated_at: string;
}

export type DocumentEventType = "created" | "sent" | "paid" | "status_changed" | "pdf_generated";

export interface DocumentEvent {
  id: string;
  document_id: string;
  document?: Document;
  event_type: DocumentEventType;
  detail: Record<string, unknown> | null;
  created_at: string;
  created_by: string | null;
}

// ─── Expenses ────────────────────────────────────────────────────────────────

export type ExpenseCategoryLegacy =
  | "Software"
  | "Hosting"
  | "Travel"
  | "Subcontractors"
  | "Equipment"
  | "Office"
  | "Other";

export interface Expense {
  id: string;
  date: string;
  description: string;
  category: string | null;
  amount_excl_vat: number | null;
  vat_amount: number | null;
  amount_incl_vat: number | null;
  slip_path: string | null;
  notes: string | null;
  partner_id: string | null;
  partner?: Partner;
  created_at: string;
  updated_at: string;
}

// ─── Files ───────────────────────────────────────────────────────────────────

export type FileNodeType = "folder" | "file";

export interface FileNode {
  id: string;
  name: string;
  type: FileNodeType;
  parent_id: string | null;
  storage_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// ─── Brands ──────────────────────────────────────────────────────────────────

export type BrandStatus = "active" | "archived" | "in_development";

export interface Brand {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  status: BrandStatus;
  live_url: string | null;
  show_on_public_site: boolean;
  public_one_liner: string | null;
  public_logo_variant: string | null;
  public_sort_order: number;
  public_slug: string | null;
  public_extended_description: string | null;
  public_show_case_study: boolean;
  hero_image_path: string | null;
  card_bg_color: string | null;
  heading_font: string | null;
  body_font: string | null;
  created_at: string;
  updated_at: string;
}

export type ColourRole = "primary" | "secondary" | "accent" | "background" | "text";

export interface BrandColour {
  id: string;
  brand_id: string;
  name: string | null;
  hex: string | null;
  role: ColourRole | null;
}

export type TypographyRole = "display" | "body" | "ui";
export type FontSource = "google" | "custom" | "system";

export interface BrandTypography {
  id: string;
  brand_id: string;
  font_name: string | null;
  weight: string | null;
  role: TypographyRole | null;
  source: FontSource | null;
}

export type LogoVariant = "primary" | "icon" | "dark" | "light" | "horizontal" | "stacked";

export interface BrandLogo {
  id: string;
  brand_id: string;
  variant: LogoVariant;
  storage_path: string;
  uploaded_at: string;
}

export interface BrandCardData extends Brand {
  brand_colours: BrandColour[];
  brand_logos: BrandLogo[];
}

// ─── Contact ─────────────────────────────────────────────────────────────────

export interface ContactSubmission {
  id: string;
  name: string | null;
  company: string | null;
  email: string | null;
  message: string | null;
  read: boolean;
  created_at: string;
}

// ─── Projects ────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  partner_id: string;
  name: string;
  status: "active" | "complete" | "on_hold" | "archived";
  start_date: string | null;
  end_date: string | null;
  budget_type: "fixed" | "time_and_materials" | "retainer" | "none" | null;
  budget_amount: number | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Time Logs ───────────────────────────────────────────────────────────────

export interface TimeLog {
  id: string;
  project_id: string | null;
  partner_id: string | null;
  owner_id: string | null;
  date: string;
  hours: number;
  description: string | null;
  billable: boolean;
  hourly_rate: number | null;
  calculated_value: number | null;
  created_at: string;
}

// ─── Equity ──────────────────────────────────────────────────────────────────

export type EquityEntryType =
  | "capital_injection"
  | "sweat_equity"
  | "distribution"
  | "loan_in"
  | "loan_out"
  | "repayment";

export interface EquityEntry {
  id: string;
  entry_type: EquityEntryType;
  owner_id: string | null;
  partner_id: string | null;
  project_id: string | null;
  date: string;
  description: string;
  category: string | null;
  hours: number | null;
  hourly_rate_used: number | null;
  amount: number;
  currency: string | null;
  notes: string | null;
  created_at: string;
}

// ─── Retainers ───────────────────────────────────────────────────────────────

export interface Retainer {
  id: string;
  partner_id: string;
  project_id: string | null;
  name: string;
  monthly_amount: number;
  invoice_day: number;
  currency: string;
  services_description: string | null;
  start_date: string;
  end_date: string | null;
  status: "active" | "paused" | "cancelled";
  last_invoice_date: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Invoice Payments ────────────────────────────────────────────────────────

export interface InvoicePayment {
  id: string;
  document_id: string;
  amount: number;
  payment_date: string;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

// ─── Drawings ────────────────────────────────────────────────────────────────

export interface Drawing {
  id: string;
  owner_id: string | null;
  date: string;
  amount: number;
  method: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

// ─── Expense Categories ──────────────────────────────────────────────────────

export interface ExpenseCategory {
  id: string;
  name: string;
  parent_category: string | null;
  is_deductible: boolean;
  deductibility_notes: string | null;
  requires_documentation: boolean;
  sort_order: number;
  is_archived: boolean;
}

// ─── Owner Settings ──────────────────────────────────────────────────────────

export interface OwnerSettings {
  id: string;
  user_id: string;
  display_name: string | null;
  initials: string | null;
  hourly_rate: number | null;
  updated_at: string;
}

// ─── Expense Inbox ───────────────────────────────────────────────────────────

export interface ExpenseInboxItem {
  id: string;
  status: "pending" | "approved" | "rejected";
  raw_image_path: string | null;
  ai_vendor_name: string | null;
  ai_date: string | null;
  ai_total_amount: number | null;
  ai_vat_amount: number | null;
  ai_currency: string | null;
  ai_suggested_category: string | null;
  ai_confidence: number | null;
  ai_notes: string | null;
  vendor_name: string | null;
  expense_date: string | null;
  total_amount: number | null;
  vat_amount: number | null;
  currency: string;
  category: string | null;
  notes: string | null;
  expense_id: string | null;
  reviewed_at: string | null;
  created_at: string;
}

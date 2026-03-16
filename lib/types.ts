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
  updated_at: string;
}

export interface Client {
  id: string;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  vat_number: string | null;
  tags: string[];
  notes: ClientNote[];
  created_at: string;
  updated_at: string;
}

export interface ClientNote {
  text: string;
  created_at: string;
  initials: string;
}

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
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";
export type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "expired";
export type CreditNoteStatus = "draft" | "issued";
export type DocumentStatus = InvoiceStatus | QuoteStatus | CreditNoteStatus;

export interface Document {
  id: string;
  type: DocumentType;
  number: string;
  client_id: string | null;
  client?: Client;
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

export type ExpenseCategory =
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
  category: ExpenseCategory | null;
  amount_excl_vat: number | null;
  vat_amount: number | null;
  amount_incl_vat: number | null;
  slip_path: string | null;
  notes: string | null;
  client_id: string | null;
  client?: Client;
  created_at: string;
  updated_at: string;
}

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

export interface ContactSubmission {
  id: string;
  name: string | null;
  company: string | null;
  email: string | null;
  message: string | null;
  created_at: string;
}

"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, GripVertical, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Document, DocumentLineItem, Partner, CompanySettings } from "@/lib/types";
import { formatZAR } from "@/lib/utils";

// ─── VAT + payment terms config ─────────────────────────────────────────────

const VAT_OPTIONS = [
  { label: "15% (Standard)", value: 0.15 },
  { label: "0% (Zero-rated)", value: 0 },
  { label: "Exempt", value: -1 },
] as const;

const PAYMENT_TERMS_OPTIONS = [
  { label: "Net 7",  value: "Net 7",  days: 7 },
  { label: "Net 14", value: "Net 14", days: 14 },
  { label: "Net 30", value: "Net 30", days: 30 },
  { label: "Net 60", value: "Net 60", days: 60 },
  { label: "COD",    value: "COD",    days: 0 },
  { label: "EOM",    value: "EOM",    days: null },
  { label: "Custom", value: "Custom", days: null },
] as const;

type PaymentTermsValue = (typeof PAYMENT_TERMS_OPTIONS)[number]["value"];

function calcDueDateFromTerms(issueDate: string, terms: PaymentTermsValue): string {
  if (!issueDate) return issueDate;
  if (terms === "COD") return issueDate;
  if (terms === "Custom") return issueDate;
  if (terms === "EOM") {
    const d = new Date(issueDate);
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  }
  const opt = PAYMENT_TERMS_OPTIONS.find((o) => o.value === terms);
  if (opt && opt.days != null) return addDays(issueDate, opt.days);
  return issueDate;
}

// ─── currency config ────────────────────────────────────────────────────────

const CURRENCIES = [
  { code: "ZAR", label: "ZAR — South African Rand" },
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British Pound" },
] as const;

type CurrencyCode = (typeof CURRENCIES)[number]["code"];

// ─── helpers ────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function newLineItem(itemType: "item" | "heading"): DocumentLineItem {
  return {
    id: crypto.randomUUID(),
    type: itemType,
    description: "",
    qty: itemType === "item" ? 1 : undefined,
    unit_price: itemType === "item" ? 0 : undefined,
    vat_rate: itemType === "item" ? 15 : undefined,
    line_total: 0,
  };
}

function recalcItem(item: DocumentLineItem): DocumentLineItem {
  if (item.type !== "item") return item;
  const line_total = (item.qty ?? 0) * (item.unit_price ?? 0);
  return { ...item, line_total };
}

function calcTotals(items: DocumentLineItem[], docVatRate?: number) {
  let subtotal = 0;
  let vat_total = 0;
  for (const it of items) {
    if (it.type === "item") {
      subtotal += it.line_total ?? 0;
      if (docVatRate !== undefined) {
        if (docVatRate > 0) {
          vat_total += (it.line_total ?? 0) * docVatRate;
        }
      } else {
        vat_total += ((it.line_total ?? 0) * (it.vat_rate ?? 0)) / 100;
      }
    }
  }
  return { subtotal, vat_total, total: subtotal + vat_total };
}

const TYPE_META: Record<
  "invoice" | "quote" | "credit_note",
  {
    label: string;
    segment: string;
    prefixKey: keyof CompanySettings;
    statuses: string[];
    secondDateLabel: string;
  }
> = {
  invoice: {
    label: "Invoice",
    segment: "invoices",
    prefixKey: "invoice_prefix",
    statuses: ["draft", "sent", "paid", "overdue", "cancelled", "partially_paid"],
    secondDateLabel: "Due Date",
  },
  quote: {
    label: "Quote",
    segment: "quotes",
    prefixKey: "quote_prefix",
    statuses: ["draft", "sent", "accepted", "declined", "expired"],
    secondDateLabel: "Valid Until",
  },
  credit_note: {
    label: "Credit Note",
    segment: "credit-notes",
    prefixKey: "cn_prefix",
    statuses: ["draft", "issued"],
    secondDateLabel: "Due Date",
  },
};

// ─── types ───────────────────────────────────────────────────────────────────

export interface SimpleInvoice {
  id: string;
  number: string;
  partner_id: string | null;
  venture_id: string | null;
  total: number | null;
  status: string;
}

export interface SimpleQuote {
  id: string;
  number: string;
  partner_id: string | null;
  venture_id: string | null;
  line_items: DocumentLineItem[];
  subtotal: number | null;
  total: number | null;
}

// ─── sub-components ──────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="block text-xs text-[#5C6E81] uppercase tracking-wider mb-1 font-medium"
      style={{ fontFamily: "var(--font-montserrat)" }}
    >
      {children}
    </label>
  );
}

const inputCls =
  "w-full border border-[#EAE4DC] bg-white px-3 py-2 text-sm text-[#1A1A1A] focus:outline-none focus:border-[#5C6E81] transition-colors";

const selectCls =
  "w-full border border-[#EAE4DC] bg-white px-3 py-2 text-sm text-[#1A1A1A] focus:outline-none focus:border-[#5C6E81] transition-colors appearance-none";

// ─── props ───────────────────────────────────────────────────────────────────

export interface DocumentBuilderProps {
  type: "invoice" | "quote" | "credit_note";
  initialDoc?: Document;
  initialVentureId?: string;
  initialClientId?: string;
  initialPartnerId?: string;
  // Preferred: pre-split lists
  ventures?: Partner[];
  clients?: Partner[];
  // Legacy fallback: all partners (will be split internally)
  partners?: Partner[];
  settings: CompanySettings;
  // For credit_note mode: invoices to link against
  availableInvoices?: SimpleInvoice[];
  // For invoice mode: accepted quotes available to link
  acceptedQuotes?: SimpleQuote[];
}

// ─── component ───────────────────────────────────────────────────────────────

export default function DocumentBuilder({
  type,
  initialDoc,
  initialVentureId,
  initialClientId,
  initialPartnerId,
  ventures: venturesProp,
  clients: clientsProp,
  partners,
  settings,
  availableInvoices,
  acceptedQuotes,
}: DocumentBuilderProps) {
  // Split partners if not provided separately
  const ventureList = venturesProp ?? (partners ?? []).filter((p) => p.type === "venture");
  const clientList = clientsProp ?? (partners ?? []).filter((p) => p.type === "client");

  const router = useRouter();
  const meta = TYPE_META[type];
  const isNew = !initialDoc;

  const defaultIssue = initialDoc?.issue_date ?? todayISO();
  const defaultSecondDate =
    type === "invoice"
      ? (initialDoc?.due_date ?? addDays(defaultIssue, 30))
      : type === "quote"
      ? (initialDoc?.valid_until ?? addDays(defaultIssue, settings.quote_validity_days ?? 30))
      : (initialDoc?.due_date ?? addDays(defaultIssue, 30));

  // ── venture state ───────────────────────────────────────────────────────────
  const [ventureId, setVentureId] = useState(
    initialDoc?.venture_id ?? initialVentureId ?? ""
  );

  // ── client (bill-to) state ──────────────────────────────────────────────────
  const [partnerId, setPartnerId] = useState(
    initialDoc?.partner_id ?? initialPartnerId ?? initialClientId ?? ""
  );

  // ── linked document state (quote→invoice, invoice→credit_note) ─────────────
  const [linkedDocId, setLinkedDocId] = useState(
    initialDoc?.linked_document_id ?? ""
  );
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [pendingQuoteItems, setPendingQuoteItems] = useState<DocumentLineItem[]>([]);

  const [issueDate, setIssueDate] = useState(defaultIssue);
  const [secondDate, setSecondDate] = useState(defaultSecondDate);
  const [status, setStatus] = useState<string>(initialDoc?.status ?? "draft");
  const [lineItems, setLineItems] = useState<DocumentLineItem[]>(
    initialDoc?.line_items?.length ? initialDoc.line_items : [newLineItem("item")]
  );
  const [notes, setNotes] = useState(
    initialDoc?.notes ?? settings.invoice_default_notes ?? ""
  );
  const [terms, setTerms] = useState(
    initialDoc?.terms ?? settings.invoice_default_terms ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const docAnyVat = initialDoc as (Document & { vat_rate?: number; payment_terms?: string }) | undefined;
  const [vatRate, setVatRate] = useState<number>(
    docAnyVat?.vat_rate !== undefined ? docAnyVat.vat_rate : 0.15
  );
  const [paymentTerms, setPaymentTerms] = useState<PaymentTermsValue>(
    (docAnyVat?.payment_terms as PaymentTermsValue) ?? "Net 30"
  );

  const docAny = initialDoc as (Document & { currency?: string; exchange_rate?: number; zar_equivalent?: number }) | undefined;
  const [currency, setCurrency] = useState<CurrencyCode>(
    (docAny?.currency as CurrencyCode) ?? "ZAR"
  );
  const [exchangeRate, setExchangeRate] = useState<string>(
    docAny?.exchange_rate != null ? String(docAny.exchange_rate) : ""
  );

  // ── derived ─────────────────────────────────────────────────────────────────
  const { subtotal, vat_total, total } = calcTotals(lineItems, vatRate);

  const selectedVenture = ventureList.find((v) => v.id === ventureId) ?? null;
  const ventureMissingBrand = !!selectedVenture && !selectedVenture.brand_id;

  // For credit note: when an invoice is selected, lock the venture + client
  const cnLocked = type === "credit_note" && !!linkedDocId;

  // Banking to display in sidebar: venture's bank details, fallback to company settings
  const bankSource =
    selectedVenture?.bank_name
      ? {
          bank_name: selectedVenture.bank_name,
          bank_account_holder: selectedVenture.bank_account_holder,
          bank_account_number: selectedVenture.bank_account_number,
          bank_branch_code: selectedVenture.bank_branch_code,
          bank_account_type: selectedVenture.bank_account_type,
        }
      : {
          bank_name: settings.bank_name,
          bank_account_holder: settings.bank_account_holder,
          bank_account_number: settings.bank_account_number,
          bank_branch_code: settings.bank_branch_code,
          bank_account_type: settings.bank_account_type,
        };

  // Accepted quotes filtered to selected client (for invoice linking)
  const filteredQuotes = (acceptedQuotes ?? []).filter(
    (q) => !partnerId || q.partner_id === partnerId
  );

  // ── line item mutations ─────────────────────────────────────────────────────
  const updateItem = useCallback(
    (id: string, patch: Partial<DocumentLineItem>) => {
      setLineItems((prev) =>
        prev.map((it) => (it.id === id ? recalcItem({ ...it, ...patch }) : it))
      );
    },
    []
  );

  const removeItem = useCallback((id: string) => {
    setLineItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const addItem = useCallback(() => {
    setLineItems((prev) => [...prev, newLineItem("item")]);
  }, []);

  const addHeading = useCallback(() => {
    setLineItems((prev) => [...prev, newLineItem("heading")]);
  }, []);

  // ── linked invoice handler (credit notes) ───────────────────────────────────
  function handleInvoiceLink(invoiceId: string) {
    setLinkedDocId(invoiceId);
    const inv = availableInvoices?.find((i) => i.id === invoiceId);
    if (inv) {
      if (inv.partner_id) setPartnerId(inv.partner_id);
      if (inv.venture_id) setVentureId(inv.venture_id);
    }
  }

  // ── linked quote handler (invoices) ────────────────────────────────────────
  function handleQuoteLink(quoteId: string) {
    if (!quoteId) { setLinkedDocId(""); return; }
    const q = acceptedQuotes?.find((x) => x.id === quoteId);
    if (!q) { setLinkedDocId(quoteId); return; }
    setLinkedDocId(quoteId);
    const hasExistingItems =
      lineItems.length > 1 ||
      (lineItems.length === 1 && (lineItems[0].description?.trim() || (lineItems[0].unit_price ?? 0) > 0));
    if (hasExistingItems) {
      setPendingQuoteItems(q.line_items ?? []);
      setShowImportDialog(true);
    } else {
      setLineItems(q.line_items?.length ? q.line_items : [newLineItem("item")]);
    }
  }

  // ── number generation ───────────────────────────────────────────────────────
  async function generateNumber(supabase: ReturnType<typeof createClient>) {
    const prefix = (settings[meta.prefixKey] as string) ?? type.toUpperCase().slice(0, 2);
    const { count } = await supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("type", type);
    const next = (count ?? 0) + 1;
    return `${prefix}-${String(next).padStart(4, "0")}`;
  }

  // ── save ────────────────────────────────────────────────────────────────────
  async function handleSave(saveStatus: string) {
    setError(null);

    if (isNew && !ventureId) {
      setError("Please select a venture before saving.");
      return;
    }
    if (isNew && type !== "credit_note" && !partnerId) {
      setError("Please select a client to bill to before saving.");
      return;
    }
    if (isNew && type === "credit_note" && !linkedDocId) {
      setError("Please select the invoice this credit note is issued against.");
      return;
    }

    setSaving(true);

    try {
      const supabase = createClient();

      const parsedExchangeRate = currency !== "ZAR" && exchangeRate ? parseFloat(exchangeRate) : null;
      const zarEquivalent = parsedExchangeRate ? total * parsedExchangeRate : null;

      const payload = {
        type,
        partner_id: partnerId || null,
        venture_id: ventureId || null,
        linked_document_id: linkedDocId || null,
        status: saveStatus,
        issue_date: issueDate || null,
        due_date: type !== "quote" ? (secondDate || null) : null,
        valid_until: type === "quote" ? (secondDate || null) : null,
        line_items: lineItems,
        subtotal,
        vat_total,
        total,
        vat_rate: vatRate,
        vat_amount: vat_total,
        payment_terms: paymentTerms,
        notes: notes || null,
        terms: terms || null,
        currency: currency !== "ZAR" ? currency : "ZAR",
        exchange_rate: parsedExchangeRate,
        zar_equivalent: zarEquivalent,
        updated_at: new Date().toISOString(),
      };

      if (isNew) {
        const number = await generateNumber(supabase);
        const { data, error: insertErr } = await supabase
          .from("documents")
          .insert({ ...payload, number })
          .select("id")
          .single();

        if (insertErr) throw insertErr;

        if (saveStatus !== "draft") {
          await supabase.from("document_events").insert({
            document_id: data.id,
            event_type: "status_changed",
            detail: { from: "draft", to: saveStatus },
          });
        }

        router.push(`/admin/${meta.segment}/${data.id}`);
      } else {
        const previousStatus = initialDoc!.status;

        const { error: updateErr } = await supabase
          .from("documents")
          .update(payload)
          .eq("id", initialDoc!.id);

        if (updateErr) throw updateErr;

        if (previousStatus !== saveStatus) {
          await supabase.from("document_events").insert({
            document_id: initialDoc!.id,
            event_type: saveStatus === "paid" ? "paid" : "status_changed",
            detail: { from: previousStatus, to: saveStatus },
          });
        }

        router.refresh();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkPaid() {
    await handleSave("paid");
  }

  // ─── render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Import dialog ── */}
      {showImportDialog && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
        >
          <div
            className="bg-white border border-[#EAE4DC] p-6 max-w-sm w-full mx-4 space-y-4"
            style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
          >
            <p className="text-sm font-semibold text-[#1F2A38]" style={{ fontFamily: "var(--font-inter)" }}>
              Import quote line items
            </p>
            <p className="text-sm text-[#5C6E81]">
              This invoice already has line items. What would you like to do?
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setLineItems(pendingQuoteItems.length ? pendingQuoteItems : [newLineItem("item")]);
                  setShowImportDialog(false);
                }}
                className="w-full px-4 py-2.5 bg-[#1F2A38] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                style={{ borderRadius: 0 }}
              >
                Replace existing items
              </button>
              <button
                type="button"
                onClick={() => {
                  setLineItems((prev) => [...prev, ...(pendingQuoteItems.length ? pendingQuoteItems : [])]);
                  setShowImportDialog(false);
                }}
                className="w-full px-4 py-2.5 border border-[#1F2A38] text-[#1F2A38] text-sm font-semibold hover:bg-[#1F2A38] hover:text-white transition-colors"
                style={{ borderRadius: 0 }}
              >
                Append to existing
              </button>
              <button
                type="button"
                onClick={() => { setLinkedDocId(""); setShowImportDialog(false); }}
                className="w-full px-4 py-2 text-xs text-[#5C6E81] hover:text-[#1F2A38] transition-colors"
                style={{ borderRadius: 0 }}
              >
                Cancel — don&apos;t link
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-6 items-start">
        {/* ── Left: Editor ── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* ── Venture + Client + Dates ── */}
          <div className="bg-white border border-[#EAE4DC] p-6 space-y-4" style={{ borderRadius: 0 }}>

            {/* Venture selector */}
            <div>
              <FieldLabel>Issued From (Venture) *</FieldLabel>
              <select
                className={selectCls}
                style={{ borderRadius: 0 }}
                value={ventureId}
                onChange={(e) => setVentureId(e.target.value)}
                disabled={cnLocked}
              >
                <option value="">— Select venture —</option>
                {ventureList.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.company_name}
                  </option>
                ))}
              </select>
              {ventureList.length === 0 && (
                <p className="mt-1 text-xs text-[#5C6E81]" style={{ fontFamily: "var(--font-montserrat)" }}>
                  No ventures found. Add a venture in the Partners section first.
                </p>
              )}
            </div>

            {/* No-brand warning */}
            {ventureMissingBrand && (
              <div
                className="flex items-start gap-2 p-3 text-sm"
                style={{
                  backgroundColor: "#fef3c7",
                  border: "1px solid #fbbf24",
                  borderRadius: 0,
                  fontFamily: "var(--font-montserrat)",
                }}
              >
                <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                <span className="text-amber-800 text-xs">
                  This venture has no brand set up. The invoice will use StaatWright&apos;s default branding.
                  Set up a brand in the venture&apos;s <strong>Brand &amp; Identity</strong> tab.
                </span>
              </div>
            )}

            <div className="border-t border-[#EAE4DC] pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Bill To (clients only) */}
              <div className="sm:col-span-1">
                <FieldLabel>
                  {type === "credit_note" ? "Client (from linked invoice)" : "Bill To (Client) *"}
                </FieldLabel>
                <select
                  className={selectCls}
                  style={{ borderRadius: 0 }}
                  value={partnerId}
                  onChange={(e) => setPartnerId(e.target.value)}
                  disabled={cnLocked}
                >
                  <option value="">— Select client —</option>
                  {clientList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Issue date */}
              <div>
                <FieldLabel>Issue Date</FieldLabel>
                <input
                  type="date"
                  className={inputCls}
                  style={{ borderRadius: 0 }}
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>

              {/* Due / Valid Until */}
              <div>
                <FieldLabel>{meta.secondDateLabel}</FieldLabel>
                <input
                  type="date"
                  className={inputCls}
                  style={{ borderRadius: 0 }}
                  value={secondDate}
                  onChange={(e) => setSecondDate(e.target.value)}
                />
              </div>
            </div>

            {/* Linked invoice (credit notes) */}
            {type === "credit_note" && (
              <div>
                <FieldLabel>Credit Against Invoice *</FieldLabel>
                <select
                  className={selectCls}
                  style={{ borderRadius: 0 }}
                  value={linkedDocId}
                  onChange={(e) => handleInvoiceLink(e.target.value)}
                >
                  <option value="">— Select invoice —</option>
                  {(availableInvoices ?? []).map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.number} — {formatZAR(inv.total ?? 0)} ({inv.status})
                    </option>
                  ))}
                </select>
                {!availableInvoices?.length && (
                  <p className="mt-1 text-xs text-[#5C6E81]" style={{ fontFamily: "var(--font-montserrat)" }}>
                    No invoices available. Credit notes must be linked to a sent or paid invoice.
                  </p>
                )}
              </div>
            )}

            {/* Linked quote (invoices only) */}
            {type === "invoice" && !!acceptedQuotes?.length && (
              <div>
                <FieldLabel>Created From Quote (optional)</FieldLabel>
                <select
                  className={selectCls}
                  style={{ borderRadius: 0 }}
                  value={linkedDocId}
                  onChange={(e) => handleQuoteLink(e.target.value)}
                >
                  <option value="">— None —</option>
                  {filteredQuotes.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.number} — {formatZAR(q.total ?? 0)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Status */}
            <div className="max-w-xs">
              <FieldLabel>Status</FieldLabel>
              <select
                className={selectCls}
                style={{ borderRadius: 0 }}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {meta.statuses.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            {/* VAT Rate + Payment Terms */}
            <div className="border-t border-[#EAE4DC] pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel>VAT Rate</FieldLabel>
                <select
                  className={selectCls}
                  style={{ borderRadius: 0 }}
                  value={String(vatRate)}
                  onChange={(e) => setVatRate(parseFloat(e.target.value))}
                >
                  {VAT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {type === "invoice" && (
                <div>
                  <FieldLabel>Payment Terms</FieldLabel>
                  <select
                    className={selectCls}
                    style={{ borderRadius: 0 }}
                    value={paymentTerms}
                    onChange={(e) => {
                      const t = e.target.value as PaymentTermsValue;
                      setPaymentTerms(t);
                      if (t !== "Custom") {
                        setSecondDate(calcDueDateFromTerms(issueDate, t));
                      }
                    }}
                  >
                    {PAYMENT_TERMS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Currency (invoices only) */}
            {type === "invoice" && (
              <div className="border-t border-[#EAE4DC] pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <FieldLabel>Currency</FieldLabel>
                  <select
                    className={selectCls}
                    style={{ borderRadius: 0 }}
                    value={currency}
                    onChange={(e) => {
                      setCurrency(e.target.value as CurrencyCode);
                      if (e.target.value === "ZAR") setExchangeRate("");
                    }}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {currency !== "ZAR" && (
                  <>
                    <div>
                      <FieldLabel>Exchange Rate (1 {currency} = R __ ZAR)</FieldLabel>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        className={inputCls}
                        style={{ borderRadius: 0 }}
                        value={exchangeRate}
                        onChange={(e) => setExchangeRate(e.target.value)}
                        placeholder="e.g. 18.50"
                      />
                      <p className="mt-1 text-xs text-[#5C6E81]" style={{ fontFamily: "var(--font-montserrat)" }}>
                        Rate will be locked when document is saved
                      </p>
                    </div>
                    <div className="flex flex-col justify-end pb-1">
                      {exchangeRate && parseFloat(exchangeRate) > 0 && (
                        <p className="text-sm font-semibold text-[#1F2A38]" style={{ fontFamily: "var(--font-montserrat)" }}>
                          ≈ {formatZAR(total * parseFloat(exchangeRate))} ZAR
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── Line items ── */}
          <div className="bg-white border border-[#EAE4DC]" style={{ borderRadius: 0 }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
                <thead>
                  <tr className="border-b border-[#EAE4DC]" style={{ backgroundColor: "rgba(234,228,220,0.5)" }}>
                    <th className="px-3 py-3 w-6" />
                    <th className="text-left px-3 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">
                      Description
                    </th>
                    <th className="text-right px-3 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium w-20">
                      Qty
                    </th>
                    <th className="text-right px-3 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium w-28">
                      Unit Price
                    </th>
                    <th className="text-right px-3 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium w-20">
                      VAT %
                    </th>
                    <th className="text-right px-3 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium w-28">
                      Total
                    </th>
                    <th className="px-3 py-3 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, idx) =>
                    item.type === "heading" ? (
                      <tr key={item.id} className="border-b border-[#EAE4DC] bg-[#F3F2EE]/50">
                        <td className="px-3 py-2 text-[#5C6E81]">
                          <GripVertical size={14} className="opacity-40" />
                        </td>
                        <td colSpan={5} className="px-3 py-2">
                          <input
                            type="text"
                            placeholder="Section heading…"
                            className="w-full bg-transparent border-none outline-none text-sm font-semibold text-[#1F2A38]"
                            style={{ fontFamily: "var(--font-inter)" }}
                            value={item.description}
                            onChange={(e) => updateItem(item.id, { description: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="text-[#5C6E81] hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ) : (
                      <tr
                        key={item.id}
                        className="border-b border-[#EAE4DC] last:border-0 hover:bg-[#EAE4DC]/10 transition-colors"
                      >
                        <td className="px-3 py-2 text-[#5C6E81]">
                          <GripVertical size={14} className="opacity-40" />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            placeholder={`Line item ${idx + 1}…`}
                            className="w-full bg-transparent border-none outline-none text-sm text-[#1A1A1A]"
                            style={{ fontFamily: "var(--font-montserrat)" }}
                            value={item.description}
                            onChange={(e) => updateItem(item.id, { description: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number" min={0} step="any"
                            className="w-full bg-transparent border-none outline-none text-sm text-right text-[#1A1A1A]"
                            style={{ fontFamily: "var(--font-montserrat)" }}
                            value={item.qty ?? ""}
                            onChange={(e) =>
                              updateItem(item.id, { qty: e.target.value === "" ? 0 : parseFloat(e.target.value) })
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number" min={0} step="any"
                            className="w-full bg-transparent border-none outline-none text-sm text-right text-[#1A1A1A]"
                            style={{ fontFamily: "var(--font-montserrat)" }}
                            value={item.unit_price ?? ""}
                            onChange={(e) =>
                              updateItem(item.id, { unit_price: e.target.value === "" ? 0 : parseFloat(e.target.value) })
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number" min={0} max={100} step="any"
                            className="w-full bg-transparent border-none outline-none text-sm text-right text-[#1A1A1A]"
                            style={{ fontFamily: "var(--font-montserrat)" }}
                            value={item.vat_rate ?? ""}
                            onChange={(e) =>
                              updateItem(item.id, { vat_rate: e.target.value === "" ? 0 : parseFloat(e.target.value) })
                            }
                          />
                        </td>
                        <td className="px-3 py-2 text-right text-[#1A1A1A] text-sm whitespace-nowrap">
                          {formatZAR(item.line_total ?? 0)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="text-[#5C6E81] hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 border-t border-[#EAE4DC] flex gap-3">
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1.5 text-xs text-[#5C6E81] hover:text-[#1F2A38] transition-colors font-medium"
                style={{ fontFamily: "var(--font-montserrat)" }}
              >
                <Plus size={13} />
                Add Item
              </button>
              <span className="text-[#EAE4DC]">|</span>
              <button
                type="button"
                onClick={addHeading}
                className="flex items-center gap-1.5 text-xs text-[#5C6E81] hover:text-[#1F2A38] transition-colors font-medium"
                style={{ fontFamily: "var(--font-montserrat)" }}
              >
                <Plus size={13} />
                Add Section Heading
              </button>
            </div>
          </div>

          {/* ── Totals ── */}
          <div className="flex justify-end">
            <div
              className="bg-white border border-[#EAE4DC] p-5 space-y-2 min-w-[260px]"
              style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
            >
              <div className="flex justify-between text-sm text-[#5C6E81]">
                <span>Subtotal (excl. VAT)</span>
                <span>{formatZAR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-[#5C6E81]">
                <span>
                  {vatRate === -1
                    ? "VAT (Exempt)"
                    : vatRate === 0
                    ? "VAT (Zero-rated)"
                    : `VAT (${Math.round(vatRate * 100)}%)`}
                </span>
                <span>{formatZAR(vat_total)}</span>
              </div>
              <div className="border-t border-[#EAE4DC] pt-2 flex justify-between text-sm font-bold text-[#1F2A38]">
                <span>Total (incl. VAT)</span>
                <span>{formatZAR(total)}</span>
              </div>
            </div>
          </div>

          {/* ── Notes & Terms ── */}
          <div className="bg-white border border-[#EAE4DC] p-6 space-y-4" style={{ borderRadius: 0 }}>
            <div>
              <FieldLabel>Notes</FieldLabel>
              <textarea
                rows={3}
                className={`${inputCls} resize-y`}
                style={{ borderRadius: 0 }}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes visible to the client…"
              />
            </div>
            <div>
              <FieldLabel>Terms &amp; Conditions</FieldLabel>
              <textarea
                rows={4}
                className={`${inputCls} resize-y`}
                style={{ borderRadius: 0 }}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Payment terms and conditions…"
              />
            </div>
          </div>
        </div>

        {/* ── Right: Sidebar ── */}
        <div className="w-72 shrink-0 space-y-4">
          {/* Doc number */}
          <div className="bg-white border border-[#EAE4DC] p-5" style={{ borderRadius: 0 }}>
            <p className="text-xs text-[#5C6E81] uppercase tracking-wider mb-1 font-medium" style={{ fontFamily: "var(--font-montserrat)" }}>
              {meta.label} Number
            </p>
            <p className="text-[#1F2A38] font-bold text-lg" style={{ fontFamily: "var(--font-inter)" }}>
              {initialDoc?.number ?? (
                <span className="text-[#5C6E81] font-normal text-sm">Will be assigned on save</span>
              )}
            </p>
          </div>

          {/* Venture info summary */}
          {selectedVenture && (
            <div className="bg-white border border-[#EAE4DC] p-5" style={{ borderRadius: 0 }}>
              <p className="text-xs text-[#5C6E81] uppercase tracking-wider mb-2 font-medium" style={{ fontFamily: "var(--font-montserrat)" }}>
                Issuing Venture
              </p>
              <p className="text-sm font-semibold text-[#1F2A38]" style={{ fontFamily: "var(--font-inter)" }}>
                {selectedVenture.company_name}
              </p>
              {selectedVenture.email && (
                <p className="text-xs text-[#5C6E81] mt-1" style={{ fontFamily: "var(--font-montserrat)" }}>
                  {selectedVenture.email}
                </p>
              )}
              {selectedVenture.vat_number && (
                <p className="text-xs text-[#5C6E81]" style={{ fontFamily: "var(--font-montserrat)" }}>
                  VAT: {selectedVenture.vat_number}
                </p>
              )}
            </div>
          )}

          {/* Banking details */}
          <div className="bg-white border border-[#EAE4DC] p-5" style={{ borderRadius: 0 }}>
            <p className="text-xs text-[#5C6E81] uppercase tracking-wider mb-3 font-medium" style={{ fontFamily: "var(--font-montserrat)" }}>
              Banking Details
              {selectedVenture?.bank_name && (
                <span className="ml-2 normal-case text-[10px] text-[#5C6E81]">
                  (from venture)
                </span>
              )}
            </p>
            <dl className="space-y-1.5 text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
              {[
                ["Bank", bankSource.bank_name],
                ["Account Holder", bankSource.bank_account_holder],
                ["Account Number", bankSource.bank_account_number],
                ["Branch Code", bankSource.bank_branch_code],
                ["Account Type", bankSource.bank_account_type],
              ].map(([label, value]) =>
                value ? (
                  <div key={label} className="flex flex-col">
                    <dt className="text-xs text-[#5C6E81]">{label}</dt>
                    <dd className="text-[#1A1A1A]">{value}</dd>
                  </div>
                ) : null
              )}
              {!bankSource.bank_name && !bankSource.bank_account_number && (
                <p className="text-xs text-[#5C6E81] italic">
                  No banking details configured.
                  {selectedVenture
                    ? " Add them in the venture's Billing tab."
                    : " Add them in Company Settings."}
                </p>
              )}
            </dl>
          </div>

          {/* Error */}
          {error && (
            <div
              className="bg-red-50 border border-red-200 p-4 text-sm text-red-700"
              style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
            >
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave("draft")}
              className="w-full px-4 py-2.5 border border-[#1F2A38] text-[#1F2A38] text-sm font-semibold hover:bg-[#1F2A38] hover:text-white transition-colors disabled:opacity-50"
              style={{ borderRadius: 0, fontFamily: "var(--font-inter)" }}
            >
              {saving ? "Saving…" : "Save Draft"}
            </button>

            {(isNew || status === "draft") && (
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave("sent")}
                className="w-full px-4 py-2.5 bg-[#1F2A38] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ borderRadius: 0, fontFamily: "var(--font-inter)" }}
              >
                {saving ? "Saving…" : "Save & Mark Sent"}
              </button>
            )}

            {type === "invoice" && (status === "sent" || status === "overdue") && (
              <button
                type="button"
                disabled={saving}
                onClick={handleMarkPaid}
                className="w-full px-4 py-2.5 bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                style={{ borderRadius: 0, fontFamily: "var(--font-inter)" }}
              >
                {saving ? "Saving…" : "Mark as Paid"}
              </button>
            )}

            {!isNew && (
              <a
                href={`/admin/${meta.segment}/${initialDoc!.id}/print`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-4 py-2.5 border border-[#EAE4DC] text-[#5C6E81] text-sm font-semibold hover:border-[#5C6E81] hover:text-[#1F2A38] transition-colors text-center"
                style={{ borderRadius: 0, fontFamily: "var(--font-inter)" }}
              >
                Download / Print
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

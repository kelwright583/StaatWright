"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, GripVertical } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Document, DocumentLineItem, Partner, CompanySettings } from "@/lib/types";

// ─── currency config ────────────────────────────────────────────────────────

const CURRENCIES = [
  { code: "ZAR", label: "ZAR — South African Rand" },
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British Pound" },
] as const;

type CurrencyCode = (typeof CURRENCIES)[number]["code"];

// ─── helpers ────────────────────────────────────────────────────────────────

function formatZAR(amount: number): string {
  return `R ${amount.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

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

function calcTotals(items: DocumentLineItem[]) {
  let subtotal = 0;
  let vat_total = 0;
  for (const it of items) {
    if (it.type === "item") {
      subtotal += it.line_total ?? 0;
      vat_total += ((it.line_total ?? 0) * (it.vat_rate ?? 0)) / 100;
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
    statuses: ["draft", "sent", "paid", "overdue", "cancelled"],
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
  initialClientId?: string;
  initialPartnerId?: string;
  clients?: Partner[];
  partners?: Partner[];
  settings: CompanySettings;
}

// ─── component ───────────────────────────────────────────────────────────────

export default function DocumentBuilder({
  type,
  initialDoc,
  initialClientId,
  initialPartnerId,
  clients,
  partners,
  settings,
}: DocumentBuilderProps) {
  // Support both old "clients" prop and new "partners" prop
  const partnerList = partners ?? clients ?? [];
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

  const [clientId, setClientId] = useState(
    initialDoc?.partner_id ?? initialDoc?.client_id ?? initialPartnerId ?? initialClientId ?? ""
  );
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

  // ── multi-currency ──────────────────────────────────────────────────────────
  const docAny = initialDoc as (Document & { currency?: string; exchange_rate?: number; zar_equivalent?: number }) | undefined;
  const [currency, setCurrency] = useState<CurrencyCode>(
    (docAny?.currency as CurrencyCode) ?? "ZAR"
  );
  const [exchangeRate, setExchangeRate] = useState<string>(
    docAny?.exchange_rate != null ? String(docAny.exchange_rate) : ""
  );

  // ── derived totals ──────────────────────────────────────────────────────────
  const { subtotal, vat_total, total } = calcTotals(lineItems);

  // ── line item mutation helpers ─────────────────────────────────────────────
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

  // ── number generation ──────────────────────────────────────────────────────
  async function generateNumber(supabase: ReturnType<typeof createClient>) {
    const prefix = (settings[meta.prefixKey] as string) ?? type.toUpperCase().slice(0, 2);
    const { count } = await supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("type", type);
    const next = (count ?? 0) + 1;
    return `${prefix}-${String(next).padStart(4, "0")}`;
  }

  // ── save ───────────────────────────────────────────────────────────────────
  async function handleSave(saveStatus: string) {
    setError(null);
    setSaving(true);

    try {
      const supabase = createClient();

      const parsedExchangeRate = currency !== "ZAR" && exchangeRate ? parseFloat(exchangeRate) : null;
      const zarEquivalent = parsedExchangeRate ? total * parsedExchangeRate : null;

      const payload = {
        type,
        partner_id: clientId || null,
        client_id: clientId || null,
        status: saveStatus,
        issue_date: issueDate || null,
        due_date: type !== "quote" ? (secondDate || null) : null,
        valid_until: type === "quote" ? (secondDate || null) : null,
        line_items: lineItems,
        subtotal,
        vat_total,
        total,
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
        router.push(`/admin/${meta.segment}/${data.id}`);
      } else {
        const { error: updateErr } = await supabase
          .from("documents")
          .update(payload)
          .eq("id", initialDoc!.id);

        if (updateErr) throw updateErr;
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
    <div className="flex gap-6 items-start">
      {/* ── Left: Editor ── */}
      <div className="flex-1 min-w-0 space-y-6">

        {/* Row 1: Client + dates */}
        <div className="bg-white border border-[#EAE4DC] p-6 space-y-4" style={{ borderRadius: 0 }}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Client */}
            <div className="sm:col-span-1">
              <FieldLabel>Client</FieldLabel>
              <select
                className={selectCls}
                style={{ borderRadius: 0 }}
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="">— Select client —</option>
                {partnerList.map((c) => (
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

          {/* Currency selector — invoices only */}
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
                    <p
                      className="mt-1 text-xs text-[#5C6E81]"
                      style={{ fontFamily: "var(--font-montserrat)" }}
                    >
                      Rate will be locked when document is saved
                    </p>
                  </div>
                  <div className="flex flex-col justify-end pb-1">
                    {exchangeRate && parseFloat(exchangeRate) > 0 && (
                      <p
                        className="text-sm font-semibold text-[#1F2A38]"
                        style={{ fontFamily: "var(--font-montserrat)" }}
                      >
                        ≈ {formatZAR(total * parseFloat(exchangeRate))} ZAR
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Row 2: Line items */}
        <div className="bg-white border border-[#EAE4DC]" style={{ borderRadius: 0 }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
              <thead>
                <tr
                  className="border-b border-[#EAE4DC]"
                  style={{ backgroundColor: "rgba(234,228,220,0.5)" }}
                >
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
                    <tr
                      key={item.id}
                      className="border-b border-[#EAE4DC] bg-[#F3F2EE]/50"
                    >
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
                          onChange={(e) =>
                            updateItem(item.id, { description: e.target.value })
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-[#5C6E81] hover:text-red-500 transition-colors"
                          title="Remove row"
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
                          onChange={(e) =>
                            updateItem(item.id, { description: e.target.value })
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          className="w-full bg-transparent border-none outline-none text-sm text-right text-[#1A1A1A]"
                          style={{ fontFamily: "var(--font-montserrat)" }}
                          value={item.qty ?? ""}
                          onChange={(e) =>
                            updateItem(item.id, {
                              qty: e.target.value === "" ? 0 : parseFloat(e.target.value),
                            })
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          className="w-full bg-transparent border-none outline-none text-sm text-right text-[#1A1A1A]"
                          style={{ fontFamily: "var(--font-montserrat)" }}
                          value={item.unit_price ?? ""}
                          onChange={(e) =>
                            updateItem(item.id, {
                              unit_price:
                                e.target.value === "" ? 0 : parseFloat(e.target.value),
                            })
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="any"
                          className="w-full bg-transparent border-none outline-none text-sm text-right text-[#1A1A1A]"
                          style={{ fontFamily: "var(--font-montserrat)" }}
                          value={item.vat_rate ?? ""}
                          onChange={(e) =>
                            updateItem(item.id, {
                              vat_rate:
                                e.target.value === "" ? 0 : parseFloat(e.target.value),
                            })
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
                          title="Remove row"
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

          {/* Add buttons */}
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

        {/* Totals */}
        <div className="flex justify-end">
          <div
            className="bg-white border border-[#EAE4DC] p-5 space-y-2 min-w-[260px]"
            style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
          >
            <div className="flex justify-between text-sm text-[#5C6E81]">
              <span>Subtotal</span>
              <span>{formatZAR(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-[#5C6E81]">
              <span>VAT</span>
              <span>{formatZAR(vat_total)}</span>
            </div>
            <div className="border-t border-[#EAE4DC] pt-2 flex justify-between text-sm font-bold text-[#1F2A38]">
              <span>Total</span>
              <span>{formatZAR(total)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
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
          <p
            className="text-xs text-[#5C6E81] uppercase tracking-wider mb-1 font-medium"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            {meta.label} Number
          </p>
          <p
            className="text-[#1F2A38] font-bold text-lg"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            {initialDoc?.number ?? (
              <span className="text-[#5C6E81] font-normal text-sm">Will be assigned on save</span>
            )}
          </p>
        </div>

        {/* Banking details */}
        <div className="bg-white border border-[#EAE4DC] p-5" style={{ borderRadius: 0 }}>
          <p
            className="text-xs text-[#5C6E81] uppercase tracking-wider mb-3 font-medium"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            Banking Details
          </p>
          <dl
            className="space-y-1.5 text-sm"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            {[
              ["Bank", settings.bank_name],
              ["Account Holder", settings.bank_account_holder],
              ["Account Number", settings.bank_account_number],
              ["Branch Code", settings.bank_branch_code],
              ["Account Type", settings.bank_account_type],
            ].map(([label, value]) =>
              value ? (
                <div key={label} className="flex flex-col">
                  <dt className="text-xs text-[#5C6E81]">{label}</dt>
                  <dd className="text-[#1A1A1A]">{value}</dd>
                </div>
              ) : null
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
  );
}

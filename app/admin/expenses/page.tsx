"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AdminTopBar from "@/components/admin/AdminTopBar";
import { formatZAR, formatDate } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExpenseRow {
  id: string;
  date: string;
  description: string;
  category: string | null;
  vendor: string | null;
  amount_excl_vat: number | null;
  vat_amount: number | null;
  amount_incl_vat: number | null;
  slip_path: string | null;
  notes: string | null;
  partner_id: string | null;
  created_at: string;
  partner?: { company_name: string } | null;
}

interface PartnerRow {
  id: string;
  company_name: string;
}

interface CategoryRow {
  id: string;
  name: string;
  parent_category: string | null;
  is_deductible: boolean;
  sort_order: number;
}

const FALLBACK_CATEGORIES = [
  "Cost of Sales / COGS",
  "Employee & Payroll Costs",
  "Premises & Occupancy",
  "Motor Vehicle & Travel",
  "Communication & Technology",
  "Marketing & Advertising",
  "Professional & Legal Services",
  "Repairs & Maintenance",
  "Office & General Administration",
  "Depreciation & Capital Allowances",
  "Entertainment & Client Costs",
  "Training & Staff Development",
  "Insurance",
  "Interest & Finance Charges",
  "Donations",
  "Home Office Expenses",
  "Sundry & Miscellaneous",
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** SA financial year starts 1 March. Returns "YYYY-03-01" */
function saFYStart(): string {
  const now = new Date();
  const year = now.getMonth() >= 2 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-03-01`;
}

/** Last 12 months as { value: "YYYY-MM", label: "Mon YYYY" }[] */
function last12Months(): { value: string; label: string }[] {
  const months: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-ZA", { month: "short", year: "numeric" });
    months.push({ value, label });
  }
  return months;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [clients, setClients] = useState<PartnerRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [vendorSuggestions, setVendorSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [pendingInboxCount, setPendingInboxCount] = useState(0);

  // UI
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");

  // Form state
  const [formDate, setFormDate] = useState(todayISO());
  const [formDescription, setFormDescription] = useState("");
  const [formVendor, setFormVendor] = useState("");
  const [formCategory, setFormCategory] = useState<string>("");
  const [formAmount, setFormAmount] = useState("");
  const [formVatIncluded, setFormVatIncluded] = useState(false);
  const [formPartnerId, setFormPartnerId] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formSlip, setFormSlip] = useState<File | null>(null);

  // OCR state
  const [slipDragging, setSlipDragging] = useState(false);
  const [slipUploading, setSlipUploading] = useState(false);
  const [slipOcring, setSlipOcring] = useState(false);
  const [slipOcrNote, setSlipOcrNote] = useState<string | null>(null);

  // ── Load data ──────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    const [
      { data: expData },
      { data: clientData },
      { data: { user: u } },
      { count: inboxCount },
      { data: catData, error: catErr },
    ] = await Promise.all([
      supabase
        .from("expenses")
        .select("*, partner:partners(company_name)")
        .order("date", { ascending: false }),
      supabase.from("partners").select("id, company_name").order("company_name"),
      supabase.auth.getUser(),
      supabase
        .from("expense_inbox")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("expense_categories")
        .select("id, name, parent_category, is_deductible, sort_order")
        .eq("is_archived", false)
        .order("sort_order", { ascending: true }),
    ]);

    const expenseRows = (expData as ExpenseRow[]) ?? [];
    setExpenses(expenseRows);
    setClients((clientData as PartnerRow[]) ?? []);
    setUser(u ? { email: u.email ?? "" } : null);
    setPendingInboxCount(inboxCount ?? 0);

    if (!catErr && catData && catData.length > 0) {
      setCategories(catData as CategoryRow[]);
    }

    // Build vendor suggestions from existing expenses
    const vendors = new Set<string>();
    for (const exp of expenseRows) {
      const v = (exp as ExpenseRow & { vendor?: string }).vendor;
      if (v) vendors.add(v);
    }
    setVendorSuggestions(Array.from(vendors).sort());

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Filtered expenses ──────────────────────────────────────────────────────

  const filtered = expenses.filter((e) => {
    const catMatch =
      filterCategory === "all" || e.category === filterCategory;
    const monthMatch =
      filterMonth === "all" || e.date.slice(0, 7) === filterMonth;
    return catMatch && monthMatch;
  });

  // ── Summary calculations ───────────────────────────────────────────────────

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const fyStart = saFYStart();

  const thisMonthTotal = expenses
    .filter((e) => e.date.slice(0, 7) === currentMonth)
    .reduce((sum, e) => sum + (e.amount_incl_vat ?? 0), 0);

  const fyTotal = expenses
    .filter((e) => e.date >= fyStart)
    .reduce((sum, e) => sum + (e.amount_incl_vat ?? 0), 0);

  const totalEntries = expenses.length;

  // ── VAT calculation ────────────────────────────────────────────────────────

  function calcAmounts(amount: number, vatIncluded: boolean) {
    if (vatIncluded) {
      const incl = amount;
      const excl = amount / 1.15;
      const vat = incl - excl;
      return { amount_incl_vat: incl, amount_excl_vat: excl, vat_amount: vat };
    } else {
      const excl = amount;
      const vat = amount * 0.15;
      const incl = excl + vat;
      return { amount_incl_vat: incl, amount_excl_vat: excl, vat_amount: vat };
    }
  }

  // ── Save expense ───────────────────────────────────────────────────────────

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formDescription.trim() || !formAmount) return;

    setSaving(true);
    const amount = parseFloat(formAmount);
    const { amount_excl_vat, vat_amount, amount_incl_vat } = calcAmounts(
      amount,
      formVatIncluded
    );

    const { data: inserted, error } = await supabase
      .from("expenses")
      .insert({
        date: formDate,
        description: formDescription.trim(),
        vendor: formVendor.trim() || null,
        category: formCategory || null,
        amount_excl_vat,
        vat_amount,
        amount_incl_vat,
        partner_id: formPartnerId || null,
        notes: formNotes.trim() || null,
      })
      .select()
      .single();

    if (error) {
      alert("Error saving expense: " + error.message);
      setSaving(false);
      return;
    }

    // Upload slip if provided
    if (formSlip && inserted) {
      const path = `${inserted.id}/${formSlip.name}`;
      await supabase.storage.from("expenses").upload(path, formSlip);
      await supabase
        .from("expenses")
        .update({ slip_path: path })
        .eq("id", inserted.id);
    }

    // Reset form
    setFormDate(todayISO());
    setFormDescription("");
    setFormVendor("");
    setFormCategory("");
    setFormAmount("");
    setFormVatIncluded(false);
    setFormPartnerId("");
    setFormNotes("");
    setFormSlip(null);
    setSlipOcrNote(null);
    setSlipDragging(false);
    setShowAddForm(false);
    setSaving(false);
    loadData();
  }

  // ── OCR slip processing ────────────────────────────────────────────────────

  const processSlipFile = useCallback(async (file: File) => {
    setFormSlip(file);
    setSlipOcrNote(null);
    setSlipUploading(true);

    const tmpId = `tmp-${Date.now()}`;
    const path = `${tmpId}/${file.name}`;
    const { error: upErr } = await supabase.storage.from("expenses").upload(path, file, { upsert: true });
    setSlipUploading(false);

    if (upErr) {
      setSlipOcrNote("Upload failed: " + upErr.message);
      return;
    }

    const isImage = file.type.startsWith("image/");
    if (!isImage) {
      setSlipOcrNote("Slip uploaded. OCR works best with image files — please fill in the fields manually.");
      return;
    }

    const publicUrl = supabase.storage.from("expenses").getPublicUrl(path).data.publicUrl;
    setSlipOcring(true);
    setSlipOcrNote("Scanning slip with AI…");

    try {
      const resp = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_url: publicUrl }),
      });
      const data = await resp.json();

      if (data._note || !resp.ok) {
        setSlipOcrNote(data._note ?? data.error ?? "OCR returned no data.");
        setSlipOcring(false);
        return;
      }

      let filled = 0;
      if (data.issue_date && !formDate) { setFormDate(data.issue_date); filled++; }
      if (data.vendor_name && !formVendor) { setFormVendor(data.vendor_name as string); filled++; }
      if (data.description && !formDescription) { setFormDescription(data.description as string); filled++; }
      if (data.total_amount && !formAmount) {
        setFormAmount(String(data.total_amount));
        setFormVatIncluded(true);
        filled++;
      }
      const conf = data.confidence ? Math.round((data.confidence as number) * 100) : null;
      setSlipOcrNote(`AI scan complete — ${filled} field${filled !== 1 ? "s" : ""} filled${conf !== null ? ` (${conf}% confidence)` : ""}. Please verify all values.`);
    } catch (err) {
      setSlipOcrNote("OCR error: " + (err instanceof Error ? err.message : "Unknown"));
    } finally {
      setSlipOcring(false);
    }
  }, [supabase, formDate, formVendor, formDescription, formAmount]);
  // ── Delete expense ─────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this expense?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  // ── CSV Export ─────────────────────────────────────────────────────────────

  function handleExportCSV() {
    const header = "Date,Description,Category,Excl VAT,VAT,Incl VAT,Notes\n";
    const rows = filtered
      .map((e) =>
        [
          e.date,
          `"${e.description.replace(/"/g, '""')}"`,
          e.category ?? "",
          e.amount_excl_vat?.toFixed(2) ?? "",
          e.vat_amount?.toFixed(2) ?? "",
          e.amount_incl_vat?.toFixed(2) ?? "",
          `"${(e.notes ?? "").replace(/"/g, '""')}"`,
        ].join(",")
      )
      .join("\n");

    const csv = header + rows;
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv" })
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Slip public URL ────────────────────────────────────────────────────────

  function getSlipUrl(slipPath: string): string {
    return supabase.storage
      .from("expenses")
      .getPublicUrl(slipPath).data.publicUrl;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <AdminTopBar title="Expenses" user={user} />

      <main className="pt-[56px] p-8 space-y-6">
        {/* ── Inbox banner ── */}
        {pendingInboxCount > 0 && (
          <Link
            href="/admin/expenses/inbox"
            className="flex items-center justify-between border border-linen bg-white px-5 py-3 hover:bg-linen/30 transition-colors"
            style={{ borderRadius: 0 }}
          >
            <span className="text-sm text-ink" style={{ fontFamily: "var(--font-montserrat)" }}>
              📥 {pendingInboxCount} slip{pendingInboxCount !== 1 ? "s" : ""} awaiting review
            </span>
            <span className="text-xs text-steel underline" style={{ fontFamily: "var(--font-montserrat)" }}>
              Go to Inbox →
            </span>
          </Link>
        )}

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard label="This Month" value={formatZAR(thisMonthTotal)} />
          <SummaryCard label="Financial Year" value={formatZAR(fyTotal)} />
          <SummaryCard label="Total Entries" value={String(totalEntries)} />
        </div>

        {/* ── Filter bar ── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Category filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-linen bg-white text-ink text-sm px-3 py-2 focus:outline-none focus:border-steel"
            style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
          >
            <option value="all">All Categories</option>
            {categories.length > 0
              ? categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.parent_category ? `${c.parent_category} → ` : ""}{c.name}
                  </option>
                ))
              : FALLBACK_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))
            }
          </select>

          {/* Month filter */}
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="border border-linen bg-white text-ink text-sm px-3 py-2 focus:outline-none focus:border-steel"
            style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
          >
            <option value="all">All Time</option>
            {last12Months().map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <div className="flex-1" />

          {/* Inbox link */}
          <Link
            href="/admin/expenses/inbox"
            className="px-4 py-2 text-sm border border-linen text-steel hover:bg-linen transition-colors flex items-center gap-1"
            style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
          >
            📥 Inbox
            {pendingInboxCount > 0 && (
              <span
                className="ml-1 text-xs text-white px-1.5 py-0.5 font-semibold"
                style={{ background: "#1F2A38", borderRadius: 0 }}
              >
                {pendingInboxCount}
              </span>
            )}
          </Link>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 text-sm border border-steel text-steel hover:bg-linen transition-colors"
            style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
          >
            Export CSV
          </button>

          {/* Add Expense */}
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="px-4 py-2 text-sm text-white transition-colors"
            style={{
              background: "#1F2A38",
              fontFamily: "var(--font-montserrat)",
              borderRadius: 0,
            }}
          >
            {showAddForm ? "Cancel" : "Add Expense"}
          </button>
        </div>

        {/* ── Add Expense form ── */}
        {showAddForm && (
          <div className="bg-white border border-linen p-6">
            <h3
              className="text-navy font-bold text-sm mb-4 uppercase tracking-wider"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              New Expense
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Date */}
                <label className="flex flex-col gap-1">
                  <span className={labelClass}>Date</span>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className={inputClass}
                  />
                </label>

                {/* Vendor (autocomplete) */}
                <label className="flex flex-col gap-1">
                  <span className={labelClass}>Vendor</span>
                  <input
                    type="text"
                    value={formVendor}
                    onChange={(e) => setFormVendor(e.target.value)}
                    list="vendor-suggestions"
                    placeholder="e.g. Google, AWS, Afrihost"
                    className={inputClass}
                  />
                  <datalist id="vendor-suggestions">
                    {vendorSuggestions.map((v) => (
                      <option key={v} value={v} />
                    ))}
                  </datalist>
                </label>

                {/* Description */}
                <label className="flex flex-col gap-1">
                  <span className={labelClass}>Description *</span>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    required
                    placeholder="e.g. GitHub Copilot subscription"
                    className={inputClass}
                  />
                </label>

                {/* Category (dynamic from DB) */}
                <label className="flex flex-col gap-1">
                  <span className={labelClass}>Category</span>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">— Select —</option>
                    {categories.length > 0 ? (
                      (() => {
                        const grouped = new Map<string, CategoryRow[]>();
                        const ungrouped: CategoryRow[] = [];
                        for (const cat of categories) {
                          if (cat.parent_category) {
                            const arr = grouped.get(cat.parent_category) ?? [];
                            arr.push(cat);
                            grouped.set(cat.parent_category, arr);
                          } else {
                            ungrouped.push(cat);
                          }
                        }
                        return (
                          <>
                            {ungrouped.map((c) => (
                              <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                            {Array.from(grouped.entries()).map(([parent, children]) => (
                              <optgroup key={parent} label={parent}>
                                {children.map((c) => (
                                  <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                              </optgroup>
                            ))}
                          </>
                        );
                      })()
                    ) : (
                      FALLBACK_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))
                    )}
                  </select>
                </label>

                {/* Amount */}
                <label className="flex flex-col gap-1">
                  <span className={labelClass}>Amount (ZAR)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    required
                    placeholder="0.00"
                    className={inputClass}
                  />
                </label>

                {/* VAT included */}
                <label className="flex items-center gap-2 pt-5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formVatIncluded}
                    onChange={(e) => setFormVatIncluded(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span
                    className="text-sm text-ink"
                    style={{ fontFamily: "var(--font-montserrat)" }}
                  >
                    VAT included?
                  </span>
                </label>

                {/* Client / Venture (optional) */}
                <label className="flex flex-col gap-1">
                  <span className={labelClass}>Client / Venture (optional)</span>
                  <select
                    value={formPartnerId}
                    onChange={(e) => setFormPartnerId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">— None —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company_name}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Slip upload — drag-drop with OCR */}
                <label className="flex flex-col gap-1">
                  <span className={labelClass}>Slip (PDF / image)</span>
                  <div
                    onDragOver={e => { e.preventDefault(); setSlipDragging(true); }}
                    onDragLeave={() => setSlipDragging(false)}
                    onDrop={e => { e.preventDefault(); setSlipDragging(false); const f = e.dataTransfer.files[0]; if (f) processSlipFile(f); }}
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer transition-all"
                    style={{
                      border: slipDragging ? "2px dashed #1F2A38" : "2px dashed #EAE4DC",
                      backgroundColor: slipDragging ? "rgba(31,42,56,0.04)" : "rgba(243,242,238,0.5)",
                      padding: "0.75rem 1rem",
                      borderRadius: 0,
                      textAlign: "center",
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf,image/*"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) processSlipFile(f); }}
                    />
                    <span className="text-xs text-[#5C6E81]" style={{ fontFamily: "var(--font-montserrat)" }}>
                      {slipUploading ? "Uploading…" : slipOcring ? "🔍 Scanning…" : formSlip ? `📎 ${formSlip.name}` : "Drop slip here for AI scan, or click to browse"}
                    </span>
                  </div>
                  {slipOcrNote && (
                    <p className="text-xs mt-0.5" style={{ fontFamily: "var(--font-montserrat)", color: slipOcrNote.toLowerCase().includes("error") || slipOcrNote.toLowerCase().includes("failed") ? "#dc2626" : "#5C6E81" }}>
                      {slipOcrNote}
                    </p>
                  )}
                </label>

                {/* Notes */}
                <label className="flex flex-col gap-1 sm:col-span-2">
                  <span className={labelClass}>Notes (optional)</span>
                  <textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    rows={2}
                    className={inputClass}
                    placeholder="Any additional notes..."
                  />
                </label>
              </div>

              {/* VAT preview */}
              {formAmount && parseFloat(formAmount) > 0 && (
                <div
                  className="text-xs text-steel border border-linen bg-cream px-4 py-2 flex gap-6"
                  style={{ fontFamily: "var(--font-montserrat)" }}
                >
                  {(() => {
                    const { amount_excl_vat, vat_amount, amount_incl_vat } =
                      calcAmounts(parseFloat(formAmount), formVatIncluded);
                    return (
                      <>
                        <span>Excl VAT: {formatZAR(amount_excl_vat)}</span>
                        <span>VAT (15%): {formatZAR(vat_amount)}</span>
                        <span className="font-semibold text-navy">
                          Incl VAT: {formatZAR(amount_incl_vat)}
                        </span>
                      </>
                    );
                  })()}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-sm text-white disabled:opacity-50 transition-colors"
                  style={{
                    background: "#1F2A38",
                    fontFamily: "var(--font-montserrat)",
                    borderRadius: 0,
                  }}
                >
                  {saving ? "Saving…" : "Save Expense"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-5 py-2 text-sm border border-linen text-steel hover:bg-linen transition-colors"
                  style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Expense table ── */}
        <div className="bg-white border border-linen overflow-x-auto">
          <table
            className="w-full text-sm"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            <thead>
              <tr
                className="border-b border-linen"
                style={{ backgroundColor: "rgba(234,228,220,0.5)" }}
              >
                <th className={thClass + " text-left"}>Date</th>
                <th className={thClass + " text-left"}>Vendor</th>
                <th className={thClass + " text-left"}>Description</th>
                <th className={thClass + " text-left"}>Category</th>
                <th className={thClass + " text-right"}>Amount (incl VAT)</th>
                <th className={thClass + " text-center"}>Slip</th>
                <th className={thClass + " text-left"}>Partner</th>
                <th className={thClass + " text-right"}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-steel text-sm"
                  >
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-steel text-sm"
                  >
                    No expenses found.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-linen last:border-0 hover:bg-linen/20 transition-colors"
                  >
                    <td className="px-4 py-3 text-ink text-sm whitespace-nowrap">
                      {formatDate(e.date)}
                    </td>
                    <td className="px-4 py-3 text-ink text-sm whitespace-nowrap">
                      {e.vendor ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-ink text-sm max-w-xs truncate">
                      {e.description}
                    </td>
                    <td className="px-4 py-3">
                      {e.category ? (
                        <CategoryPill category={e.category} />
                      ) : (
                        <span className="text-steel text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink text-sm text-right whitespace-nowrap">
                      {e.amount_incl_vat != null
                        ? formatZAR(e.amount_incl_vat)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {e.slip_path ? (
                        <a
                          href={getSlipUrl(e.slip_path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-steel hover:text-navy underline transition-colors"
                        >
                          📎 View
                        </a>
                      ) : (
                        <span className="text-steel text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-steel text-sm">
                      {e.partner?.company_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="text-xs text-steel hover:text-red-600 underline transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Row count */}
        {!loading && filtered.length > 0 && (
          <p
            className="text-xs text-steel text-right"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            Showing {filtered.length} of {expenses.length} expenses
          </p>
        )}
      </main>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const labelClass =
  "text-xs text-steel uppercase tracking-widest font-medium";
const inputClass =
  "border border-linen bg-white text-ink text-sm px-3 py-2 focus:outline-none focus:border-steel w-full";
const thClass =
  "px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium";

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className="bg-white border border-linen p-6 flex flex-col gap-2"
      style={{ borderRadius: 0 }}
    >
      <span
        className="text-xs text-steel uppercase tracking-widest"
        style={{ fontFamily: "var(--font-montserrat)" }}
      >
        {label}
      </span>
      <span
        className="text-navy font-bold text-2xl"
        style={{ fontFamily: "var(--font-inter)" }}
      >
        {value}
      </span>
    </div>
  );
}

function CategoryPill({ category }: { category: string }) {
  return (
    <span
      className="inline-block border border-steel text-steel text-xs px-2 py-0.5"
      style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
    >
      {category}
    </span>
  );
}

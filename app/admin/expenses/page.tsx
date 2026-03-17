"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminTopBar from "@/components/admin/AdminTopBar";
import type { ExpenseCategory } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExpenseRow {
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
  created_at: string;
  client?: { company_name: string } | null;
}

interface ClientRow {
  id: string;
  company_name: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORIES: ExpenseCategory[] = [
  "Software",
  "Hosting",
  "Travel",
  "Subcontractors",
  "Equipment",
  "Office",
  "Other",
];

function formatZAR(amount: number): string {
  return `R ${amount.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

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

  // Data
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ email: string } | null>(null);

  // UI
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");

  // Form state
  const [formDate, setFormDate] = useState(todayISO());
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState<ExpenseCategory>("Software");
  const [formAmount, setFormAmount] = useState("");
  const [formVatIncluded, setFormVatIncluded] = useState(false);
  const [formClientId, setFormClientId] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formSlip, setFormSlip] = useState<File | null>(null);

  // ── Load data ──────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: expData }, { data: clientData }, { data: { user: u } }] =
      await Promise.all([
        supabase
          .from("expenses")
          .select("*, client:clients(company_name)")
          .order("date", { ascending: false }),
        supabase.from("clients").select("id, company_name").order("company_name"),
        supabase.auth.getUser(),
      ]);

    setExpenses((expData as ExpenseRow[]) ?? []);
    setClients((clientData as ClientRow[]) ?? []);
    setUser(u ? { email: u.email ?? "" } : null);
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
        category: formCategory,
        amount_excl_vat,
        vat_amount,
        amount_incl_vat,
        client_id: formClientId || null,
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
    setFormCategory("Software");
    setFormAmount("");
    setFormVatIncluded(false);
    setFormClientId("");
    setFormNotes("");
    setFormSlip(null);
    setShowAddForm(false);
    setSaving(false);
    loadData();
  }

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
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
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

                {/* Description */}
                <label className="flex flex-col gap-1 lg:col-span-2">
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

                {/* Category */}
                <label className="flex flex-col gap-1">
                  <span className={labelClass}>Category</span>
                  <select
                    value={formCategory}
                    onChange={(e) =>
                      setFormCategory(e.target.value as ExpenseCategory)
                    }
                    className={inputClass}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
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

                {/* Client (optional) */}
                <label className="flex flex-col gap-1">
                  <span className={labelClass}>Client (optional)</span>
                  <select
                    value={formClientId}
                    onChange={(e) => setFormClientId(e.target.value)}
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

                {/* Slip upload */}
                <label className="flex flex-col gap-1">
                  <span className={labelClass}>Slip (PDF / image)</span>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={(e) =>
                      setFormSlip(e.target.files?.[0] ?? null)
                    }
                    className="text-sm text-steel"
                    style={{ fontFamily: "var(--font-montserrat)" }}
                  />
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
                <th className={thClass + " text-left"}>Description</th>
                <th className={thClass + " text-left"}>Category</th>
                <th className={thClass + " text-right"}>Amount (incl VAT)</th>
                <th className={thClass + " text-center"}>Slip</th>
                <th className={thClass + " text-left"}>Client</th>
                <th className={thClass + " text-right"}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-steel text-sm"
                  >
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
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
                      {e.client?.company_name ?? "—"}
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

function CategoryPill({ category }: { category: ExpenseCategory }) {
  return (
    <span
      className="inline-block border border-steel text-steel text-xs px-2 py-0.5"
      style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
    >
      {category}
    </span>
  );
}

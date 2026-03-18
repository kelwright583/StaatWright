"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { EquityEntry, OwnerSettings, Partner } from "@/lib/types";

function formatZAR(n: number): string {
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}

const TYPE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  capital:      { bg: "#EFF6FF", text: "#3b82f6", label: "Capital" },
  sweat:        { bg: "#F0FDF4", text: "#22c55e", label: "Sweat" },
  distribution: { bg: "#FEF9C3", text: "#ca8a04", label: "Distribution" },
};

function TypeBadge({ type }: { type: string }) {
  const meta = TYPE_BADGE[type] ?? { bg: "#F3F2EE", text: "#5C6E81", label: type };
  return (
    <span
      className="px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: meta.bg, color: meta.text, borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
    >
      {meta.label}
    </span>
  );
}

const labelClass = "block text-xs text-steel uppercase tracking-wider mb-1";
const inputClass = "border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm";

interface NewEntryForm {
  entry_type: "capital" | "sweat" | "distribution";
  owner_id: string;
  owner_ids: string[]; // for distribution (multi)
  date: string;
  description: string;
  category: string;
  hours: string;
  use_agreed_value: boolean;
  amount: string;
  notes: string;
  partner_id: string;
  project_id: string;
  method: string;
  reference: string;
}

const emptyForm: NewEntryForm = {
  entry_type: "capital",
  owner_id: "",
  owner_ids: [],
  date: new Date().toISOString().slice(0, 10),
  description: "",
  category: "",
  hours: "",
  use_agreed_value: false,
  amount: "",
  notes: "",
  partner_id: "",
  project_id: "",
  method: "",
  reference: "",
};

const CAPITAL_CATEGORIES = [
  "Cash injection", "Equipment", "IP / License", "Property", "Vehicle", "Other",
];

export default function EquityPage() {
  const supabase = createClient();

  const [entries, setEntries] = useState<EquityEntry[]>([]);
  const [owners, setOwners] = useState<OwnerSettings[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewEntryForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("all");
  const [filterOwner, setFilterOwner] = useState("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: entriesData }, { data: ownersData }, { data: partnersData }] = await Promise.all([
      supabase.from("equity_ledger").select("*").order("date", { ascending: false }),
      supabase.from("owner_settings").select("*").order("display_name"),
      supabase.from("partners").select("id, company_name").order("company_name"),
    ]);
    setEntries((entriesData ?? []) as EquityEntry[]);
    setOwners((ownersData ?? []) as OwnerSettings[]);
    setPartners((partnersData ?? []) as Partner[]);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function handleFormChange(name: string, val: string | boolean) {
    setForm((prev) => ({ ...prev, [name]: val }));
  }

  function toggleDistOwner(ownerId: string) {
    setForm((prev) => ({
      ...prev,
      owner_ids: prev.owner_ids.includes(ownerId)
        ? prev.owner_ids.filter((id) => id !== ownerId)
        : [...prev.owner_ids, ownerId],
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim()) { setFormError("Description is required."); return; }
    if (!form.date) { setFormError("Date is required."); return; }
    setSaving(true); setFormError(null);

    try {
      if (form.entry_type === "distribution") {
        const targets = form.owner_ids.length > 0 ? form.owner_ids : (form.owner_id ? [form.owner_id] : []);
        if (targets.length === 0) { setFormError("Select at least one owner."); setSaving(false); return; }
        const amt = parseFloat(form.amount) || 0;
        const inserts = targets.map((oid) => ({
          entry_type: "distribution",
          owner_id: oid,
          date: form.date,
          description: form.description.trim(),
          amount: amt,
          notes: form.notes.trim() || null,
          category: form.method || null,
        }));
        const { error } = await supabase.from("equity_ledger").insert(inserts);
        if (error) throw error;
      } else if (form.entry_type === "sweat") {
        const hours = parseFloat(form.hours) || null;
        const ownerRate = owners.find((o) => o.id === form.owner_id)?.hourly_rate ?? null;
        const amount = form.use_agreed_value
          ? (parseFloat(form.amount) || 0)
          : hours && ownerRate ? hours * ownerRate : parseFloat(form.amount) || 0;
        const { error } = await supabase.from("equity_ledger").insert({
          entry_type: "sweat",
          owner_id: form.owner_id || null,
          partner_id: form.partner_id || null,
          project_id: form.project_id || null,
          date: form.date,
          description: form.description.trim(),
          hours: form.use_agreed_value ? null : hours,
          hourly_rate_used: form.use_agreed_value ? null : ownerRate,
          amount,
          notes: form.notes.trim() || null,
          category: null,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("equity_ledger").insert({
          entry_type: "capital",
          owner_id: form.owner_id || null,
          partner_id: form.partner_id || null,
          project_id: form.project_id || null,
          date: form.date,
          description: form.description.trim(),
          amount: parseFloat(form.amount) || 0,
          category: form.category || null,
          notes: form.notes.trim() || null,
          hours: null,
          hourly_rate_used: null,
        });
        if (error) throw error;
      }
      setForm(emptyForm);
      setShowForm(false);
      await loadData();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  // Summaries
  const totalCapital = entries.filter((e) => e.entry_type === "capital").reduce((s, e) => s + e.amount, 0);
  const totalSweat = entries.filter((e) => e.entry_type === "sweat").reduce((s, e) => s + e.amount, 0);
  const totalDistributions = entries.filter((e) => e.entry_type === "distribution").reduce((s, e) => s + e.amount, 0);
  const netOutstanding = totalCapital + totalSweat - totalDistributions;

  const filtered = entries.filter((e) => {
    if (filterType !== "all" && e.entry_type !== filterType) return false;
    if (filterOwner !== "all" && e.owner_id !== filterOwner) return false;
    return true;
  });

  const ownerName = (id: string | null) => {
    if (!id) return "—";
    const o = owners.find((o) => o.id === id);
    return o?.display_name ?? o?.initials ?? id;
  };

  return (
    <>
      <div
        className="fixed top-0 right-0 flex items-center justify-between px-8 bg-white border-b border-linen z-10"
        style={{ left: "240px", height: "56px" }}
      >
        <h2 className="text-navy font-bold text-lg" style={{ fontFamily: "var(--font-inter)" }}>
          Equity &amp; Capital Ledger
        </h2>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/equity/terms"
            className="px-4 py-2 border border-linen text-sm text-steel hover:text-navy hover:border-navy transition-colors"
            style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
          >
            Equity Terms
          </Link>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="px-5 py-2.5 text-white text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
          >
            + Add Entry
          </button>
        </div>
      </div>

      <main className="pt-[56px] p-8 space-y-8">
        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Capital Contributed", value: formatZAR(totalCapital) },
            { label: "Total Sweat Equity",         value: formatZAR(totalSweat) },
            { label: "Total Distributions",        value: formatZAR(totalDistributions) },
            { label: "Net Outstanding",            value: formatZAR(netOutstanding), highlight: true },
          ].map((card) => (
            <div key={card.label} className="bg-white border border-linen p-6 flex flex-col gap-2" style={{ borderRadius: 0 }}>
              <span className="text-xs text-steel uppercase tracking-widest" style={{ fontFamily: "var(--font-montserrat)" }}>
                {card.label}
              </span>
              <span
                className="font-bold text-xl"
                style={{ fontFamily: "var(--font-inter)", color: card.highlight ? "#1F2A38" : "#1F2A38" }}
              >
                {card.value}
              </span>
            </div>
          ))}
        </div>

        {/* Per-owner panels */}
        {!loading && owners.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {owners.map((owner) => {
              const ownerEntries = entries.filter((e) => e.owner_id === owner.id);
              const cap = ownerEntries.filter((e) => e.entry_type === "capital").reduce((s, e) => s + e.amount, 0);
              const sw = ownerEntries.filter((e) => e.entry_type === "sweat").reduce((s, e) => s + e.amount, 0);
              const dist = ownerEntries.filter((e) => e.entry_type === "distribution").reduce((s, e) => s + e.amount, 0);
              const net = cap + sw - dist;
              return (
                <div key={owner.id} className="bg-white border border-linen p-6" style={{ borderRadius: 0 }}>
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className="w-10 h-10 flex items-center justify-center text-sm font-bold text-white shrink-0"
                      style={{ backgroundColor: "#5C6E81", borderRadius: 0, fontFamily: "var(--font-inter)" }}
                    >
                      {owner.initials ?? (owner.display_name ?? "?").slice(0, 2).toUpperCase()}
                    </span>
                    <span className="text-navy font-bold text-sm" style={{ fontFamily: "var(--font-inter)" }}>
                      {owner.display_name ?? owner.initials ?? "Owner"}
                    </span>
                  </div>
                  <dl className="space-y-2 text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
                    {[
                      { label: "Capital Contributed", value: formatZAR(cap) },
                      { label: "Sweat Equity",         value: formatZAR(sw) },
                      { label: "Distributions",        value: formatZAR(dist) },
                    ].map((row) => (
                      <div key={row.label} className="flex justify-between">
                        <dt className="text-steel">{row.label}</dt>
                        <dd className="text-ink">{row.value}</dd>
                      </div>
                    ))}
                    <div className="border-t border-linen pt-2 flex justify-between font-bold">
                      <dt className="text-navy">Net Outstanding</dt>
                      <dd className="text-navy">{formatZAR(net)}</dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Entry form */}
        {showForm && (
          <form onSubmit={handleSave}>
            <div className="bg-white border border-linen p-6" style={{ borderRadius: 0 }}>
              <h4 className="text-navy font-bold text-xs uppercase tracking-wider mb-5" style={{ fontFamily: "var(--font-inter)" }}>
                Add Equity Entry
              </h4>

              {/* Entry type */}
              <div className="mb-5">
                <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Entry Type</label>
                <div className="flex gap-2">
                  {(["capital", "sweat", "distribution"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleFormChange("entry_type", t)}
                      className="px-4 py-2 text-xs uppercase tracking-wider border transition-colors"
                      style={{
                        borderRadius: 0,
                        fontFamily: "var(--font-montserrat)",
                        borderColor: form.entry_type === t ? "#1F2A38" : "#EAE4DC",
                        backgroundColor: form.entry_type === t ? "#1F2A38" : "white",
                        color: form.entry_type === t ? "white" : "#5C6E81",
                      }}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Date */}
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Date *</label>
                  <input
                    type="date" required value={form.date}
                    onChange={(e) => handleFormChange("date", e.target.value)}
                    className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>

                {/* Owner(s) */}
                {form.entry_type !== "distribution" ? (
                  <div>
                    <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Owner</label>
                    <select
                      value={form.owner_id} onChange={(e) => handleFormChange("owner_id", e.target.value)}
                      className="border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm"
                      style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                    >
                      <option value="">— Select owner —</option>
                      {owners.map((o) => (
                        <option key={o.id} value={o.id}>{o.display_name ?? o.initials}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Owner(s)</label>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {owners.map((o) => (
                        <label
                          key={o.id}
                          className="flex items-center gap-1.5 text-sm cursor-pointer"
                          style={{ fontFamily: "var(--font-montserrat)" }}
                        >
                          <input
                            type="checkbox"
                            checked={form.owner_ids.includes(o.id)}
                            onChange={() => toggleDistOwner(o.id)}
                          />
                          {o.display_name ?? o.initials}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Description *</label>
                  <input
                    type="text" required value={form.description}
                    onChange={(e) => handleFormChange("description", e.target.value)}
                    className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>

                {/* Capital-specific: Category + Amount */}
                {form.entry_type === "capital" && (
                  <>
                    <div>
                      <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Category</label>
                      <select
                        value={form.category} onChange={(e) => handleFormChange("category", e.target.value)}
                        className="border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm"
                        style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                      >
                        <option value="">— Select —</option>
                        {CAPITAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Amount (R) *</label>
                      <input
                        type="number" min="0" step="any" required value={form.amount}
                        onChange={(e) => handleFormChange("amount", e.target.value)}
                        className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                      />
                    </div>
                  </>
                )}

                {/* Sweat-specific */}
                {form.entry_type === "sweat" && (
                  <>
                    <div className="sm:col-span-2">
                      <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ fontFamily: "var(--font-montserrat)" }}>
                        <input
                          type="checkbox"
                          checked={form.use_agreed_value}
                          onChange={(e) => handleFormChange("use_agreed_value", e.target.checked)}
                        />
                        Use agreed value instead of hours × rate
                      </label>
                    </div>
                    {!form.use_agreed_value ? (
                      <div>
                        <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Hours</label>
                        <input
                          type="number" min="0" step="any" value={form.hours}
                          onChange={(e) => handleFormChange("hours", e.target.value)}
                          className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                        />
                        {form.owner_id && (
                          <p className="text-xs text-steel mt-1" style={{ fontFamily: "var(--font-montserrat)" }}>
                            Rate: {formatZAR(owners.find((o) => o.id === form.owner_id)?.hourly_rate ?? 0)}/hr
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Agreed Value (R) *</label>
                        <input
                          type="number" min="0" step="any" required value={form.amount}
                          onChange={(e) => handleFormChange("amount", e.target.value)}
                          className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                        />
                      </div>
                    )}
                  </>
                )}

                {/* Distribution-specific */}
                {form.entry_type === "distribution" && (
                  <>
                    <div>
                      <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Amount per Owner (R) *</label>
                      <input
                        type="number" min="0" step="any" required value={form.amount}
                        onChange={(e) => handleFormChange("amount", e.target.value)}
                        className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                      />
                    </div>
                    <div>
                      <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Method</label>
                      <select
                        value={form.method} onChange={(e) => handleFormChange("method", e.target.value)}
                        className="border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm"
                        style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                      >
                        <option value="">— Select —</option>
                        <option value="EFT">EFT</option>
                        <option value="Offset">Offset</option>
                        <option value="Cash">Cash</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Reference</label>
                      <input
                        type="text" value={form.reference}
                        onChange={(e) => handleFormChange("reference", e.target.value)}
                        className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                      />
                    </div>
                  </>
                )}

                {/* Notes */}
                <div className="sm:col-span-2">
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Notes</label>
                  <input
                    type="text" value={form.notes}
                    onChange={(e) => handleFormChange("notes", e.target.value)}
                    className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>
              </div>

              {formError && <p className="mt-3 text-sm text-red-500" style={{ fontFamily: "var(--font-montserrat)" }}>{formError}</p>}
              <div className="mt-5 flex gap-3">
                <button
                  type="submit" disabled={saving}
                  className="px-5 py-2.5 text-white text-sm font-semibold transition-opacity disabled:opacity-60"
                  style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
                >
                  {saving ? "Saving…" : "Save Entry"}
                </button>
                <button
                  type="button" onClick={() => { setShowForm(false); setFormError(null); setForm(emptyForm); }}
                  className="text-sm text-steel hover:text-navy transition-colors"
                  style={{ fontFamily: "var(--font-montserrat)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Ledger table */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-navy font-bold text-sm uppercase tracking-wider" style={{ fontFamily: "var(--font-inter)" }}>
              Full Ledger
            </h3>
            <div className="flex gap-3" style={{ fontFamily: "var(--font-montserrat)" }}>
              <select
                value={filterType} onChange={(e) => setFilterType(e.target.value)}
                className="border border-linen bg-white px-3 py-1.5 text-xs text-steel focus:outline-none focus:border-navy"
                style={{ borderRadius: 0 }}
              >
                <option value="all">All Types</option>
                <option value="capital">Capital</option>
                <option value="sweat">Sweat</option>
                <option value="distribution">Distribution</option>
              </select>
              <select
                value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)}
                className="border border-linen bg-white px-3 py-1.5 text-xs text-steel focus:outline-none focus:border-navy"
                style={{ borderRadius: 0 }}
              >
                <option value="all">All Owners</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>{o.display_name ?? o.initials}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white border border-linen overflow-x-auto" style={{ borderRadius: 0 }}>
            {loading ? (
              <p className="px-4 py-6 text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="px-4 py-6 text-center text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
                No entries found.
              </p>
            ) : (
              <table className="w-full text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
                <thead>
                  <tr className="border-b border-linen" style={{ backgroundColor: "rgba(234,228,220,0.5)" }}>
                    <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Date</th>
                    <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Owner</th>
                    <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Type</th>
                    <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Description</th>
                    <th className="text-right px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr key={entry.id} className="border-b border-linen last:border-0 hover:bg-linen/20 transition-colors">
                      <td className="px-4 py-3 text-steel whitespace-nowrap">{formatDate(entry.date)}</td>
                      <td className="px-4 py-3 text-ink">{ownerName(entry.owner_id)}</td>
                      <td className="px-4 py-3"><TypeBadge type={entry.entry_type} /></td>
                      <td className="px-4 py-3 text-ink">{entry.description}</td>
                      <td className="px-4 py-3 text-ink text-right font-medium">{formatZAR(entry.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

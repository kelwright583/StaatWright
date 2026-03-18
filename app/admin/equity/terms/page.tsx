"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { OwnerSettings } from "@/lib/types";

const labelClass = "block text-xs text-steel uppercase tracking-wider mb-1";
const inputClass = "border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm";

interface EquityTermsRecord {
  id: string;
  version: number;
  is_current: boolean;
  effective_date: string;
  owner1_id: string | null;
  owner1_rate: number | null;
  owner2_id: string | null;
  owner2_rate: number | null;
  valuation_method: string | null;
  capital_interest_rate: number;
  capital_accrues_from: string | null;
  repayment_triggers: string[];
  repayment_priority: string | null;
  distribution_method: string | null;
  legal_notes: string | null;
  created_at: string;
}

interface FormState {
  owner1_id: string;
  owner1_rate: string;
  owner2_id: string;
  owner2_rate: string;
  valuation_method: string;
  capital_interest_rate: string;
  capital_accrues_from: string;
  repayment_triggers: string[];
  repayment_priority: string;
  distribution_method: string;
  legal_notes: string;
}

const TRIGGER_OPTIONS = [
  { value: "exit", label: "Exit / Sale" },
  { value: "buyout", label: "Partner Buyout" },
  { value: "dissolution", label: "Dissolution" },
  { value: "mutual_agreement", label: "Mutual Agreement" },
];

export default function EquityTermsPage() {
  const supabase = createClient();
  const [currentTerms, setCurrentTerms] = useState<EquityTermsRecord | null>(null);
  const [history, setHistory] = useState<EquityTermsRecord[]>([]);
  const [owners, setOwners] = useState<OwnerSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState<FormState>({
    owner1_id: "", owner1_rate: "", owner2_id: "", owner2_rate: "",
    valuation_method: "agreed_value",
    capital_interest_rate: "0",
    capital_accrues_from: "contribution_date",
    repayment_triggers: [],
    repayment_priority: "capital_first",
    distribution_method: "pro_rata",
    legal_notes: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: termsData }, { data: ownersData }] = await Promise.all([
      supabase.from("equity_terms").select("*").order("version", { ascending: false }),
      supabase.from("owner_settings").select("*").order("display_name"),
    ]);
    const allTerms = (termsData ?? []) as EquityTermsRecord[];
    const current = allTerms.find((t) => t.is_current) ?? null;
    setCurrentTerms(current);
    setHistory(allTerms.filter((t) => !t.is_current));
    setOwners((ownersData ?? []) as OwnerSettings[]);

    if (current) {
      setForm({
        owner1_id: current.owner1_id ?? "",
        owner1_rate: String(current.owner1_rate ?? ""),
        owner2_id: current.owner2_id ?? "",
        owner2_rate: String(current.owner2_rate ?? ""),
        valuation_method: current.valuation_method ?? "agreed_value",
        capital_interest_rate: String(current.capital_interest_rate ?? 0),
        capital_accrues_from: current.capital_accrues_from ?? "contribution_date",
        repayment_triggers: current.repayment_triggers ?? [],
        repayment_priority: current.repayment_priority ?? "capital_first",
        distribution_method: current.distribution_method ?? "pro_rata",
        legal_notes: current.legal_notes ?? "",
      });
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function handleChange(name: string, val: string) {
    setForm((prev) => ({ ...prev, [name]: val }));
  }

  function toggleTrigger(val: string) {
    setForm((prev) => ({
      ...prev,
      repayment_triggers: prev.repayment_triggers.includes(val)
        ? prev.repayment_triggers.filter((t) => t !== val)
        : [...prev.repayment_triggers, val],
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSaveError(null); setSaved(false);

    try {
      const newVersion = (currentTerms?.version ?? 0) + 1;

      // Mark old version not current
      if (currentTerms) {
        await supabase.from("equity_terms").update({ is_current: false }).eq("id", currentTerms.id);
      }

      const { error } = await supabase.from("equity_terms").insert({
        version: newVersion,
        is_current: true,
        effective_date: new Date().toISOString().slice(0, 10),
        owner1_id: form.owner1_id || null,
        owner1_rate: form.owner1_rate ? parseFloat(form.owner1_rate) : null,
        owner2_id: form.owner2_id || null,
        owner2_rate: form.owner2_rate ? parseFloat(form.owner2_rate) : null,
        valuation_method: form.valuation_method || null,
        capital_interest_rate: parseFloat(form.capital_interest_rate) || 0,
        capital_accrues_from: form.capital_accrues_from || null,
        repayment_triggers: form.repayment_triggers,
        repayment_priority: form.repayment_priority || null,
        distribution_method: form.distribution_method || null,
        legal_notes: form.legal_notes.trim() || null,
      });

      if (error) throw error;
      setSaved(true);
      await loadData();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const sectionHead = (title: string) => (
    <h4 className="text-navy font-bold text-xs uppercase tracking-wider mb-4 pt-2" style={{ fontFamily: "var(--font-inter)" }}>
      {title}
    </h4>
  );

  return (
    <>
      <div
        className="fixed top-0 right-0 flex items-center justify-between px-8 bg-white border-b border-linen z-10"
        style={{ left: "240px", height: "56px" }}
      >
        <h2 className="text-navy font-bold text-lg" style={{ fontFamily: "var(--font-inter)" }}>Equity Terms</h2>
        <Link
          href="/admin/equity"
          className="text-sm text-steel hover:text-navy underline transition-colors"
          style={{ fontFamily: "var(--font-montserrat)" }}
        >
          ← Back to Ledger
        </Link>
      </div>

      <main className="pt-[56px] p-8 max-w-3xl">
        {/* Current version info */}
        {currentTerms && (
          <div className="bg-linen/40 border border-linen p-4 mb-6 flex items-center justify-between" style={{ borderRadius: 0 }}>
            <span className="text-sm text-ink" style={{ fontFamily: "var(--font-montserrat)" }}>
              <span className="font-semibold text-navy">Version {currentTerms.version}</span>
              {" — effective "}
              {new Date(currentTerms.effective_date).toLocaleDateString("en-ZA", {
                day: "2-digit", month: "short", year: "numeric",
              })}
            </span>
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs text-steel hover:text-navy underline transition-colors"
              style={{ fontFamily: "var(--font-montserrat)" }}
            >
              {showHistory ? "Hide history" : "View history"}
            </button>
          </div>
        )}

        {/* History panel */}
        {showHistory && history.length > 0 && (
          <div className="bg-white border border-linen mb-6" style={{ borderRadius: 0 }}>
            <table className="w-full text-xs" style={{ fontFamily: "var(--font-montserrat)" }}>
              <thead>
                <tr className="border-b border-linen" style={{ backgroundColor: "rgba(234,228,220,0.5)" }}>
                  <th className="text-left px-4 py-2 text-steel uppercase tracking-wider">Version</th>
                  <th className="text-left px-4 py-2 text-steel uppercase tracking-wider">Effective</th>
                  <th className="text-left px-4 py-2 text-steel uppercase tracking-wider">Valuation Method</th>
                  <th className="text-right px-4 py-2 text-steel uppercase tracking-wider">Interest Rate</th>
                </tr>
              </thead>
              <tbody>
                {history.map((t) => (
                  <tr key={t.id} className="border-b border-linen last:border-0">
                    <td className="px-4 py-2 text-ink">v{t.version}</td>
                    <td className="px-4 py-2 text-steel">
                      {new Date(t.effective_date).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-2 text-steel">{t.valuation_method ?? "—"}</td>
                    <td className="px-4 py-2 text-steel text-right">{t.capital_interest_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {loading ? (
          <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>Loading…</p>
        ) : (
          <form onSubmit={handleSave}>
            <div className="bg-white border border-linen p-8 space-y-6" style={{ borderRadius: 0 }}>

              {/* 1. Sweat Equity rates */}
              {sectionHead("Sweat Equity")}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Owner 1</label>
                  <select
                    value={form.owner1_id} onChange={(e) => handleChange("owner1_id", e.target.value)}
                    className="border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm"
                    style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  >
                    <option value="">— Select —</option>
                    {owners.map((o) => <option key={o.id} value={o.id}>{o.display_name ?? o.initials}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Owner 1 Rate (ZAR/hr)</label>
                  <input
                    type="number" min="0" step="any" value={form.owner1_rate}
                    onChange={(e) => handleChange("owner1_rate", e.target.value)}
                    className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>
                <div />
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Owner 2</label>
                  <select
                    value={form.owner2_id} onChange={(e) => handleChange("owner2_id", e.target.value)}
                    className="border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm"
                    style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  >
                    <option value="">— Select —</option>
                    {owners.map((o) => <option key={o.id} value={o.id}>{o.display_name ?? o.initials}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Owner 2 Rate (ZAR/hr)</label>
                  <input
                    type="number" min="0" step="any" value={form.owner2_rate}
                    onChange={(e) => handleChange("owner2_rate", e.target.value)}
                    className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Valuation Method</label>
                  <select
                    value={form.valuation_method} onChange={(e) => handleChange("valuation_method", e.target.value)}
                    className="border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm"
                    style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  >
                    <option value="agreed_value">Agreed Value</option>
                    <option value="hourly_rate">Hours × Hourly Rate</option>
                    <option value="market_rate">Market Rate</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-linen" />

              {/* 2. Capital Contributions */}
              {sectionHead("Capital Contributions")}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Interest Rate (%)</label>
                  <input
                    type="number" min="0" max="100" step="any" value={form.capital_interest_rate}
                    onChange={(e) => handleChange("capital_interest_rate", e.target.value)}
                    className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Accrues From</label>
                  <select
                    value={form.capital_accrues_from} onChange={(e) => handleChange("capital_accrues_from", e.target.value)}
                    className="border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm"
                    style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  >
                    <option value="contribution_date">Contribution Date</option>
                    <option value="fiscal_year_start">Fiscal Year Start</option>
                    <option value="agreement_date">Agreement Date</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-linen" />

              {/* 3. Repayment Terms */}
              {sectionHead("Repayment Terms")}
              <div>
                <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Trigger Events</label>
                <div className="flex flex-wrap gap-4 mt-2">
                  {TRIGGER_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                      style={{ fontFamily: "var(--font-montserrat)" }}
                    >
                      <input
                        type="checkbox"
                        checked={form.repayment_triggers.includes(opt.value)}
                        onChange={() => toggleTrigger(opt.value)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Priority</label>
                  <select
                    value={form.repayment_priority} onChange={(e) => handleChange("repayment_priority", e.target.value)}
                    className="border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm"
                    style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  >
                    <option value="capital_first">Capital First</option>
                    <option value="pro_rata">Pro Rata</option>
                    <option value="sweat_first">Sweat First</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Distribution Method</label>
                  <select
                    value={form.distribution_method} onChange={(e) => handleChange("distribution_method", e.target.value)}
                    className="border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm"
                    style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  >
                    <option value="pro_rata">Pro Rata</option>
                    <option value="equal_split">Equal Split</option>
                    <option value="discretionary">Discretionary</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-linen" />

              {/* 4. Legal Notes */}
              {sectionHead("Legal Notes")}
              <div>
                <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Legal Notes</label>
                <textarea
                  rows={5} value={form.legal_notes}
                  onChange={(e) => handleChange("legal_notes", e.target.value)}
                  placeholder="Any legal notes, references, or conditions…"
                  className="border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm resize-y"
                  style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                />
              </div>

              {saveError && (
                <p className="text-sm text-red-500" style={{ fontFamily: "var(--font-montserrat)" }}>{saveError}</p>
              )}
              {saved && (
                <p className="text-sm text-green-600" style={{ fontFamily: "var(--font-montserrat)" }}>
                  Terms saved as new version.
                </p>
              )}

              <div className="pt-2">
                <button
                  type="submit" disabled={saving}
                  className="px-6 py-2.5 text-white text-sm font-semibold transition-opacity disabled:opacity-60"
                  style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
                >
                  {saving ? "Saving…" : "Save as New Version"}
                </button>
              </div>
            </div>
          </form>
        )}
      </main>
    </>
  );
}

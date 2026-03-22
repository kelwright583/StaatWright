"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Retainer, Partner, Project } from "@/lib/types";

function formatZAR(n: number): string {
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}

function nextInvoiceDate(invoiceDay: number, lastDate: string | null): string {
  const today = new Date();
  const candidate = new Date(today.getFullYear(), today.getMonth(), invoiceDay);
  if (candidate <= today) {
    candidate.setMonth(candidate.getMonth() + 1);
  }
  return candidate.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_BADGE: Record<string, { dot: string; label: string; color: string }> = {
  active:    { dot: "#22c55e", label: "Active",    color: "#22c55e" },
  paused:    { dot: "#f59e0b", label: "Paused",    color: "#f59e0b" },
  cancelled: { dot: "#5C6E81", label: "Cancelled", color: "#5C6E81" },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_BADGE[status] ?? { dot: "#5C6E81", label: status, color: "#5C6E81" };
  return (
    <span className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-montserrat)" }}>
      <span className="inline-block w-2 h-2 shrink-0" style={{ backgroundColor: meta.dot, borderRadius: "50%" }} />
      <span className="text-xs" style={{ color: meta.color }}>{meta.label}</span>
    </span>
  );
}

const labelClass = "block text-xs text-steel uppercase tracking-wider mb-1";
const inputClass = "border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm";

interface FormState {
  partner_id: string;
  project_id: string;
  name: string;
  monthly_amount: string;
  invoice_day: string;
  currency: string;
  services_description: string;
  start_date: string;
  end_date: string;
}

const emptyForm: FormState = {
  partner_id: "", project_id: "", name: "",
  monthly_amount: "", invoice_day: "1", currency: "ZAR",
  services_description: "", start_date: "", end_date: "",
};

export default function RetainersPage() {
  const supabase = createClient();
  const [retainers, setRetainers] = useState<Retainer[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: retainerData }, { data: partnerData }] = await Promise.all([
      supabase.from("retainers").select("*").order("created_at", { ascending: false }),
      supabase.from("partners").select("id, company_name").order("company_name"),
    ]);
    setRetainers((retainerData ?? []) as Retainer[]);
    setPartners((partnerData ?? []) as Partner[]);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Load projects when partner changes
  useEffect(() => {
    if (!form.partner_id) { setProjects([]); return; }
    supabase.from("projects").select("id, name").eq("partner_id", form.partner_id).then(({ data }: { data: Project[] | null }) => {
      setProjects((data ?? []) as Project[]);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.partner_id]);

  function handleChange(name: string, val: string) {
    setForm((prev) => ({ ...prev, [name]: val }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.partner_id) { setFormError("Client is required."); return; }
    if (!form.name.trim()) { setFormError("Name is required."); return; }
    if (!form.monthly_amount) { setFormError("Monthly amount is required."); return; }
    if (!form.start_date) { setFormError("Start date is required."); return; }
    setSaving(true); setFormError(null);

    const { error } = await supabase.from("retainers").insert({
      partner_id: form.partner_id,
      project_id: form.project_id || null,
      name: form.name.trim(),
      monthly_amount: parseFloat(form.monthly_amount),
      invoice_day: parseInt(form.invoice_day) || 1,
      currency: form.currency,
      services_description: form.services_description.trim() || null,
      start_date: form.start_date,
      end_date: form.end_date || null,
      status: "active",
    });

    setSaving(false);
    if (error) { setFormError(error.message); return; }
    setForm(emptyForm);
    setShowForm(false);
    await loadData();
  }

  async function updateStatus(id: string, status: "active" | "paused" | "cancelled") {
    setActionLoading(id);
    await supabase.from("retainers").update({ status }).eq("id", id);
    setActionLoading(null);
    await loadData();
  }

  const partnerName = (id: string) => partners.find((p) => p.id === id)?.company_name ?? "—";

  return (
    <>
      <div
        className="fixed top-0 right-0 flex items-center justify-between px-8 bg-white border-b border-linen z-10"
        style={{ left: "240px", height: "56px" }}
      >
        <h2 className="text-navy font-bold text-lg" style={{ fontFamily: "var(--font-inter)" }}>Retainers</h2>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 text-white text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
        >
          {showForm ? "Cancel" : "+ New Retainer"}
        </button>
      </div>

      <main className="pt-[56px] p-8">
        {showForm && (
          <form onSubmit={handleSave}>
            <div className="bg-white border border-linen p-6 mb-6" style={{ borderRadius: 0 }}>
              <h4 className="text-navy font-bold text-xs uppercase tracking-wider mb-5" style={{ fontFamily: "var(--font-inter)" }}>
                New Retainer
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Client *</label>
                  <select
                    value={form.partner_id} onChange={(e) => handleChange("partner_id", e.target.value)} required
                    className="border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm"
                    style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  >
                    <option value="">— Select client —</option>
                    {partners.map((p) => <option key={p.id} value={p.id}>{p.company_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Project (optional)</label>
                  <select
                    value={form.project_id} onChange={(e) => handleChange("project_id", e.target.value)}
                    disabled={!form.partner_id}
                    className="border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm disabled:opacity-50"
                    style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  >
                    <option value="">— None —</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Retainer Name *</label>
                  <input
                    type="text" required value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Monthly Amount *</label>
                  <input
                    type="number" min="0" step="any" required value={form.monthly_amount}
                    onChange={(e) => handleChange("monthly_amount", e.target.value)}
                    className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Invoice Day (1–28)</label>
                  <input
                    type="number" min="1" max="28" value={form.invoice_day}
                    onChange={(e) => handleChange("invoice_day", e.target.value)}
                    className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Currency</label>
                  <select
                    value={form.currency} onChange={(e) => handleChange("currency", e.target.value)}
                    className="border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm"
                    style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  >
                    <option value="ZAR">ZAR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Start Date *</label>
                  <input
                    type="date" required value={form.start_date}
                    onChange={(e) => handleChange("start_date", e.target.value)}
                    className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>End Date (optional)</label>
                  <input
                    type="date" value={form.end_date}
                    onChange={(e) => handleChange("end_date", e.target.value)}
                    className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Services Description</label>
                  <textarea
                    rows={3} value={form.services_description}
                    onChange={(e) => handleChange("services_description", e.target.value)}
                    className="border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm resize-y"
                    style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
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
                  {saving ? "Saving…" : "Create Retainer"}
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

        <div className="bg-white border border-linen overflow-x-auto" style={{ borderRadius: 0 }}>
          {loading ? (
            <p className="px-4 py-6 text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>Loading…</p>
          ) : retainers.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>No retainers yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
              <thead>
                <tr className="border-b border-linen" style={{ backgroundColor: "rgba(234,228,220,0.5)" }}>
                  <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Client</th>
                  <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Name</th>
                  <th className="text-right px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Monthly</th>
                  <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Next Invoice</th>
                  <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Status</th>
                  <th className="px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {retainers.map((r) => (
                  <tr key={r.id} className="border-b border-linen last:border-0 hover:bg-linen/20 transition-colors">
                    <td className="px-4 py-3 text-ink font-medium">{partnerName(r.partner_id)}</td>
                    <td className="px-4 py-3 text-ink">{r.name}</td>
                    <td className="px-4 py-3 text-ink text-right">{formatZAR(r.monthly_amount)}</td>
                    <td className="px-4 py-3 text-steel">
                      {r.status === "active" ? nextInvoiceDate(r.invoice_day, r.last_invoice_date) : "—"}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {r.status === "active" && (
                          <button
                            type="button"
                            disabled={actionLoading === r.id}
                            onClick={() => updateStatus(r.id, "paused")}
                            className="text-xs text-steel hover:text-amber-600 transition-colors underline"
                            style={{ fontFamily: "var(--font-montserrat)" }}
                          >
                            Pause
                          </button>
                        )}
                        {r.status === "paused" && (
                          <button
                            type="button"
                            disabled={actionLoading === r.id}
                            onClick={() => updateStatus(r.id, "active")}
                            className="text-xs text-steel hover:text-green-600 transition-colors underline"
                            style={{ fontFamily: "var(--font-montserrat)" }}
                          >
                            Resume
                          </button>
                        )}
                        {r.status !== "cancelled" && (
                          <button
                            type="button"
                            disabled={actionLoading === r.id}
                            onClick={() => updateStatus(r.id, "cancelled")}
                            className="text-xs text-steel hover:text-red-500 transition-colors underline"
                            style={{ fontFamily: "var(--font-montserrat)" }}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </>
  );
}

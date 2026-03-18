"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VentureOwnership {
  [ownerName: string]: number;
}

interface VenturePartner {
  id: string;
  company_name: string;
  notes: string | null;
  show_on_site: boolean | null;
  type: string | null;
  venture_ownership: VentureOwnership | null;
  status: string | null;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const labelClass = "block text-xs text-steel uppercase tracking-wider mb-1";
const inputClass = "border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm";

// ---------------------------------------------------------------------------
// OwnershipSummary
// ---------------------------------------------------------------------------

function OwnershipSummary({ ownership }: { ownership: VentureOwnership | null }) {
  if (!ownership || Object.keys(ownership).length === 0) {
    return <span className="text-xs text-steel" style={{ fontFamily: "var(--font-montserrat)" }}>No ownership set</span>;
  }
  const parts = Object.entries(ownership).map(([name, pct]) => `${name} ${pct}%`);
  return (
    <span className="text-xs text-steel" style={{ fontFamily: "var(--font-montserrat)" }}>
      {parts.join(" · ")}
    </span>
  );
}

// ---------------------------------------------------------------------------
// StatusDot
// ---------------------------------------------------------------------------

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  active:       { color: "#22c55e", label: "Active" },
  paused:       { color: "#f59e0b", label: "Paused" },
  winding_down: { color: "#ef4444", label: "Winding Down" },
  exited:       { color: "#5C6E81", label: "Exited" },
};

function StatusDot({ status }: { status: string | null }) {
  const meta = STATUS_MAP[status ?? ""] ?? { color: "#5C6E81", label: status ?? "Unknown" };
  return (
    <span className="flex items-center gap-1.5 text-xs" style={{ fontFamily: "var(--font-montserrat)" }}>
      <span className="inline-block w-1.5 h-1.5 shrink-0" style={{ backgroundColor: meta.color, borderRadius: 0 }} />
      <span style={{ color: meta.color }}>{meta.label}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface NewVentureForm {
  company_name: string;
  notes: string;
  founding_date: string;
}

const emptyForm: NewVentureForm = {
  company_name: "",
  notes: "",
  founding_date: "",
};

export default function VenturesPage() {
  const supabase = createClient();

  const [ventures, setVentures] = useState<VenturePartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewVentureForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("partners")
      .select("id, company_name, notes, show_on_site, type, venture_ownership, status")
      .eq("type", "venture")
      .order("company_name");
    setVentures((data ?? []) as VenturePartner[]);
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  function handleChange(name: string, val: string) {
    setForm((prev) => ({ ...prev, [name]: val }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company_name.trim()) { setFormError("Company name is required."); return; }
    setSaving(true); setFormError(null);

    const { error } = await supabase.from("partners").insert({
      company_name: form.company_name.trim(),
      notes: form.notes.trim() || null,
      founding_date: form.founding_date || null,
      type: "venture",
      status: "active",
    });

    setSaving(false);
    if (error) { setFormError(error.message); return; }
    setForm(emptyForm);
    setShowForm(false);
    await load();
  }

  return (
    <>
      {/* Top bar */}
      <div
        className="fixed top-0 right-0 flex items-center justify-between px-8 bg-white border-b border-linen z-10"
        style={{ left: "240px", height: "56px" }}
      >
        <h2 className="text-navy font-bold text-lg" style={{ fontFamily: "var(--font-inter)" }}>
          Ventures
        </h2>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 text-white text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
        >
          {showForm ? "Cancel" : "+ New Venture"}
        </button>
      </div>

      <main className="pt-[56px] p-8">

        {/* Inline create form */}
        {showForm && (
          <form onSubmit={handleSave}>
            <div className="bg-white border border-linen p-6 mb-6" style={{ borderRadius: 0 }}>
              <h4 className="text-navy font-bold text-xs uppercase tracking-wider mb-4" style={{ fontFamily: "var(--font-inter)" }}>
                New Venture
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Venture Name *</label>
                  <input
                    type="text" required value={form.company_name}
                    onChange={(e) => handleChange("company_name", e.target.value)}
                    className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Founding Date</label>
                  <input
                    type="date" value={form.founding_date}
                    onChange={(e) => handleChange("founding_date", e.target.value)}
                    className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Description</label>
                  <textarea
                    rows={3} value={form.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    className="border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm resize-y"
                    style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>
              </div>
              {formError && (
                <p className="mt-3 text-sm text-red-500" style={{ fontFamily: "var(--font-montserrat)" }}>{formError}</p>
              )}
              <div className="mt-4 flex gap-3">
                <button
                  type="submit" disabled={saving}
                  className="px-5 py-2 text-white text-sm font-semibold transition-opacity disabled:opacity-60"
                  style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
                >
                  {saving ? "Saving…" : "Save Venture"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setFormError(null); setForm(emptyForm); }}
                  className="text-sm text-steel hover:text-navy transition-colors"
                  style={{ fontFamily: "var(--font-montserrat)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Card grid */}
        {loading ? (
          <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>Loading…</p>
        ) : ventures.length === 0 ? (
          <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>No ventures yet. Create your first one above.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ventures.map((venture) => (
              <div
                key={venture.id}
                className="bg-white border border-linen p-6 flex flex-col gap-3"
                style={{ borderRadius: 0 }}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-navy font-bold text-sm leading-snug" style={{ fontFamily: "var(--font-inter)" }}>
                      {venture.company_name}
                    </h3>
                    <StatusDot status={venture.status} />
                  </div>
                  {venture.notes && (
                    <p className="text-xs text-steel line-clamp-2" style={{ fontFamily: "var(--font-montserrat)" }}>
                      {venture.notes}
                    </p>
                  )}
                </div>

                <OwnershipSummary ownership={venture.venture_ownership} />

                {venture.show_on_site && (
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 shrink-0" style={{ backgroundColor: "#22c55e", borderRadius: 0 }} />
                    <span className="text-xs text-steel" style={{ fontFamily: "var(--font-montserrat)" }}>Public</span>
                  </div>
                )}

                <div className="mt-auto pt-2">
                  <Link
                    href={`/admin/ventures/${venture.id}`}
                    className="inline-block px-4 py-1.5 border border-linen text-xs text-steel hover:border-navy hover:text-navy transition-colors"
                    style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  >
                    Open →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

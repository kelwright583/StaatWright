"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClientPartner {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  relationship_type: string | null;
  notes: string | null;
  show_on_site: boolean | null;
  type: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RELATIONSHIP_OPTIONS = [
  { value: "retainer",  label: "Retainer",  color: "#3b82f6" },
  { value: "project",   label: "Project",   color: "#8b5cf6" },
  { value: "advisory",  label: "Advisory",  color: "#f59e0b" },
  { value: "other",     label: "Other",     color: "#5C6E81" },
];

const FILTER_OPTIONS = [
  { label: "All",      value: "all" },
  { label: "Retainer", value: "retainer" },
  { label: "Project",  value: "project" },
  { label: "Advisory", value: "advisory" },
  { label: "Other",    value: "other" },
];

const labelClass = "block text-xs text-steel uppercase tracking-wider mb-1";
const inputClass = "border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm";
const selectClass = "border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm";

// ---------------------------------------------------------------------------
// RelationshipBadge
// ---------------------------------------------------------------------------

function RelationshipBadge({ type }: { type: string | null }) {
  const meta = RELATIONSHIP_OPTIONS.find((o) => o.value === type);
  if (!meta) return <span className="text-xs text-steel" style={{ fontFamily: "var(--font-montserrat)" }}>—</span>;
  return (
    <span className="flex items-center gap-1.5 text-xs" style={{ fontFamily: "var(--font-montserrat)" }}>
      <span className="inline-block w-2 h-2 shrink-0" style={{ backgroundColor: meta.color, borderRadius: 0 }} />
      <span style={{ color: meta.color }}>{meta.label}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface NewClientForm {
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  website: string;
  relationship_type: string;
  notes: string;
}

const emptyForm: NewClientForm = {
  company_name: "",
  contact_name: "",
  email: "",
  phone: "",
  website: "",
  relationship_type: "",
  notes: "",
};

export default function ClientsPage() {
  const supabase = createClient();

  const [clients, setClients] = useState<ClientPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewClientForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("partners")
      .select("id, company_name, contact_name, email, phone, website, relationship_type, notes, show_on_site, type")
      .eq("type", "client")
      .order("company_name");
    setClients((data ?? []) as ClientPartner[]);
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
      contact_name: form.contact_name.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      website: form.website.trim() || null,
      relationship_type: form.relationship_type || null,
      notes: form.notes.trim() || null,
      type: "client",
    });
    setSaving(false);
    if (error) { setFormError(error.message); return; }
    setForm(emptyForm);
    setShowForm(false);
    await load();
  }

  const filtered = clients
    .filter((c) => filter === "all" || c.relationship_type === filter)
    .filter((c) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        c.company_name.toLowerCase().includes(q) ||
        (c.contact_name ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q)
      );
    });

  return (
    <>
      {/* Top bar */}
      <div
        className="fixed top-0 right-0 flex items-center justify-between px-8 bg-white border-b border-linen z-10"
        style={{ left: "240px", height: "56px" }}
      >
        <h2 className="text-navy font-bold text-lg" style={{ fontFamily: "var(--font-inter)" }}>
          Clients
        </h2>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 text-white text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
        >
          {showForm ? "Cancel" : "+ New Client"}
        </button>
      </div>

      <main className="pt-[56px] p-8">

        {/* Inline create form */}
        {showForm && (
          <form onSubmit={handleSave}>
            <div className="bg-white border border-linen p-6 mb-6" style={{ borderRadius: 0 }}>
              <h4 className="text-navy font-bold text-xs uppercase tracking-wider mb-4" style={{ fontFamily: "var(--font-inter)" }}>
                New Client
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Company Name *</label>
                  <input
                    type="text" required value={form.company_name}
                    onChange={(e) => handleChange("company_name", e.target.value)}
                    className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Contact Name</label>
                  <input
                    type="text" value={form.contact_name}
                    onChange={(e) => handleChange("contact_name", e.target.value)}
                    className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Email</label>
                  <input
                    type="email" value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Phone</label>
                  <input
                    type="text" value={form.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Website</label>
                  <input
                    type="text" value={form.website}
                    onChange={(e) => handleChange("website", e.target.value)}
                    className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Relationship Type</label>
                  <select
                    value={form.relationship_type}
                    onChange={(e) => handleChange("relationship_type", e.target.value)}
                    className={selectClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  >
                    <option value="">— Select —</option>
                    {RELATIONSHIP_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Notes</label>
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
                  {saving ? "Saving…" : "Save Client"}
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

        {/* Filter + search bar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <input
            type="text"
            placeholder="Search clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-linen px-3 py-2 text-sm text-ink placeholder:text-steel/50 focus:outline-none focus:border-navy w-full sm:w-64"
            style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
          />
          <div className="flex items-center gap-1 border-b border-linen">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilter(opt.value)}
                className="px-4 py-2.5 text-xs uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap"
                style={{
                  borderBottomColor: filter === opt.value ? "#1F2A38" : "transparent",
                  color: filter === opt.value ? "#1F2A38" : "#5C6E81",
                  fontFamily: "var(--font-montserrat)",
                  borderRadius: 0,
                  marginBottom: "-1px",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Card grid */}
        {loading ? (
          <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>No clients found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((client) => (
              <div
                key={client.id}
                className="bg-white border border-linen p-6 flex flex-col gap-3"
                style={{ borderRadius: 0 }}
              >
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-navy font-bold text-sm leading-snug" style={{ fontFamily: "var(--font-inter)" }}>
                    {client.company_name}
                  </h3>
                  <RelationshipBadge type={client.relationship_type} />
                </div>

                <div className="flex flex-col gap-0.5 text-xs text-steel" style={{ fontFamily: "var(--font-montserrat)" }}>
                  {client.contact_name && <span>{client.contact_name}</span>}
                  {client.email && (
                    <a href={`mailto:${client.email}`} className="hover:text-navy underline transition-colors truncate">
                      {client.email}
                    </a>
                  )}
                </div>

                {client.show_on_site && (
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 shrink-0" style={{ backgroundColor: "#22c55e", borderRadius: 0 }} />
                    <span className="text-xs text-steel" style={{ fontFamily: "var(--font-montserrat)" }}>Public</span>
                  </div>
                )}

                <div className="mt-auto pt-2">
                  <Link
                    href={`/admin/clients/${client.id}`}
                    className="inline-block px-4 py-1.5 border border-linen text-xs text-steel hover:border-navy hover:text-navy transition-colors"
                    style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  >
                    View →
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

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Document, Brand, PartnerNote } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatZAR(n: number): string {
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}

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
  notes_log: PartnerNote[] | null;
  show_on_site: boolean | null;
  brand_id: string | null;
  type: string | null;
}

const RELATIONSHIP_OPTIONS = [
  { value: "retainer",  label: "Retainer" },
  { value: "project",   label: "Project" },
  { value: "advisory",  label: "Advisory" },
  { value: "other",     label: "Other" },
];

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

const statusMap: Record<string, { dot: string; label: string }> = {
  paid:      { dot: "bg-green-500",  label: "Paid" },
  overdue:   { dot: "bg-red-500",    label: "Overdue" },
  sent:      { dot: "bg-amber-500",  label: "Sent" },
  draft:     { dot: "bg-steel",      label: "Draft" },
  accepted:  { dot: "bg-green-400",  label: "Accepted" },
  declined:  { dot: "bg-red-400",    label: "Declined" },
  expired:   { dot: "bg-red-300",    label: "Expired" },
  cancelled: { dot: "bg-steel",      label: "Cancelled" },
  issued:    { dot: "bg-amber-400",  label: "Issued" },
};

function StatusBadge({ status }: { status: string }) {
  const entry = statusMap[status] ?? { dot: "bg-steel", label: status };
  return (
    <span className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-montserrat)" }}>
      <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${entry.dot}`} />
      <span className="text-xs text-steel capitalize">{entry.label}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const inputClass = "border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm";
const labelClass = "block text-xs text-steel uppercase tracking-wider mb-1";
const selectClass = "border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm";

// ---------------------------------------------------------------------------
// TabButton
// ---------------------------------------------------------------------------

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick}
      className="px-5 py-3 text-sm font-medium border-b-2 transition-colors"
      style={{
        borderBottomColor: active ? "#1F2A38" : "transparent",
        color: active ? "#1F2A38" : "#5C6E81",
        fontFamily: "var(--font-montserrat)",
        borderRadius: 0,
        marginBottom: "-1px",
      }}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// DocumentTable
// ---------------------------------------------------------------------------

function DocumentTable({ docs, newHref, newLabel, emptyMsg }: {
  docs: Document[]; newHref: string; newLabel: string; emptyMsg: string;
}) {
  return (
    <div>
      <div className="flex justify-end mb-4">
        <Link
          href={newHref}
          className="px-5 py-2 text-white text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
        >
          + {newLabel}
        </Link>
      </div>
      <div className="bg-white border border-linen overflow-x-auto" style={{ borderRadius: 0 }}>
        {docs.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>{emptyMsg}</p>
          </div>
        ) : (
          <table className="w-full text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
            <thead>
              <tr className="border-b border-linen" style={{ backgroundColor: "rgba(234,228,220,0.5)" }}>
                <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">#</th>
                <th className="text-right px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Amount</th>
                <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Status</th>
                <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Date</th>
                <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Due / Valid Until</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc.id} className="border-b border-linen last:border-0 hover:bg-linen/20 transition-colors">
                  <td className="px-4 py-3 text-ink">{doc.number}</td>
                  <td className="px-4 py-3 text-ink text-right">{formatZAR(doc.total ?? 0)}</td>
                  <td className="px-4 py-3"><StatusBadge status={doc.status} /></td>
                  <td className="px-4 py-3 text-steel">{formatDate(doc.issue_date)}</td>
                  <td className="px-4 py-3 text-steel">{formatDate(doc.due_date ?? doc.valid_until)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/${doc.type === "invoice" ? "invoices" : doc.type === "quote" ? "quotes" : "credit-notes"}/${doc.id}`}
                      className="text-xs text-steel hover:text-navy underline transition-colors"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit form state
// ---------------------------------------------------------------------------

interface EditForm {
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  website: string;
  relationship_type: string;
  notes: string;
  show_on_site: boolean;
  brand_id: string;
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();

  const [client, setClient] = useState<ClientPartner | null>(null);
  const [invoices, setInvoices] = useState<Document[]>([]);
  const [quotes, setQuotes] = useState<Document[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const [form, setForm] = useState<EditForm>({
    company_name: "", contact_name: "", email: "", phone: "",
    website: "", relationship_type: "", notes: "", show_on_site: false, brand_id: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Notes tab (append-only)
  const [newNoteText, setNewNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [
      { data: partnerData },
      { data: invoiceData },
      { data: quoteData },
      { data: brandsData },
    ] = await Promise.all([
      supabase.from("partners").select("*").eq("id", id).single(),
      supabase.from("documents").select("*").eq("partner_id", id).eq("type", "invoice").order("created_at", { ascending: false }),
      supabase.from("documents").select("*").eq("partner_id", id).eq("type", "quote").order("created_at", { ascending: false }),
      supabase.from("brands").select("id, name").order("name"),
    ]);

    if (partnerData) {
      const p = partnerData as ClientPartner;
      setClient(p);
      setForm({
        company_name: p.company_name,
        contact_name: p.contact_name ?? "",
        email: p.email ?? "",
        phone: p.phone ?? "",
        website: p.website ?? "",
        relationship_type: p.relationship_type ?? "",
        notes: p.notes ?? "",
        show_on_site: p.show_on_site ?? false,
        brand_id: p.brand_id ?? "",
      });
      // notes_log handled via partner state
    }

    setInvoices((invoiceData ?? []) as Document[]);
    setQuotes((quoteData ?? []) as Document[]);
    setBrands((brandsData ?? []) as Brand[]);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  function handleChange(name: string, val: string | boolean) {
    setForm((prev) => ({ ...prev, [name]: val }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company_name.trim()) { setSaveError("Company name is required."); return; }
    setSaving(true); setSaveError(null); setSaveSuccess(false);

    const { error } = await supabase.from("partners").update({
      company_name: form.company_name.trim(),
      contact_name: form.contact_name.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      website: form.website.trim() || null,
      relationship_type: form.relationship_type || null,
      notes: form.notes.trim() || null,
      show_on_site: form.show_on_site,
      brand_id: form.brand_id || null,
    }).eq("id", id);

    setSaving(false);
    if (error) { setSaveError(error.message); return; }
    setSaveSuccess(true);
    await loadData();
    setTimeout(() => setSaveSuccess(false), 3000);
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    setSavingNote(true);

    const { data: ownerData } = await supabase
      .from("owner_settings")
      .select("initials")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
      .single();

    const initials = ownerData?.initials ?? "SW";

    const newNote: PartnerNote = {
      text: newNoteText.trim(),
      created_at: new Date().toISOString(),
      initials,
    };

    const currentNotes = client?.notes_log ?? [];
    const updatedNotes = [...currentNotes, newNote];

    await supabase
      .from("partners")
      .update({ notes_log: updatedNotes })
      .eq("id", id);

    setNewNoteText("");
    setSavingNote(false);
    await loadData();
  }

  // ---------------------------------------------------------------------------
  // Render: loading / not found
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <>
        <div className="fixed top-0 right-0 flex items-center px-8 bg-white border-b border-linen z-10" style={{ left: "240px", height: "56px" }}>
          <h2 className="text-navy font-bold text-lg" style={{ fontFamily: "var(--font-inter)" }}>Client</h2>
        </div>
        <main className="pt-[56px] p-8">
          <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>Loading…</p>
        </main>
      </>
    );
  }

  if (!client) {
    return (
      <>
        <div className="fixed top-0 right-0 flex items-center px-8 bg-white border-b border-linen z-10" style={{ left: "240px", height: "56px" }}>
          <h2 className="text-navy font-bold text-lg" style={{ fontFamily: "var(--font-inter)" }}>Client Not Found</h2>
        </div>
        <main className="pt-[56px] p-8">
          <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
            Client not found.{" "}
            <Link href="/admin/clients" className="underline hover:text-navy">Back to Clients</Link>
          </p>
        </main>
      </>
    );
  }

  const tabs = [
    { value: "overview",  label: "Overview" },
    { value: "invoices",  label: `Invoices (${invoices.length})` },
    { value: "quotes",    label: `Quotes (${quotes.length})` },
    { value: "files",     label: "Files" },
    { value: "notes",     label: "Notes" },
  ];

  return (
    <>
      <div
        className="fixed top-0 right-0 flex items-center justify-between px-8 bg-white border-b border-linen z-10"
        style={{ left: "240px", height: "56px" }}
      >
        <h2 className="text-navy font-bold text-lg" style={{ fontFamily: "var(--font-inter)" }}>
          {client.company_name}
        </h2>
        <Link
          href={`/admin/clients/${id}/statement`}
          className="px-4 py-1.5 border border-linen text-xs text-steel hover:border-navy hover:text-navy transition-colors"
          style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
        >
          Statement
        </Link>
      </div>

      <main className="pt-[56px] p-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-steel mb-6" style={{ fontFamily: "var(--font-montserrat)" }}>
          <Link href="/admin/clients" className="hover:text-navy underline transition-colors">Clients</Link>
          <span>/</span>
          <span>{client.company_name}</span>
        </div>

        {/* Tabs */}
        <div className="border-b border-linen mb-6">
          <div className="flex gap-0 -mb-px" role="tablist">
            {tabs.map((tab) => (
              <TabButton key={tab.value} active={activeTab === tab.value} onClick={() => setActiveTab(tab.value)}>
                {tab.label}
              </TabButton>
            ))}
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Overview tab                                                        */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "overview" && (
          <form onSubmit={handleSave}>
            <div className="bg-white border border-linen p-8" style={{ borderRadius: 0 }}>
              <h3 className="text-navy font-bold text-xs uppercase tracking-wider mb-6" style={{ fontFamily: "var(--font-inter)" }}>
                Client Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Brand</label>
                  <select
                    value={form.brand_id}
                    onChange={(e) => handleChange("brand_id", e.target.value)}
                    className={selectClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  >
                    <option value="">— No brand linked —</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Notes</label>
                  <textarea
                    rows={4} value={form.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    className="border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm resize-y"
                    style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer" style={{ fontFamily: "var(--font-montserrat)" }}>
                    <input
                      type="checkbox"
                      checked={form.show_on_site}
                      onChange={(e) => handleChange("show_on_site", e.target.checked)}
                      className="w-4 h-4 accent-navy"
                      style={{ borderRadius: 0 }}
                    />
                    <span className="text-sm text-ink">Show on public site</span>
                  </label>
                </div>
              </div>
              {saveError && (
                <p className="mt-4 text-sm text-red-500" style={{ fontFamily: "var(--font-montserrat)" }}>{saveError}</p>
              )}
              {saveSuccess && (
                <p className="mt-4 text-sm text-green-600" style={{ fontFamily: "var(--font-montserrat)" }}>Saved successfully.</p>
              )}
              <div className="mt-8">
                <button
                  type="submit" disabled={saving}
                  className="px-6 py-2.5 text-white text-sm font-semibold transition-opacity disabled:opacity-60"
                  style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Invoices tab                                                        */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "invoices" && (
          <DocumentTable
            docs={invoices}
            newHref={`/admin/invoices/new?partner_id=${id}`}
            newLabel="New Invoice"
            emptyMsg="No invoices for this client yet."
          />
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Quotes tab                                                          */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "quotes" && (
          <DocumentTable
            docs={quotes}
            newHref={`/admin/quotes/new?partner_id=${id}`}
            newLabel="New Quote"
            emptyMsg="No quotes for this client yet."
          />
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Files tab                                                           */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "files" && (
          <div className="bg-white border border-linen p-8" style={{ borderRadius: 0 }}>
            <h3 className="text-navy font-bold text-xs uppercase tracking-wider mb-3" style={{ fontFamily: "var(--font-inter)" }}>
              Files
            </h3>
            <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
              Files coming soon. Upload and organise files in the{" "}
              <Link href="/admin/files" className="underline hover:text-navy transition-colors">Files section →</Link>
            </p>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Notes tab                                                           */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "notes" && (
          <div className="bg-white border border-linen p-8" style={{ borderRadius: 0 }}>
            <h3 className="text-navy font-bold text-xs uppercase tracking-wider mb-6"
                style={{ fontFamily: "var(--font-inter)" }}>
              Activity Notes
            </h3>

            <div className="space-y-3 mb-8">
              {(client?.notes_log ?? []).length === 0 ? (
                <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
                  No notes yet.
                </p>
              ) : (
                [...(client?.notes_log ?? [])].reverse().map((note: PartnerNote, i: number) => (
                  <div key={i} className="border-l-2 border-linen pl-4 py-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-navy"
                            style={{ fontFamily: "var(--font-inter)" }}>
                        {note.initials}
                      </span>
                      <span className="text-xs text-steel" style={{ fontFamily: "var(--font-montserrat)" }}>
                        {new Date(note.created_at).toLocaleDateString("en-ZA", {
                          day: "2-digit", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit"
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-ink" style={{ fontFamily: "var(--font-montserrat)" }}>
                      {note.text}
                    </p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddNote} className="border-t border-linen pt-6">
              <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>
                Add Note
              </label>
              <textarea
                rows={3}
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Add an internal note…"
                className="border border-linen focus:border-navy outline-none bg-transparent p-3 w-full text-ink text-sm resize-y mt-1"
                style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
              />
              <button
                type="submit"
                disabled={savingNote || !newNoteText.trim()}
                className="mt-3 px-5 py-2 text-white text-sm font-semibold transition-opacity disabled:opacity-40"
                style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
              >
                {savingNote ? "Saving…" : "Add Note"}
              </button>
            </form>
          </div>
        )}
      </main>
    </>
  );
}

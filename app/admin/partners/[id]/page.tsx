"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Partner, PartnerNote, Document, Project, PartnerRelationshipType } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatZAR(n: number): string {
  return `R ${n.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

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

const projectStatusMap: Record<string, { dot: string; label: string }> = {
  active:    { dot: "bg-green-500",  label: "Active" },
  complete:  { dot: "bg-blue-500",   label: "Complete" },
  on_hold:   { dot: "bg-amber-500",  label: "On Hold" },
  archived:  { dot: "bg-steel",      label: "Archived" },
};

function StatusBadge({ status, map = statusMap }: { status: string; map?: Record<string, { dot: string; label: string }> }) {
  const entry = map[status] ?? { dot: "bg-steel", label: status };
  return (
    <span
      className="flex items-center gap-1.5"
      style={{ fontFamily: "var(--font-montserrat)" }}
    >
      <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${entry.dot}`} />
      <span className="text-xs text-steel capitalize">{entry.label}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Shared field styles
// ---------------------------------------------------------------------------

const inputClass =
  "border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm";
const labelClass =
  "block text-xs text-steel uppercase tracking-wider mb-1";

function Field({
  label, name, value, onChange, type = "text", required = false,
}: {
  label: string; name: string; value: string; onChange: (name: string, val: string) => void;
  type?: string; required?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type} name={name} value={value} required={required}
        onChange={(e) => onChange(name, e.target.value)}
        className={inputClass}
        style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
      />
    </div>
  );
}

function TextareaField({
  label, name, value, onChange, rows = 4,
}: {
  label: string; name: string; value: string; onChange: (name: string, val: string) => void; rows?: number;
}) {
  return (
    <div className="flex flex-col">
      <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>{label}</label>
      <textarea
        name={name} rows={rows} value={value}
        onChange={(e) => onChange(name, e.target.value)}
        className="border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm resize-y"
        style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Document table
// ---------------------------------------------------------------------------

function DocumentTable({
  docs, newHref, newLabel, emptyMsg,
}: {
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
// Projects tab
// ---------------------------------------------------------------------------

interface NewProjectForm {
  name: string;
  status: string;
  start_date: string;
  end_date: string;
  budget_type: string;
  budget_amount: string;
  description: string;
}

const emptyProjectForm: NewProjectForm = {
  name: "", status: "active", start_date: "", end_date: "",
  budget_type: "none", budget_amount: "", description: "",
};

function ProjectsTab({ partnerId }: { partnerId: string }) {
  const supabase = createClient();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewProjectForm>(emptyProjectForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [timeLogs, setTimeLogs] = useState<Record<string, { date: string; hours: number; description: string | null; billable: boolean }[]>>({});

  const loadProjects = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false });
    setProjects((data ?? []) as Project[]);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  function handleFormChange(name: string, val: string) {
    setForm((prev) => ({ ...prev, [name]: val }));
  }

  async function handleSaveProject(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setFormError("Project name is required."); return; }
    setSaving(true); setFormError(null);
    const { error } = await supabase.from("projects").insert({
      partner_id: partnerId,
      name: form.name.trim(),
      status: form.status,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      budget_type: form.budget_type || null,
      budget_amount: form.budget_amount ? parseFloat(form.budget_amount) : null,
      description: form.description.trim() || null,
    });
    setSaving(false);
    if (error) { setFormError(error.message); return; }
    setForm(emptyProjectForm);
    setShowForm(false);
    await loadProjects();
  }

  async function toggleProjectTimeLogs(projectId: string) {
    if (expandedProject === projectId) {
      setExpandedProject(null);
      return;
    }
    setExpandedProject(projectId);
    if (!timeLogs[projectId]) {
      const { data } = await supabase
        .from("time_logs")
        .select("date, hours, description, billable")
        .eq("project_id", projectId)
        .order("date", { ascending: false });
      setTimeLogs((prev) => ({ ...prev, [projectId]: data ?? [] }));
    }
  }

  if (loading) return <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>Loading…</p>;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2 text-white text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
        >
          {showForm ? "Cancel" : "+ New Project"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSaveProject}>
          <div className="bg-white border border-linen p-6 mb-4" style={{ borderRadius: 0 }}>
            <h4 className="text-navy font-bold text-xs uppercase tracking-wider mb-4" style={{ fontFamily: "var(--font-inter)" }}>
              New Project
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Name *</label>
                <input
                  type="text" value={form.name} required
                  onChange={(e) => handleFormChange("name", e.target.value)}
                  className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                />
              </div>
              <div>
                <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Status</label>
                <select
                  value={form.status} onChange={(e) => handleFormChange("status", e.target.value)}
                  className="border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm"
                  style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                >
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="complete">Complete</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Start Date</label>
                <input type="date" value={form.start_date} onChange={(e) => handleFormChange("start_date", e.target.value)}
                  className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }} />
              </div>
              <div>
                <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>End Date (optional)</label>
                <input type="date" value={form.end_date} onChange={(e) => handleFormChange("end_date", e.target.value)}
                  className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }} />
              </div>
              <div>
                <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Budget Type</label>
                <select
                  value={form.budget_type} onChange={(e) => handleFormChange("budget_type", e.target.value)}
                  className="border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm"
                  style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                >
                  <option value="none">None</option>
                  <option value="fixed">Fixed</option>
                  <option value="time_and_materials">Time &amp; Materials</option>
                  <option value="retainer">Retainer</option>
                </select>
              </div>
              {form.budget_type !== "none" && (
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Budget Amount (R)</label>
                  <input
                    type="number" min="0" step="any" value={form.budget_amount}
                    onChange={(e) => handleFormChange("budget_amount", e.target.value)}
                    className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>
              )}
              <div className="sm:col-span-2">
                <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Description</label>
                <textarea
                  rows={3} value={form.description}
                  onChange={(e) => handleFormChange("description", e.target.value)}
                  className="border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm resize-y"
                  style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                />
              </div>
            </div>
            {formError && <p className="mt-3 text-sm text-red-500" style={{ fontFamily: "var(--font-montserrat)" }}>{formError}</p>}
            <div className="mt-4 flex gap-3">
              <button
                type="submit" disabled={saving}
                className="px-5 py-2 text-white text-sm font-semibold transition-opacity disabled:opacity-60"
                style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
              >
                {saving ? "Saving…" : "Save Project"}
              </button>
              <button
                type="button" onClick={() => { setShowForm(false); setFormError(null); setForm(emptyProjectForm); }}
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
        {projects.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>No projects yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
            <thead>
              <tr className="border-b border-linen" style={{ backgroundColor: "rgba(234,228,220,0.5)" }}>
                <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Name</th>
                <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Status</th>
                <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Start Date</th>
                <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Budget</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <>
                  <tr
                    key={project.id}
                    className="border-b border-linen last:border-0 hover:bg-linen/20 transition-colors cursor-pointer"
                    onClick={() => toggleProjectTimeLogs(project.id)}
                  >
                    <td className="px-4 py-3 text-ink font-medium">{project.name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={project.status} map={projectStatusMap} />
                    </td>
                    <td className="px-4 py-3 text-steel">{formatDate(project.start_date)}</td>
                    <td className="px-4 py-3 text-steel">
                      {project.budget_amount
                        ? `${formatZAR(project.budget_amount)} (${project.budget_type ?? ""})`
                        : project.budget_type && project.budget_type !== "none"
                        ? project.budget_type
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="text-xs text-steel hover:text-navy transition-colors"
                        onClick={(e) => { e.stopPropagation(); toggleProjectTimeLogs(project.id); }}
                      >
                        {expandedProject === project.id ? "▲ Hide logs" : "▼ Time logs"}
                      </button>
                    </td>
                  </tr>
                  {expandedProject === project.id && (
                    <tr key={`${project.id}-logs`}>
                      <td colSpan={5} className="px-4 py-3 bg-linen/20">
                        {!timeLogs[project.id] ? (
                          <p className="text-steel text-xs" style={{ fontFamily: "var(--font-montserrat)" }}>Loading…</p>
                        ) : timeLogs[project.id].length === 0 ? (
                          <p className="text-steel text-xs" style={{ fontFamily: "var(--font-montserrat)" }}>No time logged yet.</p>
                        ) : (
                          <table className="w-full text-xs" style={{ fontFamily: "var(--font-montserrat)" }}>
                            <thead>
                              <tr>
                                <th className="text-left py-1 text-steel uppercase tracking-wider">Date</th>
                                <th className="text-right py-1 text-steel uppercase tracking-wider">Hours</th>
                                <th className="text-left py-1 text-steel uppercase tracking-wider">Description</th>
                                <th className="text-left py-1 text-steel uppercase tracking-wider">Billable</th>
                              </tr>
                            </thead>
                            <tbody>
                              {timeLogs[project.id].map((log, i) => (
                                <tr key={i} className="border-t border-linen/50">
                                  <td className="py-1 text-steel">{formatDate(log.date)}</td>
                                  <td className="py-1 text-right text-ink">{log.hours}</td>
                                  <td className="py-1 text-ink">{log.description ?? "—"}</td>
                                  <td className="py-1 text-steel">{log.billable ? "Yes" : "No"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab button
// ---------------------------------------------------------------------------

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
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
// Edit form state
// ---------------------------------------------------------------------------

interface EditFormState {
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  vat_number: string;
  tags: string;
  relationship_type: PartnerRelationshipType | "";
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PartnerDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();

  const [partner, setPartner] = useState<Partner | null>(null);
  const [invoices, setInvoices] = useState<Document[]>([]);
  const [quotes, setQuotes] = useState<Document[]>([]);
  const [creditNotes, setCreditNotes] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("projects");

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>({
    company_name: "", contact_person: "", email: "",
    phone: "", address: "", vat_number: "", tags: "", relationship_type: "",
  });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Notes
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [
      { data: partnerData },
      { data: invoiceData },
      { data: quoteData },
      { data: cnData },
    ] = await Promise.all([
      supabase.from("partners").select("*").eq("id", id).single(),
      supabase.from("documents").select("*").eq("partner_id", id).eq("type", "invoice").order("created_at", { ascending: false }),
      supabase.from("documents").select("*").eq("partner_id", id).eq("type", "quote").order("created_at", { ascending: false }),
      supabase.from("documents").select("*").eq("partner_id", id).eq("type", "credit_note").order("created_at", { ascending: false }),
    ]);

    if (partnerData) {
      const p = partnerData as Partner;
      setPartner(p);
      setEditForm({
        company_name: p.company_name,
        contact_person: p.contact_person ?? "",
        email: p.email ?? "",
        phone: p.phone ?? "",
        address: p.address ?? "",
        vat_number: p.vat_number ?? "",
        tags: (p.tags ?? []).join(", "),
        relationship_type: (p.relationship_type as PartnerRelationshipType) ?? "",
      });
    }

    setInvoices((invoiceData ?? []) as Document[]);
    setQuotes((quoteData ?? []) as Document[]);
    setCreditNotes((cnData ?? []) as Document[]);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  function handleEditChange(name: string, val: string) {
    setEditForm((prev) => ({ ...prev, [name]: val }));
  }

  async function handleSave() {
    if (!editForm.company_name.trim()) { setEditError("Company name is required."); return; }
    setSaving(true); setEditError(null);

    const tagsArray = editForm.tags.split(",").map((t) => t.trim()).filter(Boolean);

    const { error } = await supabase.from("partners").update({
      company_name: editForm.company_name.trim(),
      contact_person: editForm.contact_person.trim() || null,
      email: editForm.email.trim() || null,
      phone: editForm.phone.trim() || null,
      address: editForm.address.trim() || null,
      vat_number: editForm.vat_number.trim() || null,
      tags: tagsArray,
      relationship_type: editForm.relationship_type || null,
    }).eq("id", id);

    setSaving(false);
    if (error) { setEditError(error.message || "Save failed."); return; }
    setEditing(false);
    await loadData();
  }

  async function handleAddNote() {
    if (!noteText.trim() || !partner) return;
    setAddingNote(true);
    const newNote: PartnerNote = { text: noteText.trim(), created_at: new Date().toISOString(), initials: "SW" };
    const updatedNotes = [...(partner.notes ?? []), newNote];
    const { error } = await supabase.from("partners").update({ notes: updatedNotes }).eq("id", id);
    setAddingNote(false);
    if (!error) { setNoteText(""); await loadData(); }
  }

  // ---------------------------------------------------------------------------
  // Render: loading
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <>
        <div className="fixed top-0 right-0 flex items-center px-8 bg-white border-b border-linen z-10" style={{ left: "240px", height: "56px" }}>
          <h2 className="text-navy font-bold text-lg" style={{ fontFamily: "var(--font-inter)" }}>Partner</h2>
        </div>
        <main className="pt-[56px] p-8">
          <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>Loading…</p>
        </main>
      </>
    );
  }

  if (!partner) {
    return (
      <>
        <div className="fixed top-0 right-0 flex items-center px-8 bg-white border-b border-linen z-10" style={{ left: "240px", height: "56px" }}>
          <h2 className="text-navy font-bold text-lg" style={{ fontFamily: "var(--font-inter)" }}>Partner Not Found</h2>
        </div>
        <main className="pt-[56px] p-8">
          <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
            Partner not found.{" "}
            <Link href="/admin/partners" className="underline hover:text-navy">Back to Partners</Link>
          </p>
        </main>
      </>
    );
  }

  const tabs = [
    { value: "projects",     label: "Projects" },
    { value: "invoices",     label: `Invoices (${invoices.length})` },
    { value: "quotes",       label: "Quotes" },
    { value: "credit-notes", label: "Credit Notes" },
    { value: "files",        label: "Files" },
    { value: "notes",        label: "Notes" },
  ];

  return (
    <>
      <div
        className="fixed top-0 right-0 flex items-center justify-between px-8 bg-white border-b border-linen z-10"
        style={{ left: "240px", height: "56px" }}
      >
        <h2 className="text-navy font-bold text-lg" style={{ fontFamily: "var(--font-inter)" }}>
          {partner.company_name}
        </h2>
      </div>

      <main className="pt-[56px] p-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-steel mb-6" style={{ fontFamily: "var(--font-montserrat)" }}>
          <Link href="/admin/partners" className="hover:text-navy underline transition-colors">Partners</Link>
          <span>/</span>
          <span>{partner.company_name}</span>
        </div>

        {/* Profile card */}
        <div className="bg-white border border-linen p-8 mb-6" style={{ borderRadius: 0 }}>
          {!editing ? (
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h1 className="text-navy font-bold" style={{ fontFamily: "var(--font-inter)", fontSize: "24px" }}>
                  {partner.company_name}
                </h1>
                <div className="flex flex-col gap-0.5 mt-1" style={{ fontFamily: "var(--font-montserrat)" }}>
                  {partner.contact_person && <span className="text-sm text-steel">{partner.contact_person}</span>}
                  {partner.email && (
                    <a href={`mailto:${partner.email}`} className="text-sm text-steel hover:text-navy underline transition-colors">
                      {partner.email}
                    </a>
                  )}
                  {partner.phone && <span className="text-sm text-steel">{partner.phone}</span>}
                  {partner.address && <span className="text-sm text-steel whitespace-pre-line">{partner.address}</span>}
                  {partner.vat_number && <span className="text-xs text-steel mt-1">VAT: {partner.vat_number}</span>}
                  {partner.relationship_type && (
                    <span className="text-xs text-steel mt-1 uppercase tracking-wider">
                      {partner.relationship_type.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                {(partner.tags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {(partner.tags ?? []).map((tag) => (
                      <span key={tag} className="border border-steel text-steel px-2 py-0.5 text-xs"
                        style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button" onClick={() => setEditing(true)}
                className="shrink-0 px-4 py-2 border border-linen text-sm text-steel hover:text-navy hover:border-navy transition-colors"
                style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
              >
                Edit Details
              </button>
            </div>
          ) : (
            <div>
              <h3 className="text-navy font-bold text-sm uppercase tracking-wider mb-6" style={{ fontFamily: "var(--font-inter)" }}>
                Edit Partner Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <Field label="Company Name" name="company_name" value={editForm.company_name} onChange={handleEditChange} required />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Relationship Type</label>
                  <select
                    value={editForm.relationship_type}
                    onChange={(e) => handleEditChange("relationship_type", e.target.value)}
                    className="border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm"
                    style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  >
                    <option value="">— Select type —</option>
                    <option value="active_client">Active Client</option>
                    <option value="retainer_client">Retainer Client</option>
                    <option value="partner_build">Partner Build</option>
                    <option value="prospect">Prospect</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <Field label="Contact Person" name="contact_person" value={editForm.contact_person} onChange={handleEditChange} />
                <Field label="Email" name="email" value={editForm.email} onChange={handleEditChange} type="email" />
                <Field label="Phone" name="phone" value={editForm.phone} onChange={handleEditChange} />
                <Field label="VAT Number" name="vat_number" value={editForm.vat_number} onChange={handleEditChange} />
                <div className="sm:col-span-2">
                  <TextareaField label="Address" name="address" value={editForm.address} onChange={handleEditChange} />
                </div>
                <div className="sm:col-span-2">
                  <Field label="Tags (comma-separated)" name="tags" value={editForm.tags} onChange={handleEditChange} />
                </div>
              </div>
              {editError && <p className="mt-4 text-sm text-red-500" style={{ fontFamily: "var(--font-montserrat)" }}>{editError}</p>}
              <div className="mt-8 flex items-center gap-4">
                <button
                  type="button" disabled={saving} onClick={handleSave}
                  className="px-6 py-2.5 text-white text-sm font-semibold transition-opacity disabled:opacity-60"
                  style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  type="button" onClick={() => { setEditing(false); setEditError(null); }}
                  className="text-sm text-steel hover:text-navy transition-colors"
                  style={{ fontFamily: "var(--font-montserrat)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
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

        {/* Tab content */}
        {activeTab === "projects" && <ProjectsTab partnerId={id} />}

        {activeTab === "invoices" && (
          <DocumentTable
            docs={invoices}
            newHref={`/admin/invoices/new?partner_id=${id}`}
            newLabel="New Invoice"
            emptyMsg="No invoices for this partner yet."
          />
        )}

        {activeTab === "quotes" && (
          <DocumentTable
            docs={quotes}
            newHref={`/admin/quotes/new?partner_id=${id}`}
            newLabel="New Quote"
            emptyMsg="No quotes for this partner yet."
          />
        )}

        {activeTab === "credit-notes" && (
          <DocumentTable
            docs={creditNotes}
            newHref={`/admin/credit-notes/new?partner_id=${id}`}
            newLabel="New Credit Note"
            emptyMsg="No credit notes for this partner yet."
          />
        )}

        {activeTab === "files" && (
          <div className="bg-white border border-linen p-8" style={{ borderRadius: 0 }}>
            <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
              Upload files in the Files section and organise them into partner folders.{" "}
              <Link href="/admin/files" className="underline hover:text-navy transition-colors">Go to Files →</Link>
            </p>
          </div>
        )}

        {activeTab === "notes" && (
          <div className="bg-white border border-linen" style={{ borderRadius: 0 }}>
            {(partner.notes ?? []).length === 0 ? (
              <div className="px-6 py-8 text-center border-b border-linen">
                <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>No notes yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-linen">
                {(partner.notes ?? [])
                  .slice()
                  .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                  .map((note, i) => (
                    <li key={i} className="px-6 py-4 flex gap-4 items-start">
                      <span
                        className="shrink-0 w-8 h-8 flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: "#5C6E81", borderRadius: 0, fontFamily: "var(--font-inter)" }}
                      >
                        {note.initials}
                      </span>
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-xs text-steel" style={{ fontFamily: "var(--font-montserrat)" }}>
                          {new Date(note.created_at).toLocaleDateString("en-ZA", {
                            day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                        <p className="text-sm text-ink whitespace-pre-line" style={{ fontFamily: "var(--font-montserrat)" }}>
                          {note.text}
                        </p>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
            <div className="px-6 py-5 border-t border-linen">
              <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Add a note</label>
              <textarea
                rows={3} value={noteText} onChange={(e) => setNoteText(e.target.value)}
                placeholder="Type your note here…"
                className="border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm resize-y mt-1 placeholder:text-steel/50"
                style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
              />
              <div className="mt-3">
                <button
                  type="button" disabled={addingNote || !noteText.trim()} onClick={handleAddNote}
                  className="px-5 py-2 text-white text-sm font-semibold transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
                >
                  {addingNote ? "Adding…" : "Add Note"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

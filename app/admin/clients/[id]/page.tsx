"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as Tabs from "@radix-ui/react-tabs";
import { createClient } from "@/lib/supabase/client";
import type { Client, ClientNote, Document } from "@/lib/types";

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

function StatusBadge({ status }: { status: string }) {
  const entry = statusMap[status] ?? { dot: "bg-steel", label: status };
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
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, val: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <label
        className={labelClass}
        style={{ fontFamily: "var(--font-montserrat)" }}
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        required={required}
        onChange={(e) => onChange(name, e.target.value)}
        className={inputClass}
        style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
      />
    </div>
  );
}

function TextareaField({
  label,
  name,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, val: string) => void;
  rows?: number;
}) {
  return (
    <div className="flex flex-col">
      <label
        className={labelClass}
        style={{ fontFamily: "var(--font-montserrat)" }}
      >
        {label}
      </label>
      <textarea
        name={name}
        rows={rows}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        className="border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm resize-y"
        style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Document table (shared across Invoices / Quotes / Credit Notes tabs)
// ---------------------------------------------------------------------------

function DocumentTable({
  docs,
  newHref,
  newLabel,
  emptyMsg,
}: {
  docs: Document[];
  newHref: string;
  newLabel: string;
  emptyMsg: string;
}) {
  return (
    <div>
      <div className="flex justify-end mb-4">
        <Link
          href={newHref}
          className="px-5 py-2 text-white text-sm font-semibold transition-opacity hover:opacity-90"
          style={{
            backgroundColor: "#1F2A38",
            fontFamily: "var(--font-inter)",
            borderRadius: 0,
          }}
        >
          + {newLabel}
        </Link>
      </div>

      <div
        className="bg-white border border-linen overflow-x-auto"
        style={{ borderRadius: 0 }}
      >
        {docs.length === 0 ? (
          <div className="py-10 text-center">
            <p
              className="text-steel text-sm"
              style={{ fontFamily: "var(--font-montserrat)" }}
            >
              {emptyMsg}
            </p>
          </div>
        ) : (
          <table
            className="w-full text-sm"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            <thead>
              <tr
                className="border-b border-linen"
                style={{ backgroundColor: "rgba(234,228,220,0.5)" }}
              >
                <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">
                  #
                </th>
                <th className="text-right px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">
                  Amount
                </th>
                <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">
                  Date
                </th>
                <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">
                  Due / Valid Until
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr
                  key={doc.id}
                  className="border-b border-linen last:border-0 hover:bg-linen/20 transition-colors"
                >
                  <td className="px-4 py-3 text-ink">{doc.number}</td>
                  <td className="px-4 py-3 text-ink text-right">
                    {formatZAR(doc.total ?? 0)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="px-4 py-3 text-steel">
                    {formatDate(doc.issue_date)}
                  </td>
                  <td className="px-4 py-3 text-steel">
                    {formatDate(doc.due_date ?? doc.valid_until)}
                  </td>
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
// Tab trigger style
// ---------------------------------------------------------------------------

const tabTriggerClass =
  "px-5 py-3 text-sm font-medium border-b-2 transition-colors data-[state=active]:border-navy data-[state=active]:text-navy data-[state=inactive]:border-transparent data-[state=inactive]:text-steel hover:text-navy";

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

interface EditFormState {
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  vat_number: string;
  tags: string;
}

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();

  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Document[]>([]);
  const [quotes, setQuotes] = useState<Document[]>([]);
  const [creditNotes, setCreditNotes] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>({
    company_name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    vat_number: "",
    tags: "",
  });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Notes
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Load all data
  const loadData = useCallback(async () => {
    setLoading(true);

    const [
      { data: clientData },
      { data: invoiceData },
      { data: quoteData },
      { data: cnData },
    ] = await Promise.all([
      supabase.from("clients").select("*").eq("id", id).single(),
      supabase
        .from("documents")
        .select("*")
        .eq("client_id", id)
        .eq("type", "invoice")
        .order("created_at", { ascending: false }),
      supabase
        .from("documents")
        .select("*")
        .eq("client_id", id)
        .eq("type", "quote")
        .order("created_at", { ascending: false }),
      supabase
        .from("documents")
        .select("*")
        .eq("client_id", id)
        .eq("type", "credit_note")
        .order("created_at", { ascending: false }),
    ]);

    if (clientData) {
      const c = clientData as Client;
      setClient(c);
      setEditForm({
        company_name: c.company_name,
        contact_person: c.contact_person ?? "",
        email: c.email ?? "",
        phone: c.phone ?? "",
        address: c.address ?? "",
        vat_number: c.vat_number ?? "",
        tags: (c.tags ?? []).join(", "),
      });
    }

    setInvoices((invoiceData ?? []) as Document[]);
    setQuotes((quoteData ?? []) as Document[]);
    setCreditNotes((cnData ?? []) as Document[]);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleEditChange(name: string, val: string) {
    setEditForm((prev) => ({ ...prev, [name]: val }));
  }

  async function handleSave() {
    if (!editForm.company_name.trim()) {
      setEditError("Company name is required.");
      return;
    }
    setSaving(true);
    setEditError(null);

    const tagsArray = editForm.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const { error } = await supabase
      .from("clients")
      .update({
        company_name: editForm.company_name.trim(),
        contact_person: editForm.contact_person.trim() || null,
        email: editForm.email.trim() || null,
        phone: editForm.phone.trim() || null,
        address: editForm.address.trim() || null,
        vat_number: editForm.vat_number.trim() || null,
        tags: tagsArray,
      })
      .eq("id", id);

    setSaving(false);

    if (error) {
      setEditError(error.message || "Save failed.");
      return;
    }

    setEditing(false);
    await loadData();
  }

  async function handleAddNote() {
    if (!noteText.trim() || !client) return;
    setAddingNote(true);

    const newNote: ClientNote = {
      text: noteText.trim(),
      created_at: new Date().toISOString(),
      initials: "SW",
    };
    const updatedNotes = [...(client.notes ?? []), newNote];

    const { error } = await supabase
      .from("clients")
      .update({ notes: updatedNotes })
      .eq("id", id);

    setAddingNote(false);

    if (!error) {
      setNoteText("");
      await loadData();
    }
  }

  // ---------------------------------------------------------------------------
  // Render: loading
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <>
        <div
          className="fixed top-0 right-0 flex items-center px-8 bg-white border-b border-linen z-10"
          style={{ left: "240px", height: "56px" }}
        >
          <h2
            className="text-navy font-bold text-lg"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            Client
          </h2>
        </div>
        <main className="pt-[56px] p-8">
          <p
            className="text-steel text-sm"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            Loading…
          </p>
        </main>
      </>
    );
  }

  if (!client) {
    return (
      <>
        <div
          className="fixed top-0 right-0 flex items-center px-8 bg-white border-b border-linen z-10"
          style={{ left: "240px", height: "56px" }}
        >
          <h2
            className="text-navy font-bold text-lg"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            Client Not Found
          </h2>
        </div>
        <main className="pt-[56px] p-8">
          <p
            className="text-steel text-sm"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            Client not found.{" "}
            <Link href="/admin/clients" className="underline hover:text-navy">
              Back to Clients
            </Link>
          </p>
        </main>
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: full page
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Top bar */}
      <div
        className="fixed top-0 right-0 flex items-center justify-between px-8 bg-white border-b border-linen z-10"
        style={{ left: "240px", height: "56px" }}
      >
        <h2
          className="text-navy font-bold text-lg"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          {client.company_name}
        </h2>
      </div>

      <main className="pt-[56px] p-8">
        {/* Breadcrumb */}
        <div
          className="flex items-center gap-2 text-xs text-steel mb-6"
          style={{ fontFamily: "var(--font-montserrat)" }}
        >
          <Link
            href="/admin/clients"
            className="hover:text-navy underline transition-colors"
          >
            Clients
          </Link>
          <span>/</span>
          <span>{client.company_name}</span>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Header / profile card                                               */}
        {/* ------------------------------------------------------------------ */}

        <div
          className="bg-white border border-linen p-8 mb-6"
          style={{ borderRadius: 0 }}
        >
          {!editing ? (
            /* View mode */
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h1
                  className="text-navy font-bold"
                  style={{ fontFamily: "var(--font-inter)", fontSize: "24px" }}
                >
                  {client.company_name}
                </h1>

                <div
                  className="flex flex-col gap-0.5 mt-1"
                  style={{ fontFamily: "var(--font-montserrat)" }}
                >
                  {client.contact_person && (
                    <span className="text-sm text-steel">
                      {client.contact_person}
                    </span>
                  )}
                  {client.email && (
                    <a
                      href={`mailto:${client.email}`}
                      className="text-sm text-steel hover:text-navy underline transition-colors"
                    >
                      {client.email}
                    </a>
                  )}
                  {client.phone && (
                    <span className="text-sm text-steel">{client.phone}</span>
                  )}
                  {client.address && (
                    <span className="text-sm text-steel whitespace-pre-line">
                      {client.address}
                    </span>
                  )}
                  {client.vat_number && (
                    <span className="text-xs text-steel mt-1">
                      VAT: {client.vat_number}
                    </span>
                  )}
                </div>

                {/* Tags */}
                {(client.tags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {(client.tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        className="border border-steel text-steel px-2 py-0.5 text-xs"
                        style={{
                          fontFamily: "var(--font-montserrat)",
                          borderRadius: 0,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setEditing(true)}
                className="shrink-0 px-4 py-2 border border-linen text-sm text-steel hover:text-navy hover:border-navy transition-colors"
                style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
              >
                Edit Details
              </button>
            </div>
          ) : (
            /* Edit mode */
            <div>
              <h3
                className="text-navy font-bold text-sm uppercase tracking-wider mb-6"
                style={{ fontFamily: "var(--font-inter)" }}
              >
                Edit Client Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <Field
                    label="Company Name"
                    name="company_name"
                    value={editForm.company_name}
                    onChange={handleEditChange}
                    required
                  />
                </div>
                <Field
                  label="Contact Person"
                  name="contact_person"
                  value={editForm.contact_person}
                  onChange={handleEditChange}
                />
                <Field
                  label="Email"
                  name="email"
                  value={editForm.email}
                  onChange={handleEditChange}
                  type="email"
                />
                <Field
                  label="Phone"
                  name="phone"
                  value={editForm.phone}
                  onChange={handleEditChange}
                />
                <Field
                  label="VAT Number"
                  name="vat_number"
                  value={editForm.vat_number}
                  onChange={handleEditChange}
                />
                <div className="sm:col-span-2">
                  <TextareaField
                    label="Address"
                    name="address"
                    value={editForm.address}
                    onChange={handleEditChange}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Field
                    label="Tags (comma-separated)"
                    name="tags"
                    value={editForm.tags}
                    onChange={handleEditChange}
                  />
                </div>
              </div>

              {editError && (
                <p
                  className="mt-4 text-sm text-red-500"
                  style={{ fontFamily: "var(--font-montserrat)" }}
                >
                  {editError}
                </p>
              )}

              <div className="mt-8 flex items-center gap-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                  className="px-6 py-2.5 text-white text-sm font-semibold transition-opacity disabled:opacity-60"
                  style={{
                    backgroundColor: "#1F2A38",
                    fontFamily: "var(--font-inter)",
                    borderRadius: 0,
                  }}
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setEditError(null);
                  }}
                  className="text-sm text-steel hover:text-navy transition-colors"
                  style={{ fontFamily: "var(--font-montserrat)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Tabs                                                                */}
        {/* ------------------------------------------------------------------ */}

        <Tabs.Root defaultValue="invoices" className="w-full">
          <div className="border-b border-linen mb-6">
            <Tabs.List
              className="flex gap-0 -mb-px"
              aria-label="Client sections"
            >
              {[
                { value: "invoices",     label: "Invoices" },
                { value: "quotes",       label: "Quotes" },
                { value: "credit-notes", label: "Credit Notes" },
                { value: "files",        label: "Files" },
                { value: "notes",        label: "Notes" },
              ].map((tab) => (
                <Tabs.Trigger
                  key={tab.value}
                  value={tab.value}
                  className={tabTriggerClass}
                  style={{ fontFamily: "var(--font-montserrat)" }}
                >
                  {tab.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </div>

          {/* Invoices */}
          <Tabs.Content value="invoices">
            <DocumentTable
              docs={invoices}
              newHref={`/admin/invoices/new?client_id=${id}`}
              newLabel="New Invoice"
              emptyMsg="No invoices for this client yet."
            />
          </Tabs.Content>

          {/* Quotes */}
          <Tabs.Content value="quotes">
            <DocumentTable
              docs={quotes}
              newHref={`/admin/quotes/new?client_id=${id}`}
              newLabel="New Quote"
              emptyMsg="No quotes for this client yet."
            />
          </Tabs.Content>

          {/* Credit Notes */}
          <Tabs.Content value="credit-notes">
            <DocumentTable
              docs={creditNotes}
              newHref={`/admin/credit-notes/new?client_id=${id}`}
              newLabel="New Credit Note"
              emptyMsg="No credit notes for this client yet."
            />
          </Tabs.Content>

          {/* Files */}
          <Tabs.Content value="files">
            <div
              className="bg-white border border-linen p-8"
              style={{ borderRadius: 0 }}
            >
              <p
                className="text-steel text-sm"
                style={{ fontFamily: "var(--font-montserrat)" }}
              >
                Upload files in the Files section and organise them into client
                folders.{" "}
                <Link
                  href="/admin/files"
                  className="underline hover:text-navy transition-colors"
                >
                  Go to Files →
                </Link>
              </p>
            </div>
          </Tabs.Content>

          {/* Notes */}
          <Tabs.Content value="notes">
            <div
              className="bg-white border border-linen"
              style={{ borderRadius: 0 }}
            >
              {/* Existing notes */}
              {(client.notes ?? []).length === 0 ? (
                <div className="px-6 py-8 text-center border-b border-linen">
                  <p
                    className="text-steel text-sm"
                    style={{ fontFamily: "var(--font-montserrat)" }}
                  >
                    No notes yet.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-linen">
                  {(client.notes ?? [])
                    .slice()
                    .sort(
                      (a, b) =>
                        new Date(a.created_at).getTime() -
                        new Date(b.created_at).getTime()
                    )
                    .map((note, i) => (
                      <li key={i} className="px-6 py-4 flex gap-4 items-start">
                        {/* Initials bubble */}
                        <span
                          className="shrink-0 w-8 h-8 flex items-center justify-center text-xs font-bold text-white"
                          style={{
                            backgroundColor: "#5C6E81",
                            borderRadius: 0,
                            fontFamily: "var(--font-inter)",
                          }}
                        >
                          {note.initials}
                        </span>
                        <div className="flex flex-col gap-1 min-w-0">
                          <span
                            className="text-xs text-steel"
                            style={{ fontFamily: "var(--font-montserrat)" }}
                          >
                            {new Date(note.created_at).toLocaleDateString(
                              "en-ZA",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                          <p
                            className="text-sm text-ink whitespace-pre-line"
                            style={{ fontFamily: "var(--font-montserrat)" }}
                          >
                            {note.text}
                          </p>
                        </div>
                      </li>
                    ))}
                </ul>
              )}

              {/* Add note */}
              <div className="px-6 py-5 border-t border-linen">
                <label
                  className={labelClass}
                  style={{ fontFamily: "var(--font-montserrat)" }}
                >
                  Add a note
                </label>
                <textarea
                  rows={3}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Type your note here…"
                  className="border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm resize-y mt-1 placeholder:text-steel/50"
                  style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                />
                <div className="mt-3">
                  <button
                    type="button"
                    disabled={addingNote || !noteText.trim()}
                    onClick={handleAddNote}
                    className="px-5 py-2 text-white text-sm font-semibold transition-opacity disabled:opacity-50"
                    style={{
                      backgroundColor: "#1F2A38",
                      fontFamily: "var(--font-inter)",
                      borderRadius: 0,
                    }}
                  >
                    {addingNote ? "Adding…" : "Add Note"}
                  </button>
                </div>
              </div>
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </main>
    </>
  );
}

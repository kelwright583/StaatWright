"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatZAR } from "@/lib/utils";

interface InvoiceOption {
  id: string;
  number: string;
  partner_name: string | null;
  total: number | null;
}

interface Props {
  creditNoteId: string;
  // null  = column exists but no link set yet
  // undefined = column may not exist (graceful degradation)
  currentLinkedInvoiceId: string | null | undefined;
  columnExists: boolean;
}

const inputCls =
  "w-full border border-[#EAE4DC] bg-white px-3 py-2 text-sm text-[#1A1A1A] focus:outline-none focus:border-[#5C6E81] transition-colors";
export default function LinkedInvoice({ creditNoteId, currentLinkedInvoiceId, columnExists }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>(currentLinkedInvoiceId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const loadInvoices = useCallback(async () => {
    const { data } = await supabase
      .from("documents")
      .select("id, number, total, partner:partners(company_name)")
      .eq("type", "invoice")
      .order("number", { ascending: false });

    setInvoices(
      (data ?? []).map((d: { id: string; number: string; total: number | null; partner?: { company_name: string }[] | null }) => ({
        id: d.id,
        number: d.number,
        partner_name: Array.isArray(d.partner) ? (d.partner[0]?.company_name ?? null) : (d.partner as { company_name: string } | null)?.company_name ?? null,
        total: d.total,
      }))
    );
  }, [supabase]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const filtered = invoices.filter((inv) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      inv.number.toLowerCase().includes(q) ||
      (inv.partner_name ?? "").toLowerCase().includes(q)
    );
  });

  async function handleSave() {
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      const { error: updateErr } = await supabase
        .from("documents")
        .update({
          linked_document_id: selectedId || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", creditNoteId);

      if (updateErr) throw updateErr;
      setSuccess(true);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save linked invoice.");
    } finally {
      setSaving(false);
    }
  }

  if (!columnExists) {
    return (
      <div
        className="bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800"
        style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
      >
        <strong>Migration required:</strong> The <code>linked_document_id</code> column does not yet exist on the{" "}
        <code>documents</code> table. Run the following migration in your Supabase SQL editor:
        <pre className="mt-2 text-xs bg-amber-100 p-2 overflow-x-auto">
          {`ALTER TABLE documents\n  ADD COLUMN IF NOT EXISTS linked_document_id uuid\n    REFERENCES documents(id) ON DELETE SET NULL;`}
        </pre>
      </div>
    );
  }

  const linkedInvoice = invoices.find((inv) => inv.id === selectedId);

  return (
    <div
      className="bg-white border border-[#EAE4DC] p-6 space-y-4"
      style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
    >
      <p className="text-xs text-[#5C6E81] uppercase tracking-wider font-medium">
        Linked Invoice
      </p>

      {linkedInvoice && (
        <div className="text-sm text-[#1A1A1A] bg-[#F3F2EE] border border-[#EAE4DC] px-4 py-3 flex items-center justify-between">
          <span>
            <span className="font-semibold">{linkedInvoice.number}</span>
            {linkedInvoice.partner_name && (
              <span className="text-[#5C6E81] ml-2">— {linkedInvoice.partner_name}</span>
            )}
            {linkedInvoice.total != null && (
              <span className="text-[#5C6E81] ml-2">({formatZAR(linkedInvoice.total)})</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => setSelectedId("")}
            className="text-xs text-[#5C6E81] hover:text-red-500 underline ml-4 transition-colors"
          >
            Remove
          </button>
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-xs text-[#5C6E81] uppercase tracking-wider font-medium">
          Search invoices by number or client
        </label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="e.g. INV-0012 or Acme Corp"
          className={inputCls}
          style={{ borderRadius: 0 }}
        />

        {search.trim() && (
          <div
            className="border border-[#EAE4DC] bg-white max-h-48 overflow-y-auto"
            style={{ borderRadius: 0 }}
          >
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-[#5C6E81]">No invoices found.</p>
            ) : (
              <ul>
                {filtered.map((inv) => (
                  <li key={inv.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(inv.id);
                        setSearch("");
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[#F3F2EE] transition-colors flex items-center justify-between"
                    >
                      <span>
                        <span className="font-medium text-[#1A1A1A]">{inv.number}</span>
                        {inv.partner_name && (
                          <span className="text-[#5C6E81] ml-2 text-xs">— {inv.partner_name}</span>
                        )}
                      </span>
                      {inv.total != null && (
                        <span className="text-xs text-[#5C6E81] ml-4">{formatZAR(inv.total)}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
      {success && (
        <p className="text-xs text-green-600">Linked invoice saved.</p>
      )}

      <button
        type="button"
        disabled={saving}
        onClick={handleSave}
        className="px-4 py-2 bg-[#1F2A38] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        style={{ borderRadius: 0 }}
      >
        {saving ? "Saving…" : "Save Link"}
      </button>
    </div>
  );
}

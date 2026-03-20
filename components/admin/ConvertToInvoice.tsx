"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Document, CompanySettings } from "@/lib/types";

interface Props {
  quote: Document;
  settings: CompanySettings;
}

export default function ConvertToInvoice({ quote, settings }: Props) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligible = quote.status === "accepted" || quote.status === "sent";
  if (!eligible) return null;

  async function handleConvert() {
    setError(null);
    setConverting(true);
    try {
      const supabase = createClient();

      // Count existing invoices to generate next number
      const { count } = await supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("type", "invoice");

      const prefix = settings.invoice_prefix ?? "INV";
      const nextNumber = `${prefix}${String((count ?? 0) + 1).padStart(4, "0")}`;

      // Insert new invoice
      const { data: newInvoice, error: insertErr } = await supabase
        .from("documents")
        .insert({
          type: "invoice",
          number: nextNumber,
          status: "draft",
          partner_id: quote.partner_id,
          issue_date: new Date().toISOString().slice(0, 10),
          due_date: null,
          valid_until: null,
          line_items: quote.line_items,
          subtotal: quote.subtotal,
          vat_total: quote.vat_total,
          total: quote.total,
          notes: quote.notes,
          terms: quote.terms,
          converted_from_quote_id: quote.id,
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertErr) throw insertErr;

      // Update quote status to 'converted' (falls back to 'cancelled' if DB rejects it)
      const { error: quoteUpdateErr } = await supabase
        .from("documents")
        .update({ status: "converted", updated_at: new Date().toISOString() })
        .eq("id", quote.id);

      // If 'converted' isn't in the enum, try 'cancelled'
      if (quoteUpdateErr) {
        await supabase
          .from("documents")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("id", quote.id);
      }

      router.push(`/admin/invoices/${newInvoice.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Conversion failed. Please try again.");
      setConverting(false);
    }
  }

  return (
    <div className="mt-4">
      {!showConfirm ? (
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="w-full px-4 py-2.5 bg-[#1F2A38] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          style={{ borderRadius: 0, fontFamily: "var(--font-inter)" }}
        >
          Convert to Invoice
        </button>
      ) : (
        <div
          className="border border-[#EAE4DC] bg-[#F3F2EE] p-4 space-y-3"
          style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
        >
          <p className="text-sm text-[#1A1A1A]">
            This will create a new invoice pre-filled with this quote&apos;s line items. Continue?
          </p>
          {error && (
            <p className="text-red-600 text-xs">{error}</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConvert}
              disabled={converting}
              className="px-4 py-2 bg-[#1F2A38] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
              style={{ borderRadius: 0 }}
            >
              {converting ? "Converting…" : "Yes, Convert"}
            </button>
            <button
              type="button"
              onClick={() => { setShowConfirm(false); setError(null); }}
              disabled={converting}
              className="px-4 py-2 border border-[#EAE4DC] text-[#5C6E81] text-sm hover:border-[#5C6E81] hover:text-[#1F2A38] transition-colors disabled:opacity-50"
              style={{ borderRadius: 0 }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

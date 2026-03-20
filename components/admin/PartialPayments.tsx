"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { InvoicePayment } from "@/lib/types";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatZAR(amount: number): string {
  return `R ${amount.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const inputCls =
  "w-full border border-[#EAE4DC] bg-white px-3 py-2 text-sm text-[#1A1A1A] focus:outline-none focus:border-[#5C6E81] transition-colors";

interface Props {
  documentId: string;
  invoiceTotal: number;
  currency?: string | null;
}

export default function PartialPayments({ documentId, invoiceTotal, currency }: Props) {
  const [payments, setPayments] = useState<InvoicePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("invoice_payments")
      .select("*")
      .eq("document_id", documentId)
      .order("payment_date", { ascending: true });
    setPayments((data ?? []) as InvoicePayment[]);
    setLoading(false);
  }, [documentId]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const totalPaid = payments.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const balance = (invoiceTotal ?? 0) - totalPaid;

  const currencyLabel = currency && currency !== "ZAR" ? currency : null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    if (!paymentDate) {
      setError("Payment date is required.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();

      // Insert payment
      const { error: insertErr } = await supabase.from("invoice_payments").insert({
        document_id: documentId,
        amount: parsedAmount,
        payment_date: paymentDate,
        reference: reference || null,
        notes: notes || null,
      });
      if (insertErr) throw insertErr;

      // Calculate new sum including this payment
      const newTotal = totalPaid + parsedAmount;
      let newStatus: string;
      if (newTotal >= (invoiceTotal ?? 0)) {
        newStatus = "paid";
      } else {
        newStatus = "partially_paid";
      }

      const previousStatus = newTotal - parsedAmount > 0 ? "partially_paid" : "sent";

      // Update document status
      const { error: updateErr } = await supabase
        .from("documents")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", documentId);
      if (updateErr) throw updateErr;

      // Write document event
      await supabase.from("document_events").insert({
        document_id: documentId,
        event_type: newStatus === "paid" ? "paid" : "payment_recorded",
        detail: {
          from: previousStatus,
          to: newStatus,
          amount: parsedAmount,
          reference: reference || null,
        },
      });

      // Reset form and refetch
      setAmount("");
      setPaymentDate(todayISO());
      setReference("");
      setNotes("");
      setShowForm(false);
      await fetchPayments();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to record payment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="bg-white border border-[#EAE4DC] p-6"
      style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-[#5C6E81] uppercase tracking-wider font-medium">
          Partial Payments
        </p>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-xs bg-[#1F2A38] text-white px-3 py-1.5 hover:bg-[#1F2A38]/90 transition-colors"
            style={{ borderRadius: 0 }}
          >
            <Plus size={12} />
            Record Payment
          </button>
        )}
      </div>

      {/* Payments table */}
      {loading ? (
        <p className="text-sm text-[#5C6E81]">Loading…</p>
      ) : payments.length === 0 ? (
        <p className="text-sm text-[#5C6E81] italic">No payments recorded yet.</p>
      ) : (
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#EAE4DC]" style={{ backgroundColor: "rgba(234,228,220,0.5)" }}>
                <th className="text-left px-3 py-2 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">
                  Date
                </th>
                <th className="text-right px-3 py-2 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">
                  Amount {currencyLabel ? `(${currencyLabel})` : ""}
                </th>
                <th className="text-left px-3 py-2 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">
                  Reference
                </th>
                <th className="text-left px-3 py-2 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-[#EAE4DC] last:border-0">
                  <td className="px-3 py-2 text-[#1A1A1A]">{formatDate(p.payment_date)}</td>
                  <td className="px-3 py-2 text-right text-[#1A1A1A] whitespace-nowrap">
                    {formatZAR(p.amount)}
                  </td>
                  <td className="px-3 py-2 text-[#5C6E81]">{p.reference ?? "—"}</td>
                  <td className="px-3 py-2 text-[#5C6E81]">{p.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      <div className="flex gap-6 text-sm mt-3 pt-3 border-t border-[#EAE4DC]">
        <div>
          <span className="text-[#5C6E81] uppercase tracking-wider text-xs">Amount Paid: </span>
          <span className="text-[#1F2A38] font-semibold">{formatZAR(totalPaid)}</span>
        </div>
        <div>
          <span className="text-[#5C6E81] uppercase tracking-wider text-xs">Balance Outstanding: </span>
          <span className={`font-semibold ${balance <= 0 ? "text-green-600" : "text-[#1F2A38]"}`}>
            {formatZAR(Math.max(0, balance))}
          </span>
        </div>
      </div>

      {/* Inline form */}
      {showForm && (
        <form
          onSubmit={handleSave}
          className="mt-5 pt-5 border-t border-[#EAE4DC] space-y-4"
        >
          <p className="text-xs text-[#5C6E81] uppercase tracking-wider font-medium mb-3">
            New Payment
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs text-[#5C6E81] uppercase tracking-wider mb-1 font-medium"
              >
                Amount {currencyLabel ? `(${currencyLabel})` : ""} *
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                className={inputCls}
                style={{ borderRadius: 0 }}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs text-[#5C6E81] uppercase tracking-wider mb-1 font-medium">
                Payment Date *
              </label>
              <input
                type="date"
                required
                className={inputCls}
                style={{ borderRadius: 0 }}
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-[#5C6E81] uppercase tracking-wider mb-1 font-medium">
                Reference
              </label>
              <input
                type="text"
                className={inputCls}
                style={{ borderRadius: 0 }}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="EFT ref, cheque no., etc."
              />
            </div>
            <div>
              <label className="block text-xs text-[#5C6E81] uppercase tracking-wider mb-1 font-medium">
                Notes
              </label>
              <input
                type="text"
                className={inputCls}
                style={{ borderRadius: 0 }}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional note"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-xs">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#1F2A38] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
              style={{ borderRadius: 0 }}
            >
              {saving ? "Saving…" : "Save Payment"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setError(null);
                setAmount("");
                setPaymentDate(todayISO());
                setReference("");
                setNotes("");
              }}
              className="px-4 py-2 border border-[#EAE4DC] text-[#5C6E81] text-sm hover:border-[#5C6E81] hover:text-[#1F2A38] transition-colors"
              style={{ borderRadius: 0 }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

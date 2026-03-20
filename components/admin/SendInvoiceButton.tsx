"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function formatZAR(amount: number): string {
  return `R ${amount.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

interface Props {
  documentId: string;
  invoiceNumber: string;
  partnerEmail: string | null;
  partnerName: string | null;
  total: number;
}

export default function SendInvoiceButton({
  documentId,
  invoiceNumber,
  partnerEmail,
  partnerName,
  total,
}: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSend() {
    if (!partnerEmail) {
      setError("Partner has no email address. Please add an email first.");
      return;
    }

    setError(null);
    setSending(true);
    try {
      const res = await fetch("/api/invoices/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: documentId }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Failed to send invoice.");

      setSuccess(true);
      setTimeout(() => {
        setShowModal(false);
        setSuccess(false);
        router.refresh();
      }, 1500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "An unexpected error occurred.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
        style={{ borderRadius: 0, fontFamily: "var(--font-inter)" }}
      >
        Send Invoice
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !sending && setShowModal(false)}
          />
          <div
            className="relative bg-white border border-[#EAE4DC] p-6 w-full max-w-md space-y-4 z-10"
            style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
          >
            <h3
              className="text-lg font-bold text-[#1F2A38]"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              Send Invoice
            </h3>

            {success ? (
              <div className="py-6 text-center">
                <p className="text-green-600 font-semibold text-sm">Invoice sent successfully.</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#5C6E81]">To</span>
                    <span className="text-[#1A1A1A] font-medium">
                      {partnerEmail ?? (
                        <span className="text-red-500">No email</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5C6E81]">Client</span>
                    <span className="text-[#1A1A1A]">{partnerName ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5C6E81]">Subject</span>
                    <span className="text-[#1A1A1A]">
                      Invoice {invoiceNumber} from StaatWright Solutions
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5C6E81]">Amount</span>
                    <span className="text-[#1F2A38] font-semibold">{formatZAR(total)}</span>
                  </div>
                </div>

                {error && (
                  <p className="text-red-600 text-xs">{error}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    disabled={sending}
                    onClick={handleSend}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                    style={{ borderRadius: 0 }}
                  >
                    {sending ? "Sending…" : "Confirm & Send"}
                  </button>
                  <button
                    type="button"
                    disabled={sending}
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 border border-[#EAE4DC] text-[#5C6E81] text-sm hover:border-[#5C6E81] hover:text-[#1F2A38] transition-colors"
                    style={{ borderRadius: 0 }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

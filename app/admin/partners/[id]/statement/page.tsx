"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface StatementPartner {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
}

interface StatementRow {
  id: string;
  date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

function formatZAR(n: number): string {
  if (n === 0) return "—";
  return `R ${Math.abs(n).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PartnerStatementPage() {
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();

  const [client, setClient] = useState<StatementPartner | null>(null);
  const [rows, setRows] = useState<StatementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodStart, setPeriodStart] = useState<string | null>(null);
  const [periodEnd] = useState(new Date().toISOString().slice(0, 10));
  const [showEmailNotice, setShowEmailNotice] = useState(false);

  const today = new Date().toLocaleDateString("en-ZA", { day: "2-digit", month: "long", year: "numeric" });

  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data: partnerData } = await supabase
        .from("partners")
        .select("id, company_name, contact_name, email")
        .eq("id", id)
        .single();

      if (!partnerData) {
        setLoading(false);
        return;
      }
      setClient(partnerData as StatementPartner);

      const { data: invoicesData } = await supabase
        .from("documents")
        .select("id, number, created_at, due_date, total, status")
        .eq("partner_id", id)
        .eq("type", "invoice")
        .not("status", "eq", "cancelled")
        .order("created_at", { ascending: true });

      const invoices = invoicesData ?? [];

      if (invoices.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      const invoiceIds = invoices.map((inv) => inv.id);

      const { data: paymentsData } = await supabase
        .from("invoice_payments")
        .select("id, document_id, amount, payment_date, notes")
        .in("document_id", invoiceIds)
        .order("payment_date", { ascending: true });

      const { data: creditNotesData } = await supabase
        .from("documents")
        .select("id, number, created_at, total, linked_document_id")
        .eq("type", "credit_note")
        .in("linked_document_id", invoiceIds)
        .order("created_at", { ascending: true });

      type RawEvent = {
        date: string;
        reference: string;
        description: string;
        debit: number;
        credit: number;
      };

      const events: RawEvent[] = [];

      for (const inv of invoices) {
        events.push({
          date: inv.created_at?.slice(0, 10) ?? "",
          reference: inv.number ?? "—",
          description: `Invoice ${inv.number}`,
          debit: inv.total ?? 0,
          credit: 0,
        });
      }

      for (const pmt of paymentsData ?? []) {
        const inv = invoices.find((i) => i.id === pmt.document_id);
        events.push({
          date: pmt.payment_date?.slice(0, 10) ?? "",
          reference: `PMT-${pmt.id.slice(0, 8).toUpperCase()}`,
          description: pmt.notes ? `Payment — ${pmt.notes}` : `Payment received${inv ? ` (${inv.number})` : ""}`,
          debit: 0,
          credit: pmt.amount ?? 0,
        });
      }

      for (const cn of creditNotesData ?? []) {
        events.push({
          date: cn.created_at?.slice(0, 10) ?? "",
          reference: cn.number ?? `CN-${cn.id.slice(0, 8)}`,
          description: `Credit note ${cn.number ?? cn.id.slice(0, 8)}`,
          debit: 0,
          credit: cn.total ?? 0,
        });
      }

      events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

      let balance = 0;
      const statementRows: StatementRow[] = events.map((ev, i) => {
        balance += ev.debit - ev.credit;
        return {
          id: String(i),
          date: ev.date,
          reference: ev.reference,
          description: ev.description,
          debit: ev.debit,
          credit: ev.credit,
          balance,
        };
      });

      setRows(statementRows);
      if (events.length > 0) {
        setPeriodStart(events[0].date);
      }
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const totalOutstanding = rows.length > 0 ? rows[rows.length - 1].balance : 0;

  if (loading) {
    return (
      <main className="p-8">
        <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>Loading…</p>
      </main>
    );
  }

  if (!client) {
    return (
      <main className="p-8">
        <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
          Partner not found.{" "}
          <Link href="/admin/partners" className="underline hover:text-navy">Back to Partners</Link>
        </p>
      </main>
    );
  }

  return (
    <>
      <div
        className="fixed top-0 right-0 flex items-center justify-between px-8 bg-white border-b border-linen z-10 print:hidden"
        style={{ left: "240px", height: "56px" }}
      >
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/partners/${id}`}
            className="text-xs text-steel hover:text-navy underline transition-colors"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            ← Back to {client.company_name}
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowEmailNotice(true)}
            className="px-4 py-1.5 border border-linen text-xs text-steel hover:border-navy hover:text-navy transition-colors"
            style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
          >
            Send Statement
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-1.5 border border-navy text-xs text-navy hover:bg-navy hover:text-white transition-colors"
            style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
          >
            Print
          </button>
        </div>
      </div>

      {showEmailNotice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 print:hidden"
          onClick={() => setShowEmailNotice(false)}
        >
          <div
            className="bg-white border border-linen p-8 max-w-sm w-full mx-4"
            style={{ borderRadius: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-navy font-bold mb-2" style={{ fontFamily: "var(--font-inter)" }}>
              Send Statement
            </h3>
            <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
              Email feature coming soon. For now, use the Print button to generate a PDF and send it manually.
            </p>
            <button
              type="button"
              onClick={() => setShowEmailNotice(false)}
              className="mt-4 px-4 py-2 text-white text-sm font-semibold"
              style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <main
        className="pt-[56px] print:pt-0"
        style={{ fontFamily: "var(--font-montserrat)" }}
      >
        <div className="max-w-4xl mx-auto p-8 print:p-6 bg-white print:shadow-none">
          <div className="flex items-start justify-between mb-8 pb-6 border-b border-linen">
            <div>
              <p
                className="text-2xl font-bold tracking-tight"
                style={{ fontFamily: "var(--font-inter)", color: "#1F2A38" }}
              >
                StaatWright
              </p>
              <p className="text-xs text-steel uppercase tracking-widest mt-1">Creative & Technical Studio</p>
            </div>
            <div className="text-right">
              <p
                className="text-lg font-bold uppercase tracking-widest"
                style={{ fontFamily: "var(--font-inter)", color: "#1F2A38" }}
              >
                Statement of Account
              </p>
              <p className="text-xs text-steel mt-1">Statement Date: {today}</p>
              {periodStart && (
                <p className="text-xs text-steel">
                  Period: {formatDate(periodStart)} — {formatDate(periodEnd)}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-xs text-steel uppercase tracking-widest mb-2">Statement For</p>
              <p className="font-bold text-ink" style={{ fontFamily: "var(--font-inter)" }}>{client.company_name}</p>
              {client.contact_name && <p className="text-sm text-steel">{client.contact_name}</p>}
              {client.email && <p className="text-sm text-steel">{client.email}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs text-steel uppercase tracking-widest mb-2">Outstanding Balance</p>
              <p
                className="text-2xl font-bold"
                style={{
                  fontFamily: "var(--font-inter)",
                  color: totalOutstanding > 0 ? "#1F2A38" : "#16a34a",
                }}
              >
                R {Math.abs(totalOutstanding).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
              </p>
              {totalOutstanding < 0 && (
                <p className="text-xs text-green-600 mt-1">Credit in your favour</p>
              )}
              {totalOutstanding === 0 && (
                <p className="text-xs text-green-600 mt-1">Account settled</p>
              )}
            </div>
          </div>

          {rows.length === 0 ? (
            <p className="text-steel text-sm py-8 text-center">No transactions found for this partner.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-linen" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#1F2A38" }}>
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-white">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-white">Reference</th>
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-white">Description</th>
                    <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-white">Debit (R)</th>
                    <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-white">Credit (R)</th>
                    <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-white">Balance (R)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={row.id}
                      className="border-b border-linen"
                      style={{ backgroundColor: i % 2 === 0 ? "white" : "rgba(243,242,238,0.5)" }}
                    >
                      <td className="px-4 py-2.5 text-steel whitespace-nowrap">{formatDate(row.date)}</td>
                      <td className="px-4 py-2.5 text-steel font-mono text-xs">{row.reference}</td>
                      <td className="px-4 py-2.5 text-ink">{row.description}</td>
                      <td className="px-4 py-2.5 text-right text-ink">{row.debit > 0 ? formatZAR(row.debit) : "—"}</td>
                      <td className="px-4 py-2.5 text-right text-green-700">{row.credit > 0 ? formatZAR(row.credit) : "—"}</td>
                      <td
                        className="px-4 py-2.5 text-right font-medium"
                        style={{ color: row.balance > 0 ? "#1F2A38" : row.balance < 0 ? "#16a34a" : "#5C6E81" }}
                      >
                        {row.balance === 0
                          ? "R 0.00"
                          : `${row.balance < 0 ? "CR " : ""}R ${Math.abs(row.balance).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: "#1F2A38" }}>
                    <td colSpan={5} className="px-4 py-3 text-white font-bold text-xs uppercase tracking-wider">
                      Total Outstanding
                    </td>
                    <td className="px-4 py-3 text-white font-bold text-right">
                      {totalOutstanding < 0 ? "CR " : ""}R {Math.abs(totalOutstanding).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div className="mt-10 pt-6 border-t border-linen flex items-end justify-between">
            <div>
              <p className="text-xs text-steel" style={{ fontFamily: "var(--font-montserrat)" }}>
                This statement reflects all invoices, payments and credit notes on record.
              </p>
              <p className="text-xs text-steel mt-1">
                Queries: <span className="text-ink">hello@staatwright.com</span>
              </p>
            </div>
            <p
              className="text-sm font-medium"
              style={{ fontFamily: "var(--font-inter)", color: "#1F2A38" }}
            >
              Thank you for your business.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}

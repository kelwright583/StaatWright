import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import AdminTopBar from "@/components/admin/AdminTopBar";
import DocumentFilters from "@/components/admin/DocumentFilters";
import Link from "next/link";
import type { Document, Partner } from "@/lib/types";

function formatZAR(amount: number): string {
  return `R ${amount.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const STATUS_MAP: Record<string, { dot: string; label: string }> = {
  draft:    { dot: "bg-[#5C6E81]",  label: "Draft" },
  sent:     { dot: "bg-amber-500",  label: "Sent" },
  accepted: { dot: "bg-green-400",  label: "Accepted" },
  declined: { dot: "bg-red-400",    label: "Declined" },
  expired:  { dot: "bg-red-300",    label: "Expired" },
};

function StatusBadge({ status }: { status: string }) {
  const entry = STATUS_MAP[status] ?? { dot: "bg-[#5C6E81]", label: status };
  return (
    <span className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-montserrat)" }}>
      <span className={`inline-block w-2 h-2 shrink-0 ${entry.dot}`} />
      <span className="text-xs text-[#5C6E81] capitalize">{entry.label}</span>
    </span>
  );
}

const STATUSES = ["draft", "sent", "accepted", "declined", "expired"];

interface Props {
  searchParams: Promise<{ partner?: string; venture?: string; status?: string; from?: string; to?: string }>;
}

type QuoteRow = Document & {
  partner?: { company_name: string } | null;
  venture?: { company_name: string } | null;
};

export default async function QuotesPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: clientsData }, { data: venturesData }] = await Promise.all([
    supabase.from("partners").select("id, company_name").eq("type", "client").order("company_name"),
    supabase.from("partners").select("id, company_name").eq("type", "venture").order("company_name"),
  ]);

  const clients = (clientsData ?? []) as Pick<Partner, "id" | "company_name">[];
  const ventures = (venturesData ?? []) as Pick<Partner, "id" | "company_name">[];

  let query = supabase
    .from("documents")
    .select("*, partner:partners!partner_id(company_name), venture:partners!venture_id(company_name)")
    .eq("type", "quote")
    .order("created_at", { ascending: false });

  if (params.partner) query = query.eq("partner_id", params.partner);
  if (params.venture) query = query.eq("venture_id", params.venture);
  if (params.status) query = query.eq("status", params.status);
  if (params.from) query = query.gte("issue_date", params.from);
  if (params.to) query = query.lte("issue_date", params.to);

  const { data } = await query;
  const documents = (data ?? []) as QuoteRow[];

  return (
    <>
      <AdminTopBar
        title="Quotes"
        user={user ? { email: user.email ?? "" } : null}
      />
      <main className="pt-[56px] p-8">
        <div>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-[#1F2A38] font-bold text-xl" style={{ fontFamily: "var(--font-inter)" }}>
              All Quotes
            </h1>
            <Link
              href="/admin/quotes/new"
              className="px-5 py-2.5 text-white text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
            >
              + New Quote
            </Link>
          </div>

          <Suspense fallback={null}>
            <DocumentFilters
              partners={clients}
              ventures={ventures}
              statuses={STATUSES}
              basePath="/admin/quotes"
            />
          </Suspense>

          <div className="bg-white border border-[#EAE4DC] overflow-x-auto" style={{ borderRadius: 0 }}>
            {documents.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-[#5C6E81] text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
                  No quotes match the current filters.
                </p>
              </div>
            ) : (
              <table className="w-full text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
                <thead>
                  <tr className="border-b border-[#EAE4DC]" style={{ backgroundColor: "rgba(234,228,220,0.5)" }}>
                    <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">#</th>
                    <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Venture</th>
                    <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Client</th>
                    <th className="text-right px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Amount</th>
                    <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Issue Date</th>
                    <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Valid Until</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className="border-b border-[#EAE4DC] last:border-0 hover:bg-[#EAE4DC]/20 transition-colors"
                    >
                      <td className="px-4 py-3 text-[#1A1A1A] font-medium">{doc.number}</td>
                      <td className="px-4 py-3 text-[#5C6E81] text-xs">
                        {doc.venture?.company_name ?? <span className="text-[#EAE4DC]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-[#1A1A1A]">{doc.partner?.company_name ?? "—"}</td>
                      <td className="px-4 py-3 text-[#1A1A1A] text-right">{formatZAR(doc.total ?? 0)}</td>
                      <td className="px-4 py-3"><StatusBadge status={doc.status} /></td>
                      <td className="px-4 py-3 text-[#5C6E81]">
                        {doc.issue_date
                          ? new Date(doc.issue_date).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-[#5C6E81]">
                        {doc.valid_until
                          ? new Date(doc.valid_until).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/quotes/${doc.id}`}
                          className="text-xs text-[#5C6E81] hover:text-[#1F2A38] underline transition-colors"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="mt-4 flex gap-6 text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
            <span className="text-[#5C6E81]">
              {documents.length} quote{documents.length !== 1 ? "s" : ""}
            </span>
            <span className="text-[#5C6E81]">
              Total: <span className="font-semibold text-[#1F2A38]">
                {formatZAR(documents.reduce((sum, d) => sum + (d.total ?? 0), 0))}
              </span>
            </span>
          </div>
        </div>
      </main>
    </>
  );
}

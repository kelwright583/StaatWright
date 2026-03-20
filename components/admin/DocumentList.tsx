import Link from "next/link";
import type { Document } from "@/lib/types";

function formatZAR(amount: number): string {
  return `R ${amount.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const STATUS_MAP: Record<string, { dot: string; label: string }> = {
  paid:      { dot: "bg-green-500",  label: "Paid" },
  overdue:   { dot: "bg-red-500",    label: "Overdue" },
  sent:      { dot: "bg-amber-500",  label: "Sent" },
  draft:     { dot: "bg-[#5C6E81]",  label: "Draft" },
  accepted:  { dot: "bg-green-400",  label: "Accepted" },
  declined:  { dot: "bg-red-400",    label: "Declined" },
  expired:   { dot: "bg-red-300",    label: "Expired" },
  cancelled:      { dot: "bg-[#5C6E81]",  label: "Cancelled" },
  issued:         { dot: "bg-amber-400",  label: "Issued" },
  partially_paid: { dot: "bg-indigo-500", label: "Partially Paid" },
};

function StatusBadge({ status }: { status: string }) {
  const entry = STATUS_MAP[status] ?? { dot: "bg-[#5C6E81]", label: status };
  return (
    <span className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-montserrat)" }}>
      <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${entry.dot}`} />
      <span className="text-xs text-[#5C6E81] capitalize">{entry.label}</span>
    </span>
  );
}

const TYPE_LABELS: Record<string, { singular: string; segment: string; dateLabel: string }> = {
  invoice:     { singular: "Invoice",     segment: "invoices",     dateLabel: "Due Date" },
  quote:       { singular: "Quote",       segment: "quotes",       dateLabel: "Valid Until" },
  credit_note: { singular: "Credit Note", segment: "credit-notes", dateLabel: "Issue Date" },
};

export interface DocumentListProps {
  type: "invoice" | "quote" | "credit_note";
  documents: (Document & { partner?: { company_name: string } })[];
  newHref: string;
}

export default function DocumentList({ type, documents, newHref }: DocumentListProps) {
  const meta = TYPE_LABELS[type];

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-[#1F2A38] font-bold text-xl"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          All {meta.singular}s
        </h1>
        <Link
          href={newHref}
          className="px-5 py-2.5 text-white text-sm font-semibold transition-opacity hover:opacity-90"
          style={{
            backgroundColor: "#1F2A38",
            fontFamily: "var(--font-inter)",
            borderRadius: 0,
          }}
        >
          + New {meta.singular}
        </Link>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#EAE4DC] overflow-x-auto" style={{ borderRadius: 0 }}>
        {documents.length === 0 ? (
          <div className="py-16 text-center">
            <p
              className="text-[#5C6E81] text-sm"
              style={{ fontFamily: "var(--font-montserrat)" }}
            >
              No {meta.singular.toLowerCase()}s yet.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
            <thead>
              <tr
                className="border-b border-[#EAE4DC]"
                style={{ backgroundColor: "rgba(234,228,220,0.5)" }}
              >
                <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">
                  #
                </th>
                <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">
                  Partner
                </th>
                <th className="text-right px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">
                  Amount
                </th>
                <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">
                  Issue Date
                </th>
                <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">
                  {meta.dateLabel}
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const secondDate =
                  type === "invoice"
                    ? doc.due_date
                    : type === "quote"
                    ? doc.valid_until
                    : doc.issue_date;

                return (
                  <tr
                    key={doc.id}
                    className="border-b border-[#EAE4DC] last:border-0 hover:bg-[#EAE4DC]/20 transition-colors"
                  >
                    <td className="px-4 py-3 text-[#1A1A1A] font-medium">{doc.number}</td>
                    <td className="px-4 py-3 text-[#1A1A1A]">
                      {doc.partner?.company_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[#1A1A1A] text-right">
                      {formatZAR(doc.total ?? 0)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="px-4 py-3 text-[#5C6E81]">
                      {doc.issue_date
                        ? new Date(doc.issue_date).toLocaleDateString("en-ZA", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-[#5C6E81]">
                      {secondDate
                        ? new Date(secondDate).toLocaleDateString("en-ZA", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/${meta.segment}/${doc.id}`}
                        className="text-xs text-[#5C6E81] hover:text-[#1F2A38] underline transition-colors"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

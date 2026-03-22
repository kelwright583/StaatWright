import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ type?: string; q?: string }>;
}

const TYPE_FILTERS = [
  { label: "All", value: "all" },
  { label: "Clients", value: "client" },
  { label: "Ventures", value: "venture" },
];

function TypeBadge({ type }: { type: string }) {
  const isClient = type === "client";
  return (
    <span className="flex items-center gap-1.5 text-xs" style={{ fontFamily: "var(--font-montserrat)" }}>
      <span
        className="inline-block w-2 h-2 shrink-0"
        style={{ backgroundColor: isClient ? "#3b82f6" : "#f59e0b", borderRadius: 0 }}
      />
      <span style={{ color: isClient ? "#3b82f6" : "#f59e0b" }}>
        {isClient ? "Client" : "Venture"}
      </span>
    </span>
  );
}

function StatusDot({ status }: { status: string | null }) {
  const colors: Record<string, string> = {
    active: "#22c55e", paused: "#f59e0b", winding_down: "#ef4444", exited: "#5C6E81",
  };
  const color = colors[status ?? ""] ?? "#5C6E81";
  return (
    <span className="flex items-center gap-1.5 text-xs" style={{ fontFamily: "var(--font-montserrat)" }}>
      <span className="inline-block w-1.5 h-1.5 shrink-0" style={{ backgroundColor: color, borderRadius: 0 }} />
      <span className="text-steel capitalize">{(status ?? "unknown").replace("_", " ")}</span>
    </span>
  );
}

export default async function PartnersPage({ searchParams }: Props) {
  const { type, q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("partners")
    .select("id, company_name, type, relationship_type, status, brand_id, contact_name, email");

  if (type && type !== "all") {
    query = query.eq("type", type);
  }
  if (q) {
    query = query.ilike("company_name", `%${q}%`);
  }

  const { data: partners } = await query.order("company_name");

  const { data: outstandingData } = await supabase
    .from("documents")
    .select("partner_id, total")
    .eq("type", "invoice")
    .in("status", ["sent", "overdue"]);

  const outstandingByPartner: Record<string, number> = {};
  for (const d of (outstandingData ?? []) as { partner_id: string | null; total: number | null }[]) {
    if (d.partner_id) {
      outstandingByPartner[d.partner_id] = (outstandingByPartner[d.partner_id] ?? 0) + (d.total ?? 0);
    }
  }

  const activeType = type ?? "all";

  function formatZAR(n: number): string {
    return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return (
    <>
      <div
        className="fixed top-0 right-0 flex items-center justify-between px-8 bg-white border-b border-linen z-10"
        style={{ left: "240px", height: "56px" }}
      >
        <h2 className="text-navy font-bold text-lg" style={{ fontFamily: "var(--font-inter)" }}>
          Partners
        </h2>
        <Link
          href="/admin/partners/new"
          className="px-5 py-2.5 text-white text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
        >
          + New Partner
        </Link>
      </div>

      <main className="pt-[56px] p-8">
        {/* Filter tabs + search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <form method="get" className="contents">
            <input type="hidden" name="type" value={activeType} />
            <input
              type="text"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search partners…"
              className="border border-linen px-3 py-2 text-sm text-ink placeholder:text-steel/50 focus:outline-none focus:border-navy w-full sm:w-64"
              style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
            />
          </form>
          <div className="flex items-center gap-1 border-b border-linen">
            {TYPE_FILTERS.map((f) => (
              <Link
                key={f.value}
                href={`/admin/partners?type=${f.value}${q ? `&q=${q}` : ""}`}
                className="px-4 py-2.5 text-xs uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap"
                style={{
                  borderBottomColor: activeType === f.value ? "#1F2A38" : "transparent",
                  color: activeType === f.value ? "#1F2A38" : "#5C6E81",
                  fontFamily: "var(--font-montserrat)",
                  borderRadius: 0,
                  marginBottom: "-1px",
                }}
              >
                {f.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Card grid */}
        {!partners || partners.length === 0 ? (
          <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
            No partners found.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {partners.map((partner) => {
              const outstanding = outstandingByPartner[partner.id] ?? 0;
              return (
                <Link
                  key={partner.id}
                  href={`/admin/partners/${partner.id}`}
                  className="bg-white border border-linen p-6 flex flex-col gap-3 hover:border-navy/30 transition-colors group"
                  style={{ borderRadius: 0 }}
                >
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-navy font-bold text-sm leading-snug group-hover:text-navy" style={{ fontFamily: "var(--font-inter)" }}>
                      {partner.company_name}
                    </h3>
                    <TypeBadge type={partner.type} />
                  </div>

                  <div className="flex flex-col gap-0.5 text-xs text-steel" style={{ fontFamily: "var(--font-montserrat)" }}>
                    {partner.type === "client" && partner.relationship_type && (
                      <span className="capitalize">{partner.relationship_type}</span>
                    )}
                    {partner.type === "venture" && (
                      <StatusDot status={partner.status} />
                    )}
                    {partner.contact_name && <span>{partner.contact_name}</span>}
                  </div>

                  {outstanding > 0 && (
                    <div className="text-xs font-medium text-amber-600" style={{ fontFamily: "var(--font-montserrat)" }}>
                      Outstanding: {formatZAR(outstanding)}
                    </div>
                  )}

                  <div className="mt-auto pt-2">
                    <span
                      className="inline-block text-xs text-steel group-hover:text-navy transition-colors"
                      style={{ fontFamily: "var(--font-montserrat)" }}
                    >
                      Open →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}

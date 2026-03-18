"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Partner, PartnerRelationshipType } from "@/lib/types";

const RELATIONSHIP_LABELS: Record<string, { label: string; color: string }> = {
  active_client:   { label: "Active Client",   color: "#22c55e" },
  retainer_client: { label: "Retainer",         color: "#3b82f6" },
  partner_build:   { label: "Partner Build",    color: "#8b5cf6" },
  prospect:        { label: "Prospect",          color: "#f59e0b" },
  archived:        { label: "Archived",          color: "#5C6E81" },
};

const FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: "All",            value: "all" },
  { label: "Active Client",  value: "active_client" },
  { label: "Retainer",       value: "retainer_client" },
  { label: "Partner Build",  value: "partner_build" },
  { label: "Prospect",       value: "prospect" },
  { label: "Archived",       value: "archived" },
];

function RelationshipBadge({ type }: { type: string | null }) {
  const meta = type ? RELATIONSHIP_LABELS[type] : null;
  if (!meta) return <span className="text-xs text-steel" style={{ fontFamily: "var(--font-montserrat)" }}>—</span>;
  return (
    <span
      className="flex items-center gap-1.5 text-xs"
      style={{ fontFamily: "var(--font-montserrat)" }}
    >
      <span
        className="inline-block w-2 h-2 shrink-0"
        style={{ backgroundColor: meta.color, borderRadius: 0 }}
      />
      <span style={{ color: meta.color }}>{meta.label}</span>
    </span>
  );
}

export default function PartnersPage() {
  const supabase = createClient();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("partners")
        .select("*")
        .order("company_name");
      setPartners((data ?? []) as Partner[]);
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered =
    filter === "all"
      ? partners
      : partners.filter((p) => p.relationship_type === filter);

  return (
    <>
      <div
        className="fixed top-0 right-0 flex items-center justify-between px-8 bg-white border-b border-linen z-10"
        style={{ left: "240px", height: "56px" }}
      >
        <h2
          className="text-navy font-bold text-lg"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          Partners
        </h2>
        <Link
          href="/admin/partners/new"
          className="px-5 py-2.5 text-white text-sm font-semibold transition-opacity hover:opacity-90"
          style={{
            backgroundColor: "#1F2A38",
            fontFamily: "var(--font-inter)",
            borderRadius: 0,
          }}
        >
          + New Partner
        </Link>
      </div>

      <main className="pt-[56px] p-8">
        {/* Filter bar */}
        <div
          className="flex items-center gap-1 mb-6 border-b border-linen pb-0"
          style={{ fontFamily: "var(--font-montserrat)" }}
        >
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilter(opt.value)}
              className="px-4 py-2.5 text-xs uppercase tracking-widest border-b-2 transition-colors"
              style={{
                borderBottomColor: filter === opt.value ? "#1F2A38" : "transparent",
                color: filter === opt.value ? "#1F2A38" : "#5C6E81",
                fontFamily: "var(--font-montserrat)",
                borderRadius: 0,
                marginBottom: "-1px",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
            Loading…
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
            No partners found.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((partner) => (
              <div
                key={partner.id}
                className="bg-white border border-linen p-6 flex flex-col gap-3"
                style={{ borderRadius: 0 }}
              >
                <div className="flex flex-col gap-1">
                  <h3
                    className="text-navy font-bold text-sm leading-snug"
                    style={{ fontFamily: "var(--font-inter)" }}
                  >
                    {partner.company_name}
                  </h3>
                  <RelationshipBadge type={partner.relationship_type ?? null} />
                </div>

                <div
                  className="flex flex-col gap-0.5 text-xs text-steel"
                  style={{ fontFamily: "var(--font-montserrat)" }}
                >
                  {partner.contact_person && (
                    <span>{partner.contact_person}</span>
                  )}
                  {partner.email && (
                    <a
                      href={`mailto:${partner.email}`}
                      className="hover:text-navy underline transition-colors truncate"
                    >
                      {partner.email}
                    </a>
                  )}
                </div>

                <div className="mt-auto pt-2">
                  <Link
                    href={`/admin/partners/${partner.id}`}
                    className="inline-block px-4 py-1.5 border border-linen text-xs text-steel hover:border-navy hover:text-navy transition-colors"
                    style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  >
                    View →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

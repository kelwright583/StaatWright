"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface Props {
  partners: { id: string; company_name: string }[];
  statuses: string[];
  basePath: string;
  ventures?: { id: string; company_name: string }[];
}

export default function DocumentFilters({ partners, statuses, basePath, ventures }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const currentPartner = searchParams.get("partner") ?? "";
  const currentVenture = searchParams.get("venture") ?? "";
  const currentStatus = searchParams.get("status") ?? "";
  const currentFrom = searchParams.get("from") ?? "";
  const currentTo = searchParams.get("to") ?? "";

  const navigate = useCallback(
    (overrides: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(overrides)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      const qs = params.toString();
      router.push(`${basePath}${qs ? `?${qs}` : ""}`);
    },
    [searchParams, basePath, router]
  );

  const hasFilters = !!(currentPartner || currentVenture || currentStatus || currentFrom || currentTo);

  return (
    <div
      className="bg-white border border-[#EAE4DC] p-4 mb-6 flex flex-wrap items-end gap-4"
      style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
    >
      {/* Venture */}
      {ventures && ventures.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[#5C6E81] uppercase tracking-wider font-medium">
            Venture
          </label>
          <select
            value={currentVenture}
            onChange={(e) => navigate({ venture: e.target.value })}
            className="border border-[#EAE4DC] bg-white px-3 py-2 text-sm text-[#1A1A1A] min-w-[160px]"
            style={{ borderRadius: 0 }}
          >
            <option value="">All Ventures</option>
            {ventures.map((v) => (
              <option key={v.id} value={v.id}>
                {v.company_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Partner (client billed) */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-[#5C6E81] uppercase tracking-wider font-medium">
          Client
        </label>
        <select
          value={currentPartner}
          onChange={(e) => navigate({ partner: e.target.value })}
          className="border border-[#EAE4DC] bg-white px-3 py-2 text-sm text-[#1A1A1A] min-w-[180px]"
          style={{ borderRadius: 0 }}
        >
          <option value="">All Clients</option>
          {partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.company_name}
            </option>
          ))}
        </select>
      </div>

      {/* Status */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-[#5C6E81] uppercase tracking-wider font-medium">
          Status
        </label>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => navigate({ status: "" })}
            className={`px-3 py-2 text-xs border transition-colors ${
              !currentStatus
                ? "bg-[#1F2A38] text-white border-[#1F2A38]"
                : "border-[#EAE4DC] text-[#5C6E81] hover:border-[#5C6E81]"
            }`}
            style={{ borderRadius: 0 }}
          >
            All
          </button>
          {statuses.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => navigate({ status: s })}
              className={`px-3 py-2 text-xs border transition-colors capitalize ${
                currentStatus === s
                  ? "bg-[#1F2A38] text-white border-[#1F2A38]"
                  : "border-[#EAE4DC] text-[#5C6E81] hover:border-[#5C6E81]"
              }`}
              style={{ borderRadius: 0 }}
            >
              {s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Date range */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-[#5C6E81] uppercase tracking-wider font-medium">
          From
        </label>
        <input
          type="date"
          value={currentFrom}
          onChange={(e) => navigate({ from: e.target.value })}
          className="border border-[#EAE4DC] bg-white px-3 py-2 text-sm text-[#1A1A1A]"
          style={{ borderRadius: 0 }}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-[#5C6E81] uppercase tracking-wider font-medium">
          To
        </label>
        <input
          type="date"
          value={currentTo}
          onChange={(e) => navigate({ to: e.target.value })}
          className="border border-[#EAE4DC] bg-white px-3 py-2 text-sm text-[#1A1A1A]"
          style={{ borderRadius: 0 }}
        />
      </div>

      {/* Clear */}
      {hasFilters && (
        <button
          type="button"
          onClick={() => router.push(basePath)}
          className="text-xs text-[#5C6E81] hover:text-[#1F2A38] underline transition-colors self-end pb-2"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

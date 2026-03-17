import { createClient } from "@/lib/supabase/server";
import AdminTopBar from "@/components/admin/AdminTopBar";
import Link from "next/link";
import type { Brand, BrandStatus } from "@/lib/types";

function StatusBadge({ status }: { status: BrandStatus }) {
  const map: Record<BrandStatus, { dot: string; label: string }> = {
    active: { dot: "bg-green-500", label: "Active" },
    in_development: { dot: "bg-amber-500", label: "In Development" },
    archived: { dot: "bg-steel", label: "Archived" },
  };

  const entry = map[status] ?? { dot: "bg-steel", label: status };

  return (
    <span
      className="flex items-center gap-1.5"
      style={{ fontFamily: "var(--font-montserrat)" }}
    >
      <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${entry.dot}`} />
      <span className="text-xs text-steel capitalize">{entry.label}</span>
    </span>
  );
}

export default async function BrandsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: brands } = await supabase
    .from("brands")
    .select("*")
    .order("public_sort_order", { ascending: true });

  const brandList: Brand[] = brands ?? [];

  return (
    <>
      <AdminTopBar
        title="Brand Assets"
        user={user ? { email: user.email ?? "" } : null}
      />

      <main className="pt-[56px] p-8">
        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-navy font-bold text-lg"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            Brands
          </h2>
          <Link
            href="/admin/brands/new"
            className="px-5 py-2.5 text-white text-sm font-semibold transition-opacity hover:opacity-80"
            style={{
              backgroundColor: "#1F2A38",
              fontFamily: "var(--font-inter)",
              borderRadius: 0,
            }}
          >
            + New Brand
          </Link>
        </div>

        {brandList.length === 0 ? (
          <div
            className="bg-white border border-linen p-12 text-center"
            style={{ borderRadius: 0 }}
          >
            <p
              className="text-steel text-sm"
              style={{ fontFamily: "var(--font-montserrat)" }}
            >
              No brands yet. Create your first one.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {brandList.map((brand) => (
              <div
                key={brand.id}
                className="bg-white border border-linen p-6 flex flex-col gap-3 hover:border-steel transition-colors"
                style={{ borderRadius: 0 }}
              >
                {/* Name + status */}
                <div className="flex items-start justify-between gap-3">
                  <h3
                    className="text-navy font-bold text-base leading-tight"
                    style={{ fontFamily: "var(--font-inter)" }}
                  >
                    {brand.name}
                  </h3>
                  <StatusBadge status={brand.status} />
                </div>

                {/* Tagline */}
                {brand.tagline && (
                  <p
                    className="text-steel text-sm leading-snug"
                    style={{ fontFamily: "var(--font-montserrat)" }}
                  >
                    {brand.tagline}
                  </p>
                )}

                {/* Footer */}
                <div className="mt-auto pt-3 border-t border-linen flex items-center justify-between">
                  {brand.live_url ? (
                    <a
                      href={brand.live_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-steel hover:text-navy underline truncate max-w-[160px]"
                      style={{ fontFamily: "var(--font-montserrat)" }}
                    >
                      {brand.live_url.replace(/^https?:\/\//, "")}
                    </a>
                  ) : (
                    <span />
                  )}
                  <Link
                    href={`/admin/brands/${brand.id}`}
                    className="text-xs text-navy font-semibold hover:underline shrink-0"
                    style={{ fontFamily: "var(--font-montserrat)" }}
                  >
                    Edit →
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

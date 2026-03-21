import { createClient } from "@/lib/supabase/server";
import AdminTopBar from "@/components/admin/AdminTopBar";
import Link from "next/link";
import type { ServiceProvider } from "@/lib/types";

export default async function ServiceProvidersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("service_providers")
    .select("*")
    .order("name");

  const providers = (data ?? []) as ServiceProvider[];

  return (
    <>
      <AdminTopBar title="Service Providers" user={user ? { email: user.email ?? "" } : null} />
      <main className="pt-[56px] p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[#1F2A38] font-bold text-xl" style={{ fontFamily: "var(--font-inter)" }}>
            Service Providers
          </h1>
          <Link
            href="/admin/service-providers/new"
            className="px-5 py-2.5 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
          >
            + New Provider
          </Link>
        </div>

        <div className="bg-white border border-[#EAE4DC] overflow-x-auto" style={{ borderRadius: 0 }}>
          {providers.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-[#5C6E81] text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
                No service providers yet. Add your first vendor or supplier.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
              <thead>
                <tr className="border-b border-[#EAE4DC]" style={{ backgroundColor: "rgba(234,228,220,0.5)" }}>
                  <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Contact</th>
                  <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Email</th>
                  <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">VAT No.</th>
                  <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {providers.map((p) => (
                  <tr key={p.id} className="border-b border-[#EAE4DC] last:border-0 hover:bg-[#EAE4DC]/20 transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#1F2A38]">{p.name}</td>
                    <td className="px-4 py-3 text-[#5C6E81]">{p.contact_name ?? "—"}</td>
                    <td className="px-4 py-3 text-[#5C6E81]">{p.email ?? "—"}</td>
                    <td className="px-4 py-3 text-[#5C6E81]">{p.vat_number ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-block text-xs px-2 py-0.5 font-medium"
                        style={{
                          backgroundColor: p.is_active ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                          color: p.is_active ? "#16a34a" : "#dc2626",
                          borderRadius: 0,
                        }}
                      >
                        {p.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/service-providers/${p.id}`}
                        className="text-xs text-[#5C6E81] hover:text-[#1F2A38] underline transition-colors"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="mt-3 text-xs text-[#5C6E81]" style={{ fontFamily: "var(--font-montserrat)" }}>
          {providers.length} provider{providers.length !== 1 ? "s" : ""}
        </p>
      </main>
    </>
  );
}

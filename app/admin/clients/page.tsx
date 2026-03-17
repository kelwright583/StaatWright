import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AdminTopBar from "@/components/admin/AdminTopBar";
import type { Client } from "@/lib/types";

export default async function ClientsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .order("company_name");

  const rows = (clients ?? []) as Client[];

  return (
    <>
      <AdminTopBar
        title="Clients"
        user={user ? { email: user.email ?? "" } : null}
      />

      <main className="pt-[56px] p-8">
        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <h1
            className="text-navy font-bold text-xl"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            All Clients
          </h1>
          <Link
            href="/admin/clients/new"
            className="px-5 py-2.5 text-white text-sm font-semibold transition-opacity hover:opacity-90"
            style={{
              backgroundColor: "#1F2A38",
              fontFamily: "var(--font-inter)",
              borderRadius: 0,
            }}
          >
            + New Client
          </Link>
        </div>

        {/* Table */}
        <div
          className="bg-white border border-linen overflow-x-auto"
          style={{ borderRadius: 0 }}
        >
          {rows.length === 0 ? (
            <div className="py-16 text-center">
              <p
                className="text-steel text-sm"
                style={{ fontFamily: "var(--font-montserrat)" }}
              >
                No clients yet. Add your first client.
              </p>
            </div>
          ) : (
            <table
              className="w-full text-sm"
              style={{ fontFamily: "var(--font-montserrat)" }}
            >
              <thead>
                <tr
                  className="border-b border-linen"
                  style={{ backgroundColor: "rgba(234,228,220,0.5)" }}
                >
                  <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">
                    Company
                  </th>
                  <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">
                    Contact
                  </th>
                  <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">
                    Phone
                  </th>
                  <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">
                    Tags
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((client) => (
                  <tr
                    key={client.id}
                    className="border-b border-linen last:border-0 hover:bg-linen/20 transition-colors"
                  >
                    <td className="px-4 py-3 text-ink font-medium">
                      {client.company_name}
                    </td>
                    <td className="px-4 py-3 text-ink">
                      {client.contact_person ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-ink">
                      {client.email ? (
                        <a
                          href={`mailto:${client.email}`}
                          className="hover:text-navy underline transition-colors"
                        >
                          {client.email}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink">
                      {client.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(client.tags ?? []).length === 0 ? (
                          <span className="text-steel">—</span>
                        ) : (
                          (client.tags ?? []).map((tag) => (
                            <span
                              key={tag}
                              className="border border-steel text-steel px-2 py-0.5 text-xs"
                              style={{
                                fontFamily: "var(--font-montserrat)",
                                borderRadius: 0,
                              }}
                            >
                              {tag}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/clients/${client.id}`}
                        className="text-xs text-steel hover:text-navy underline transition-colors"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </>
  );
}

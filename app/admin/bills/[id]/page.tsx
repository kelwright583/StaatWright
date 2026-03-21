import { createClient } from "@/lib/supabase/server";
import AdminTopBar from "@/components/admin/AdminTopBar";
import BillBuilder from "@/components/admin/BillBuilder";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Bill, ServiceProvider } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

type BillStatus = "draft" | "received" | "paid" | "overdue";

function statusStyle(status: BillStatus) {
  switch (status) {
    case "paid":     return { bg: "rgba(34,197,94,0.1)",    color: "#16a34a" };
    case "overdue":  return { bg: "rgba(239,68,68,0.1)",    color: "#dc2626" };
    case "received": return { bg: "rgba(59,130,246,0.1)",   color: "#2563eb" };
    default:         return { bg: "rgba(156,163,175,0.15)", color: "#6b7280" };
  }
}

export default async function BillDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: bill }, { data: ventures }, { data: providers }] = await Promise.all([
    supabase.from("bills").select("*, venture:partners(company_name), service_provider:service_providers(*)").eq("id", id).single(),
    supabase.from("partners").select("id, company_name").eq("type", "venture").order("company_name"),
    supabase.from("service_providers").select("*").eq("is_active", true).order("name"),
  ]);

  if (!bill) notFound();

  const typedBill = bill as unknown as Bill;
  const sc = statusStyle(typedBill.status);

  return (
    <>
      <AdminTopBar title={`Bill ${typedBill.number}`} user={user ? { email: user.email ?? "" } : null} />
      <main className="pt-[56px] p-8 max-w-3xl">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/bills" className="text-xs text-[#5C6E81] hover:text-[#1F2A38] underline transition-colors" style={{ fontFamily: "var(--font-montserrat)" }}>
            ← Bills
          </Link>
        </div>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-[#1F2A38] font-bold text-xl" style={{ fontFamily: "var(--font-inter)" }}>
              Bill {typedBill.number}
            </h1>
            {typedBill.service_provider && (
              <p className="text-xs text-[#5C6E81] mt-0.5" style={{ fontFamily: "var(--font-montserrat)" }}>
                {(typedBill.service_provider as ServiceProvider).name}
                {typedBill.venture && ` · ${(typedBill.venture as { company_name: string }).company_name}`}
              </p>
            )}
          </div>
          <span
            className="text-xs px-3 py-1.5 font-semibold capitalize"
            style={{ ...sc, borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
          >
            {typedBill.status}
          </span>
        </div>

        <BillBuilder
          ventures={ventures ?? []}
          providers={(providers ?? []) as ServiceProvider[]}
          initialBill={typedBill}
        />
      </main>
    </>
  );
}

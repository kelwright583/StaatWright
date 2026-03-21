import { createClient } from "@/lib/supabase/server";
import AdminTopBar from "@/components/admin/AdminTopBar";
import BillBuilder from "@/components/admin/BillBuilder";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ provider?: string; venture?: string }>;
}

export default async function NewBillPage({ searchParams }: Props) {
  const { provider: defaultProviderId, venture: defaultVentureId } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: ventures }, { data: providers }] = await Promise.all([
    supabase.from("partners").select("id, company_name").eq("type", "venture").order("company_name"),
    supabase.from("service_providers").select("*").eq("is_active", true).order("name"),
  ]);

  return (
    <>
      <AdminTopBar title="New Bill" user={user ? { email: user.email ?? "" } : null} />
      <main className="pt-[56px] p-8 max-w-3xl">
        <div className="flex items-center gap-2 mb-6">
          <Link href="/admin/bills" className="text-xs text-[#5C6E81] hover:text-[#1F2A38] underline transition-colors" style={{ fontFamily: "var(--font-montserrat)" }}>
            ← Bills
          </Link>
        </div>
        <h1 className="text-[#1F2A38] font-bold text-xl mb-6" style={{ fontFamily: "var(--font-inter)" }}>
          New Bill
        </h1>
        <BillBuilder
          ventures={ventures ?? []}
          providers={(providers ?? []) as import("@/lib/types").ServiceProvider[]}
          defaultVentureId={defaultVentureId}
          defaultProviderId={defaultProviderId}
        />
      </main>
    </>
  );
}

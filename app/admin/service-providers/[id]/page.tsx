"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import AdminTopBar from "@/components/admin/AdminTopBar";
import { createClient } from "@/lib/supabase/client";
import type { ServiceProvider } from "@/lib/types";
import { formatZAR, formatDate } from "@/lib/utils";
import Link from "next/link";

const labelClass = "text-xs text-[#5C6E81] uppercase tracking-widest font-medium";
const inputClass = "border border-[#EAE4DC] bg-white text-[#1F2A38] text-sm px-3 py-2 focus:outline-none focus:border-[#5C6E81] w-full";
const sectionTitle = "text-xs text-[#5C6E81] uppercase tracking-widest font-semibold mb-3 mt-6 pb-1 border-b border-[#EAE4DC]";

interface BillRow {
  id: string;
  number: string;
  status: string;
  issue_date: string | null;
  due_date: string | null;
  total_amount: number | null;
  description: string | null;
  venture?: { company_name: string } | null;
}

export default function ServiceProviderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [tab, setTab] = useState<"overview" | "bills">("overview");
  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const [bills, setBills] = useState<BillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      const [{ data: sp }, { data: b }] = await Promise.all([
        supabase.from("service_providers").select("*").eq("id", id).single(),
        supabase.from("bills")
          .select("id, number, status, issue_date, due_date, total_amount, description, venture:partners(company_name)")
          .eq("service_provider_id", id)
          .order("issue_date", { ascending: false }),
      ]);
      if (sp) setProvider(sp as ServiceProvider);
      setBills((b ?? []) as unknown as BillRow[]);
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!provider) return;
    setSaving(true);
    const { error } = await supabase.from("service_providers").update({
      name: provider.name,
      contact_name: provider.contact_name || null,
      email: provider.email || null,
      phone: provider.phone || null,
      address: provider.address || null,
      website: provider.website || null,
      vat_number: provider.vat_number || null,
      reg_number: provider.reg_number || null,
      bank_name: provider.bank_name || null,
      bank_account_holder: provider.bank_account_holder || null,
      bank_account_number: provider.bank_account_number || null,
      bank_branch_code: provider.bank_branch_code || null,
      bank_account_type: provider.bank_account_type || null,
      notes: provider.notes || null,
      is_active: provider.is_active,
    }).eq("id", id);
    setSaving(false);
    if (error) alert("Error: " + error.message);
  }

  async function handleDelete() {
    if (!window.confirm("Delete this service provider? This cannot be undone.")) return;
    setDeleting(true);
    await supabase.from("service_providers").delete().eq("id", id);
    router.push("/admin/service-providers");
  }

  function field(key: keyof ServiceProvider, label: string, type = "text", placeholder = "") {
    return (
      <label key={key} className="flex flex-col gap-1">
        <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>{label}</span>
        <input
          type={type}
          value={(provider?.[key] as string) ?? ""}
          onChange={e => setProvider(p => p ? { ...p, [key]: e.target.value } : p)}
          className={inputClass}
          placeholder={placeholder}
          style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
        />
      </label>
    );
  }

  function statusColor(status: string) {
    switch (status) {
      case "paid": return { bg: "rgba(34,197,94,0.1)", color: "#16a34a" };
      case "overdue": return { bg: "rgba(239,68,68,0.1)", color: "#dc2626" };
      case "received": return { bg: "rgba(59,130,246,0.1)", color: "#2563eb" };
      default: return { bg: "rgba(156,163,175,0.15)", color: "#6b7280" };
    }
  }

  if (loading) {
    return (
      <>
        <AdminTopBar title="Service Provider" user={null} />
        <main className="pt-[56px] p-8">
          <p className="text-[#5C6E81] text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>Loading…</p>
        </main>
      </>
    );
  }

  if (!provider) {
    return (
      <>
        <AdminTopBar title="Service Provider" user={null} />
        <main className="pt-[56px] p-8">
          <p className="text-red-600 text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>Provider not found.</p>
        </main>
      </>
    );
  }

  const totalPaid = bills.filter(b => b.status === "paid").reduce((s, b) => s + (b.total_amount ?? 0), 0);
  const totalOutstanding = bills.filter(b => b.status === "received" || b.status === "overdue").reduce((s, b) => s + (b.total_amount ?? 0), 0);

  return (
    <>
      <AdminTopBar title={provider.name} user={null} />
      <main className="pt-[56px] p-8 max-w-4xl">
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => router.back()} className="text-xs text-[#5C6E81] hover:text-[#1F2A38] underline transition-colors" style={{ fontFamily: "var(--font-montserrat)" }}>
            ← Service Providers
          </button>
        </div>

        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-[#1F2A38] font-bold text-xl" style={{ fontFamily: "var(--font-inter)" }}>{provider.name}</h1>
            {provider.vat_number && <p className="text-xs text-[#5C6E81] mt-0.5" style={{ fontFamily: "var(--font-montserrat)" }}>VAT: {provider.vat_number}</p>}
          </div>
          <div className="flex items-center gap-3">
            <span
              className="text-xs px-2 py-1 font-medium"
              style={{ backgroundColor: provider.is_active ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", color: provider.is_active ? "#16a34a" : "#dc2626", borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
            >
              {provider.is_active ? "Active" : "Inactive"}
            </span>
            <Link
              href={`/admin/bills/new?provider=${id}`}
              className="px-4 py-2 text-white text-xs font-semibold"
              style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
            >
              + New Bill
            </Link>
          </div>
        </div>

        {/* Summary pills */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white border border-[#EAE4DC] px-4 py-3">
            <p className="text-xs text-[#5C6E81] uppercase tracking-widest" style={{ fontFamily: "var(--font-montserrat)" }}>Total Bills</p>
            <p className="text-[#1F2A38] font-bold text-lg" style={{ fontFamily: "var(--font-inter)" }}>{bills.length}</p>
          </div>
          <div className="bg-white border border-[#EAE4DC] px-4 py-3">
            <p className="text-xs text-[#5C6E81] uppercase tracking-widest" style={{ fontFamily: "var(--font-montserrat)" }}>Total Paid</p>
            <p className="text-[#1F2A38] font-bold text-lg" style={{ fontFamily: "var(--font-inter)" }}>{formatZAR(totalPaid)}</p>
          </div>
          <div className="bg-white border border-[#EAE4DC] px-4 py-3">
            <p className="text-xs text-[#5C6E81] uppercase tracking-widest" style={{ fontFamily: "var(--font-montserrat)" }}>Outstanding</p>
            <p className="font-bold text-lg" style={{ fontFamily: "var(--font-inter)", color: totalOutstanding > 0 ? "#dc2626" : "#1F2A38" }}>{formatZAR(totalOutstanding)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#EAE4DC] mb-6">
          {(["overview", "bills"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-5 py-2.5 text-xs uppercase tracking-widest font-medium transition-colors"
              style={{
                fontFamily: "var(--font-montserrat)",
                borderBottom: tab === t ? "2px solid #1F2A38" : "2px solid transparent",
                color: tab === t ? "#1F2A38" : "#5C6E81",
                marginBottom: "-1px",
              }}
            >
              {t === "overview" ? "Details" : `Bills (${bills.length})`}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <form onSubmit={handleSave} className="bg-white border border-[#EAE4DC] p-6 space-y-4">
            <p className={sectionTitle} style={{ fontFamily: "var(--font-montserrat)" }}>Business Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field("name", "Name *", "text", "Company name")}
              {field("contact_name", "Contact Person", "text", "e.g. Jane Smith")}
              {field("email", "Email", "email", "accounts@company.co.za")}
              {field("phone", "Phone", "text", "+27 11 000 0000")}
              {field("vat_number", "VAT Number", "text", "e.g. 4123456789")}
              {field("reg_number", "Company Reg. No.", "text", "2023/123456/07")}
              {field("website", "Website", "url", "https://company.co.za")}
            </div>
            <label className="flex flex-col gap-1">
              <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Address</span>
              <textarea
                value={provider.address ?? ""}
                onChange={e => setProvider(p => p ? { ...p, address: e.target.value } : p)}
                rows={2} className={inputClass}
                style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
              />
            </label>

            <p className={sectionTitle} style={{ fontFamily: "var(--font-montserrat)" }}>Banking Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field("bank_name", "Bank", "text", "e.g. FNB")}
              {field("bank_account_holder", "Account Holder", "text", "Legal entity name")}
              {field("bank_account_number", "Account Number", "text", "e.g. 62123456789")}
              {field("bank_branch_code", "Branch Code", "text", "e.g. 250655")}
              <label className="flex flex-col gap-1">
                <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Account Type</span>
                <select
                  value={provider.bank_account_type ?? "Cheque"}
                  onChange={e => setProvider(p => p ? { ...p, bank_account_type: e.target.value } : p)}
                  className={inputClass}
                  style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
                >
                  <option value="Cheque">Cheque</option>
                  <option value="Current">Current</option>
                  <option value="Savings">Savings</option>
                  <option value="Transmission">Transmission</option>
                </select>
              </label>
              <label className="flex items-center gap-2 pt-5 cursor-pointer">
                <input type="checkbox" checked={provider.is_active} onChange={e => setProvider(p => p ? { ...p, is_active: e.target.checked } : p)} className="w-4 h-4" />
                <span className="text-sm text-[#1F2A38]" style={{ fontFamily: "var(--font-montserrat)" }}>Active</span>
              </label>
            </div>

            <p className={sectionTitle} style={{ fontFamily: "var(--font-montserrat)" }}>Notes</p>
            <textarea
              value={provider.notes ?? ""}
              onChange={e => setProvider(p => p ? { ...p, notes: e.target.value } : p)}
              rows={3} className={inputClass}
              placeholder="Internal notes…"
              style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
            />

            <div className="flex items-center justify-between pt-4">
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="px-6 py-2.5 text-white text-sm font-semibold disabled:opacity-50" style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}>
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
              <button type="button" onClick={handleDelete} disabled={deleting} className="text-xs text-red-500 hover:text-red-700 underline transition-colors" style={{ fontFamily: "var(--font-montserrat)" }}>
                {deleting ? "Deleting…" : "Delete Provider"}
              </button>
            </div>
          </form>
        )}

        {tab === "bills" && (
          <div className="bg-white border border-[#EAE4DC] overflow-x-auto">
            {bills.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-[#5C6E81] text-sm mb-4" style={{ fontFamily: "var(--font-montserrat)" }}>No bills for this provider yet.</p>
                <Link
                  href={`/admin/bills/new?provider=${id}`}
                  className="inline-block px-5 py-2 text-white text-xs font-semibold"
                  style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
                >
                  + Create First Bill
                </Link>
              </div>
            ) : (
              <table className="w-full text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
                <thead>
                  <tr className="border-b border-[#EAE4DC]" style={{ backgroundColor: "rgba(234,228,220,0.5)" }}>
                    <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Bill #</th>
                    <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Venture</th>
                    <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Issue Date</th>
                    <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Due Date</th>
                    <th className="text-right px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Amount</th>
                    <th className="text-left px-4 py-3 text-xs text-[#5C6E81] uppercase tracking-wider font-medium">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {bills.map(b => {
                    const sc = statusColor(b.status);
                    return (
                      <tr key={b.id} className="border-b border-[#EAE4DC] last:border-0 hover:bg-[#EAE4DC]/20 transition-colors">
                        <td className="px-4 py-3 font-semibold text-[#1F2A38]">{b.number}</td>
                        <td className="px-4 py-3 text-[#5C6E81]">{(b.venture as { company_name?: string } | null)?.company_name ?? "—"}</td>
                        <td className="px-4 py-3 text-[#5C6E81]">{b.issue_date ? formatDate(b.issue_date) : "—"}</td>
                        <td className="px-4 py-3 text-[#5C6E81]">{b.due_date ? formatDate(b.due_date) : "—"}</td>
                        <td className="px-4 py-3 text-right font-semibold text-[#1F2A38]">{b.total_amount != null ? formatZAR(b.total_amount) : "—"}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 font-medium capitalize" style={{ ...sc, borderRadius: 0 }}>{b.status}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/admin/bills/${b.id}`} className="text-xs text-[#5C6E81] hover:text-[#1F2A38] underline transition-colors">View</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
    </>
  );
}

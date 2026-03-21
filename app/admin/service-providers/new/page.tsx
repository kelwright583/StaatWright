"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminTopBar from "@/components/admin/AdminTopBar";
import { createClient } from "@/lib/supabase/client";

const labelClass = "text-xs text-[#5C6E81] uppercase tracking-widest font-medium";
const inputClass = "border border-[#EAE4DC] bg-white text-[#1F2A38] text-sm px-3 py-2 focus:outline-none focus:border-[#5C6E81] w-full";
const sectionTitle = "text-xs text-[#5C6E81] uppercase tracking-widest font-semibold mb-3 mt-6 pb-1 border-b border-[#EAE4DC]";

export default function NewServiceProviderPage() {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankHolder, setBankHolder] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [bankType, setBankType] = useState("Cheque");
  const [notes, setNotes] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("service_providers").insert({
      name: name.trim(),
      contact_name: contactName.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      website: website.trim() || null,
      vat_number: vatNumber.trim() || null,
      reg_number: regNumber.trim() || null,
      bank_name: bankName.trim() || null,
      bank_account_holder: bankHolder.trim() || null,
      bank_account_number: bankAccount.trim() || null,
      bank_branch_code: bankBranch.trim() || null,
      bank_account_type: bankType || null,
      notes: notes.trim() || null,
      is_active: true,
    });
    setSaving(false);
    if (error) { alert("Error: " + error.message); return; }
    router.push("/admin/service-providers");
  }

  return (
    <>
      <AdminTopBar title="New Service Provider" user={null} />
      <main className="pt-[56px] p-8 max-w-3xl">
        <button
          onClick={() => router.back()}
          className="text-xs text-[#5C6E81] hover:text-[#1F2A38] underline mb-6 block transition-colors"
          style={{ fontFamily: "var(--font-montserrat)" }}
        >
          ← Back
        </button>
        <h1 className="text-[#1F2A38] font-bold text-xl mb-6" style={{ fontFamily: "var(--font-inter)" }}>
          New Service Provider
        </h1>
        <form onSubmit={handleSubmit} className="bg-white border border-[#EAE4DC] p-6 space-y-4">

          <p className={sectionTitle} style={{ fontFamily: "var(--font-montserrat)" }}>Business Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Name *</span>
              <input required value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="e.g. Afrihost (Pty) Ltd" style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Contact Person</span>
              <input value={contactName} onChange={e => setContactName(e.target.value)} className={inputClass} placeholder="e.g. Jane Smith" style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Email</span>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="accounts@company.co.za" style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Phone</span>
              <input value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} placeholder="+27 11 000 0000" style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>VAT Number</span>
              <input value={vatNumber} onChange={e => setVatNumber(e.target.value)} className={inputClass} placeholder="e.g. 4123456789" style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Company Reg. No.</span>
              <input value={regNumber} onChange={e => setRegNumber(e.target.value)} className={inputClass} placeholder="e.g. 2023/123456/07" style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Website</span>
              <input value={website} onChange={e => setWebsite(e.target.value)} className={inputClass} placeholder="https://company.co.za" style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }} />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Address</span>
              <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2} className={inputClass} placeholder="Physical or postal address" style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }} />
            </label>
          </div>

          <p className={sectionTitle} style={{ fontFamily: "var(--font-montserrat)" }}>Banking Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Bank</span>
              <input value={bankName} onChange={e => setBankName(e.target.value)} className={inputClass} placeholder="e.g. FNB" style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Account Holder</span>
              <input value={bankHolder} onChange={e => setBankHolder(e.target.value)} className={inputClass} placeholder="Legal entity name" style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Account Number</span>
              <input value={bankAccount} onChange={e => setBankAccount(e.target.value)} className={inputClass} placeholder="e.g. 62123456789" style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Branch Code</span>
              <input value={bankBranch} onChange={e => setBankBranch(e.target.value)} className={inputClass} placeholder="e.g. 250655" style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Account Type</span>
              <select value={bankType} onChange={e => setBankType(e.target.value)} className={inputClass} style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}>
                <option value="Cheque">Cheque</option>
                <option value="Current">Current</option>
                <option value="Savings">Savings</option>
                <option value="Transmission">Transmission</option>
              </select>
            </label>
          </div>

          <p className={sectionTitle} style={{ fontFamily: "var(--font-montserrat)" }}>Notes</p>
          <label className="flex flex-col gap-1">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={inputClass} placeholder="Internal notes about this provider..." style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }} />
          </label>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 text-white text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
            >
              {saving ? "Saving…" : "Create Provider"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2.5 text-sm border border-[#EAE4DC] text-[#5C6E81] hover:bg-[#EAE4DC] transition-colors"
              style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
            >
              Cancel
            </button>
          </div>
        </form>
      </main>
    </>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const labelClass = "block text-xs text-steel uppercase tracking-wider mb-1";
const inputClass = "border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm";
const selectClass = "border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm";

const RELATIONSHIP_OPTIONS = [
  { value: "retainer", label: "Retainer" },
  { value: "project", label: "Project" },
  { value: "advisory", label: "Advisory" },
  { value: "other", label: "Other" },
];

const VENTURE_STATUSES = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "winding_down", label: "Winding Down" },
  { value: "exited", label: "Exited" },
];

interface FormState {
  company_name: string;
  type: "client" | "venture";
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  vat_number: string;
  relationship_type: string;
  status: string;
  founding_date: string;
}

const emptyForm: FormState = {
  company_name: "",
  type: "client",
  contact_name: "",
  email: "",
  phone: "",
  address: "",
  website: "",
  vat_number: "",
  relationship_type: "",
  status: "active",
  founding_date: "",
};

export default function NewPartnerPage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(name: string, val: string) {
    setForm((prev) => ({ ...prev, [name]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company_name.trim()) {
      setError("Company name is required.");
      return;
    }

    setSaving(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from("partners")
      .insert({
        company_name: form.company_name.trim(),
        type: form.type,
        contact_name: form.contact_name.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        website: form.website.trim() || null,
        vat_number: form.vat_number.trim() || null,
        relationship_type: form.type === "client" ? (form.relationship_type || null) : null,
        status: form.type === "venture" ? form.status : null,
        founding_date: form.type === "venture" && form.founding_date ? form.founding_date : null,
        notes_log: [],
      })
      .select()
      .single();

    setSaving(false);

    if (insertError) {
      setError(insertError.message || "Failed to create partner.");
      return;
    }

    router.push(`/admin/partners/${data.id}`);
  }

  return (
    <>
      <div
        className="fixed top-0 right-0 flex items-center justify-between px-8 bg-white border-b border-linen z-10"
        style={{ left: "240px", height: "56px" }}
      >
        <h2 className="text-navy font-bold text-lg" style={{ fontFamily: "var(--font-inter)" }}>
          New Partner
        </h2>
      </div>

      <main className="pt-[56px] p-8">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-steel mb-6" style={{ fontFamily: "var(--font-montserrat)" }}>
            <Link href="/admin/partners" className="hover:text-navy underline transition-colors">Partners</Link>
            <span>/</span>
            <span>New</span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="bg-white border border-linen p-8" style={{ borderRadius: 0 }}>
              <h3 className="text-navy font-bold text-sm uppercase tracking-wider mb-6" style={{ fontFamily: "var(--font-inter)" }}>
                Partner Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Type *</label>
                  <div className="flex gap-4 mt-1">
                    {(["client", "venture"] as const).map((t) => (
                      <label key={t} className="flex items-center gap-2 cursor-pointer" style={{ fontFamily: "var(--font-montserrat)" }}>
                        <input
                          type="radio"
                          name="type"
                          value={t}
                          checked={form.type === t}
                          onChange={() => handleChange("type", t)}
                          className="accent-navy"
                        />
                        <span className="text-sm text-ink capitalize">{t}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Company Name *</label>
                  <input
                    type="text" required value={form.company_name}
                    onChange={(e) => handleChange("company_name", e.target.value)}
                    className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Contact Name</label>
                  <input
                    type="text" value={form.contact_name}
                    onChange={(e) => handleChange("contact_name", e.target.value)}
                    className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Email</label>
                  <input
                    type="email" value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Phone</label>
                  <input
                    type="text" value={form.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Website</label>
                  <input
                    type="text" value={form.website}
                    onChange={(e) => handleChange("website", e.target.value)}
                    className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>VAT Number</label>
                  <input
                    type="text" value={form.vat_number}
                    onChange={(e) => handleChange("vat_number", e.target.value)}
                    className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Address</label>
                  <textarea
                    rows={3} value={form.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    className="border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm resize-y"
                    style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>

                {form.type === "client" && (
                  <div>
                    <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Relationship Type</label>
                    <select
                      value={form.relationship_type}
                      onChange={(e) => handleChange("relationship_type", e.target.value)}
                      className={selectClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                    >
                      <option value="">— Select —</option>
                      {RELATIONSHIP_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {form.type === "venture" && (
                  <>
                    <div>
                      <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Status</label>
                      <select
                        value={form.status}
                        onChange={(e) => handleChange("status", e.target.value)}
                        className={selectClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                      >
                        {VENTURE_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Founding Date</label>
                      <input
                        type="date" value={form.founding_date}
                        onChange={(e) => handleChange("founding_date", e.target.value)}
                        className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                      />
                    </div>
                  </>
                )}
              </div>

              {error && (
                <p className="mt-4 text-sm text-red-500" style={{ fontFamily: "var(--font-montserrat)" }}>{error}</p>
              )}

              <div className="mt-8 flex items-center gap-4">
                <button
                  type="submit" disabled={saving}
                  className="px-6 py-2.5 text-white text-sm font-semibold transition-opacity disabled:opacity-60"
                  style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
                >
                  {saving ? "Saving…" : "Create Partner"}
                </button>
                <Link
                  href="/admin/partners"
                  className="text-sm text-steel hover:text-navy transition-colors"
                  style={{ fontFamily: "var(--font-montserrat)" }}
                >
                  Cancel
                </Link>
              </div>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}

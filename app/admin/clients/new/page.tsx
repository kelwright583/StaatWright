"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm";
const labelClass =
  "block text-xs text-steel uppercase tracking-wider mb-1";

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, val: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <label
        className={labelClass}
        style={{ fontFamily: "var(--font-montserrat)" }}
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        required={required}
        onChange={(e) => onChange(name, e.target.value)}
        className={inputClass}
        style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
      />
    </div>
  );
}

function TextareaField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, val: string) => void;
}) {
  return (
    <div className="flex flex-col">
      <label
        className={labelClass}
        style={{ fontFamily: "var(--font-montserrat)" }}
      >
        {label}
      </label>
      <textarea
        name={name}
        rows={4}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        className="border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm resize-y"
        style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
      />
    </div>
  );
}

interface FormState {
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  vat_number: string;
  tags: string;
}

const emptyForm: FormState = {
  company_name: "",
  contact_person: "",
  email: "",
  phone: "",
  address: "",
  vat_number: "",
  tags: "",
};

export default function NewClientPage() {
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

    const tagsArray = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const { data, error: insertError } = await supabase
      .from("clients")
      .insert({
        company_name: form.company_name.trim(),
        contact_person: form.contact_person.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        vat_number: form.vat_number.trim() || null,
        tags: tagsArray,
        notes: [],
      })
      .select()
      .single();

    setSaving(false);

    if (insertError) {
      setError(insertError.message || "Failed to create client.");
      return;
    }

    router.push(`/admin/clients/${data.id}`);
  }

  return (
    <>
      {/* Inline top bar substitute for non-dashboard pages */}
      <div
        className="fixed top-0 right-0 flex items-center justify-between px-8 bg-white border-b border-linen z-10"
        style={{ left: "240px", height: "56px" }}
      >
        <h2
          className="text-navy font-bold text-lg"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          New Client
        </h2>
      </div>

      <main className="pt-[56px] p-8">
        <div className="max-w-2xl">
          {/* Breadcrumb */}
          <div
            className="flex items-center gap-2 text-xs text-steel mb-6"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            <Link href="/admin/clients" className="hover:text-navy underline transition-colors">
              Clients
            </Link>
            <span>/</span>
            <span>New Client</span>
          </div>

          <form onSubmit={handleSubmit}>
            <div
              className="bg-white border border-linen p-8"
              style={{ borderRadius: 0 }}
            >
              <h3
                className="text-navy font-bold text-sm uppercase tracking-wider mb-6"
                style={{ fontFamily: "var(--font-inter)" }}
              >
                Client Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <Field
                    label="Company Name"
                    name="company_name"
                    value={form.company_name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <Field
                  label="Contact Person"
                  name="contact_person"
                  value={form.contact_person}
                  onChange={handleChange}
                />
                <Field
                  label="Email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  type="email"
                />
                <Field
                  label="Phone"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                />
                <Field
                  label="VAT Number"
                  name="vat_number"
                  value={form.vat_number}
                  onChange={handleChange}
                />
                <div className="sm:col-span-2">
                  <TextareaField
                    label="Address"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Field
                    label="Tags (comma-separated)"
                    name="tags"
                    value={form.tags}
                    onChange={handleChange}
                  />
                  <p
                    className="mt-1 text-xs text-steel"
                    style={{ fontFamily: "var(--font-montserrat)" }}
                  >
                    e.g. retainer, priority, design
                  </p>
                </div>
              </div>

              {error && (
                <p
                  className="mt-4 text-sm text-red-500"
                  style={{ fontFamily: "var(--font-montserrat)" }}
                >
                  {error}
                </p>
              )}

              <div className="mt-8 flex items-center gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 text-white text-sm font-semibold transition-opacity disabled:opacity-60"
                  style={{
                    backgroundColor: "#1F2A38",
                    fontFamily: "var(--font-inter)",
                    borderRadius: 0,
                  }}
                >
                  {saving ? "Saving…" : "Create Client"}
                </button>
                <Link
                  href="/admin/clients"
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

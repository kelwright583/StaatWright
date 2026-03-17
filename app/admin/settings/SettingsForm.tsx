"use client";

import { useEffect, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { createClient } from "@/lib/supabase/client";
import type { CompanySettings } from "@/lib/types";

type SettingsState = Omit<CompanySettings, "updated_at">;

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
}: {
  label: string;
  name: string;
  value: string | number | null;
  onChange: (name: string, val: string) => void;
  type?: string;
}) {
  return (
    <div className="flex flex-col">
      <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value ?? ""}
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
  value: string | null;
  onChange: (name: string, val: string) => void;
}) {
  return (
    <div className="flex flex-col">
      <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>
        {label}
      </label>
      <textarea
        name={name}
        rows={4}
        value={value ?? ""}
        onChange={(e) => onChange(name, e.target.value)}
        className="border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm resize-y"
        style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
      />
    </div>
  );
}

const tabTriggerClass =
  "px-5 py-3 text-sm font-medium border-b-2 transition-colors data-[state=active]:border-navy data-[state=active]:text-navy data-[state=inactive]:border-transparent data-[state=inactive]:text-steel hover:text-navy";

export default function SettingsForm() {
  const supabase = createClient();

  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .single();

      if (error) {
        setToast({ type: "error", message: "Failed to load settings." });
      } else if (data) {
        const { updated_at: _u, ...rest } = data as CompanySettings;
        setSettings(rest);
      }
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(name: string, val: string) {
    setSettings((prev) => {
      if (!prev) return prev;
      return { ...prev, [name]: val };
    });
  }

  async function handleSave(tab: string) {
    if (!settings) return;
    setSaving(true);
    setToast(null);

    const { error } = await supabase
      .from("company_settings")
      .update(settings)
      .eq("id", settings.id);

    setSaving(false);

    if (error) {
      setToast({ type: "error", message: error.message || "Save failed." });
    } else {
      setToast({ type: "success", message: "Saved!" });
      setTimeout(() => setToast(null), 3000);
    }

    void tab;
  }

  if (loading) {
    return (
      <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
        Loading settings…
      </p>
    );
  }

  if (!settings) {
    return (
      <p className="text-red-500 text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
        Could not load settings.
      </p>
    );
  }

  function SaveButton({ tab }: { tab: string }) {
    return (
      <div className="mt-8">
        <button
          type="button"
          disabled={saving}
          onClick={() => handleSave(tab)}
          className="w-full py-3 text-white text-sm font-semibold transition-opacity disabled:opacity-60"
          style={{
            backgroundColor: "#1F2A38",
            fontFamily: "var(--font-inter)",
            borderRadius: 0,
          }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
        {toast && (
          <p
            className={`mt-2 text-sm text-center ${toast.type === "success" ? "text-green-600" : "text-red-500"}`}
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            {toast.message}
          </p>
        )}
      </div>
    );
  }

  return (
    <Tabs.Root defaultValue="company" className="w-full">
      {/* Tab list */}
      <div className="border-b border-linen mb-8">
        <Tabs.List className="flex gap-0 -mb-px" aria-label="Settings sections">
          {[
            { value: "company", label: "Company" },
            { value: "invoice", label: "Invoice Defaults" },
            { value: "banking", label: "Banking" },
            { value: "public", label: "Public Site" },
          ].map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className={tabTriggerClass}
              style={{ fontFamily: "var(--font-montserrat)" }}
            >
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </div>

      {/* Company tab */}
      <Tabs.Content value="company">
        <div className="bg-white border border-linen p-8 max-w-2xl" style={{ borderRadius: 0 }}>
          <h3
            className="text-navy font-bold text-sm uppercase tracking-wider mb-6"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            Company Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Field label="Company Name" name="name" value={settings.name} onChange={handleChange} />
            <Field label="Registration Number" name="reg_number" value={settings.reg_number} onChange={handleChange} />
            <Field label="VAT Number" name="vat_number" value={settings.vat_number} onChange={handleChange} />
            <Field label="Phone" name="phone" value={settings.phone} onChange={handleChange} />
            <Field label="Email" name="email" value={settings.email} onChange={handleChange} type="email" />
            <Field label="Contact Email (Public)" name="contact_email" value={settings.contact_email} onChange={handleChange} type="email" />
            <div className="sm:col-span-2">
              <TextareaField label="Address" name="address" value={settings.address} onChange={handleChange} />
            </div>
          </div>
          <SaveButton tab="company" />
        </div>
      </Tabs.Content>

      {/* Invoice Defaults tab */}
      <Tabs.Content value="invoice">
        <div className="bg-white border border-linen p-8 max-w-2xl" style={{ borderRadius: 0 }}>
          <h3
            className="text-navy font-bold text-sm uppercase tracking-wider mb-6"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            Invoice Defaults
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Field label="VAT Rate (%)" name="invoice_vat_rate" value={settings.invoice_vat_rate} onChange={handleChange} type="number" />
            <Field label="Quote Validity (days)" name="quote_validity_days" value={settings.quote_validity_days} onChange={handleChange} type="number" />
            <Field label="Invoice Prefix" name="invoice_prefix" value={settings.invoice_prefix} onChange={handleChange} />
            <Field label="Quote Prefix" name="quote_prefix" value={settings.quote_prefix} onChange={handleChange} />
            <Field label="Credit Note Prefix" name="cn_prefix" value={settings.cn_prefix} onChange={handleChange} />
          </div>
          <div className="mt-6 flex flex-col gap-6">
            <TextareaField
              label="Default Invoice Terms"
              name="invoice_default_terms"
              value={settings.invoice_default_terms}
              onChange={handleChange}
            />
            <TextareaField
              label="Default Invoice Notes"
              name="invoice_default_notes"
              value={settings.invoice_default_notes}
              onChange={handleChange}
            />
          </div>
          <SaveButton tab="invoice" />
        </div>
      </Tabs.Content>

      {/* Banking tab */}
      <Tabs.Content value="banking">
        <div className="bg-white border border-linen p-8 max-w-2xl" style={{ borderRadius: 0 }}>
          <h3
            className="text-navy font-bold text-sm uppercase tracking-wider mb-6"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            Banking Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Field label="Bank Name" name="bank_name" value={settings.bank_name} onChange={handleChange} />
            <Field label="Account Holder" name="bank_account_holder" value={settings.bank_account_holder} onChange={handleChange} />
            <Field label="Account Number" name="bank_account_number" value={settings.bank_account_number} onChange={handleChange} />
            <Field label="Branch Code" name="bank_branch_code" value={settings.bank_branch_code} onChange={handleChange} />
            <div className="flex flex-col">
              <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>
                Account Type
              </label>
              <select
                name="bank_account_type"
                value={settings.bank_account_type ?? ""}
                onChange={(e) => handleChange("bank_account_type", e.target.value)}
                className={inputClass}
                style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
              >
                <option value="">Select type…</option>
                <option value="cheque">Cheque</option>
                <option value="savings">Savings</option>
                <option value="transmission">Transmission</option>
              </select>
            </div>
          </div>
          <SaveButton tab="banking" />
        </div>
      </Tabs.Content>

      {/* Public Site tab */}
      <Tabs.Content value="public">
        <div className="bg-white border border-linen p-8 max-w-2xl" style={{ borderRadius: 0 }}>
          <h3
            className="text-navy font-bold text-sm uppercase tracking-wider mb-6"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            Public Site Content
          </h3>

          <div className="mb-6">
            <p className="text-xs text-steel uppercase tracking-wider mb-4" style={{ fontFamily: "var(--font-montserrat)" }}>
              Hero Section
            </p>
            <div className="grid grid-cols-1 gap-6">
              <Field label="Hero Tagline 1" name="hero_tagline_1" value={settings.hero_tagline_1} onChange={handleChange} />
              <Field label="Hero Tagline 2" name="hero_tagline_2" value={settings.hero_tagline_2} onChange={handleChange} />
              <Field label="Hero Subheading" name="hero_subheading" value={settings.hero_subheading} onChange={handleChange} />
            </div>
          </div>

          <div className="border-t border-linen pt-6 mb-6">
            <p className="text-xs text-steel uppercase tracking-wider mb-4" style={{ fontFamily: "var(--font-montserrat)" }}>
              Service 1
            </p>
            <div className="grid grid-cols-1 gap-6">
              <Field label="Title" name="service_1_title" value={settings.service_1_title} onChange={handleChange} />
              <TextareaField label="Body" name="service_1_body" value={settings.service_1_body} onChange={handleChange} />
            </div>
          </div>

          <div className="border-t border-linen pt-6 mb-6">
            <p className="text-xs text-steel uppercase tracking-wider mb-4" style={{ fontFamily: "var(--font-montserrat)" }}>
              Service 2
            </p>
            <div className="grid grid-cols-1 gap-6">
              <Field label="Title" name="service_2_title" value={settings.service_2_title} onChange={handleChange} />
              <TextareaField label="Body" name="service_2_body" value={settings.service_2_body} onChange={handleChange} />
            </div>
          </div>

          <div className="border-t border-linen pt-6">
            <p className="text-xs text-steel uppercase tracking-wider mb-4" style={{ fontFamily: "var(--font-montserrat)" }}>
              Service 3
            </p>
            <div className="grid grid-cols-1 gap-6">
              <Field label="Title" name="service_3_title" value={settings.service_3_title} onChange={handleChange} />
              <TextareaField label="Body" name="service_3_body" value={settings.service_3_body} onChange={handleChange} />
            </div>
          </div>

          <SaveButton tab="public" />
        </div>
      </Tabs.Content>
    </Tabs.Root>
  );
}

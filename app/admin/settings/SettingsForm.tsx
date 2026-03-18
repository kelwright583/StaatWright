"use client";

import { useEffect, useState, useCallback } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { createClient } from "@/lib/supabase/client";
import type { CompanySettings, ExpenseCategory, OwnerSettings } from "@/lib/types";

type SettingsState = Omit<CompanySettings, "updated_at">;

const inputClass =
  "border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm";
const labelClass =
  "block text-xs text-steel uppercase tracking-wider mb-1";
const boxInputClass =
  "border border-linen bg-white text-ink text-sm px-3 py-2 focus:outline-none focus:border-steel w-full";

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

// ─── Reminder Templates Types ─────────────────────────────────────────────────

interface ReminderTemplate {
  subject: string;
  body: string;
}

interface ReminderTemplates {
  "3_days_before": ReminderTemplate;
  "due_today": ReminderTemplate;
  "7_days_overdue": ReminderTemplate;
  "14_days_overdue": ReminderTemplate;
  "quote_expiry": ReminderTemplate;
}

const TEMPLATE_KEYS: { key: keyof ReminderTemplates; label: string; variables: string }[] = [
  {
    key: "3_days_before",
    label: "Invoice: 3 days before due",
    variables: "{{partner_name}}, {{invoice_number}}, {{amount}}, {{due_date}}",
  },
  {
    key: "due_today",
    label: "Invoice: On due date",
    variables: "{{partner_name}}, {{invoice_number}}, {{amount}}, {{due_date}}",
  },
  {
    key: "7_days_overdue",
    label: "Invoice: 7 days overdue",
    variables: "{{partner_name}}, {{invoice_number}}, {{amount}}, {{due_date}}, {{days_overdue}}",
  },
  {
    key: "14_days_overdue",
    label: "Invoice: 14 days overdue (escalated)",
    variables: "{{partner_name}}, {{invoice_number}}, {{amount}}, {{due_date}}, {{days_overdue}}",
  },
  {
    key: "quote_expiry",
    label: "Quote: Expiry reminder (3 days before valid_until)",
    variables: "{{partner_name}}, {{invoice_number}}, {{amount}}, {{due_date}}",
  },
];

function defaultTemplates(): ReminderTemplates {
  return {
    "3_days_before": { subject: "Invoice {{invoice_number}} due in 3 days", body: "Hi {{partner_name}},\n\nThis is a reminder that invoice {{invoice_number}} for {{amount}} is due on {{due_date}}.\n\nKind regards" },
    "due_today": { subject: "Invoice {{invoice_number}} is due today", body: "Hi {{partner_name}},\n\nInvoice {{invoice_number}} for {{amount}} is due today ({{due_date}}).\n\nKind regards" },
    "7_days_overdue": { subject: "Invoice {{invoice_number}} is 7 days overdue", body: "Hi {{partner_name}},\n\nInvoice {{invoice_number}} for {{amount}} was due on {{due_date}} and is now {{days_overdue}} days overdue.\n\nKind regards" },
    "14_days_overdue": { subject: "URGENT: Invoice {{invoice_number}} is 14 days overdue", body: "Hi {{partner_name}},\n\nInvoice {{invoice_number}} for {{amount}} was due on {{due_date}} and is now {{days_overdue}} days overdue. Please arrange payment immediately.\n\nKind regards" },
    "quote_expiry": { subject: "Your quote {{invoice_number}} expires in 3 days", body: "Hi {{partner_name}},\n\nYour quote {{invoice_number}} for {{amount}} expires on {{due_date}}. Please let us know if you'd like to proceed.\n\nKind regards" },
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SettingsForm() {
  const supabase = createClient();

  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Expense Categories state
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatParent, setNewCatParent] = useState("");
  const [newCatDeductible, setNewCatDeductible] = useState(false);
  const [catSaving, setCatSaving] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatParent, setEditCatParent] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  // Owner Rates state
  const [owners, setOwners] = useState<OwnerSettings[]>([]);
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [ownerDrafts, setOwnerDrafts] = useState<Record<string, OwnerSettings>>({});
  const [ownerSaving, setOwnerSaving] = useState<Record<string, boolean>>({});

  // Reminder Templates state
  const [templates, setTemplates] = useState<ReminderTemplates>(defaultTemplates());
  const [templatesSaving, setTemplatesSaving] = useState(false);

  // Slip Ingestion state
  const [ingestionSettings, setIngestionSettings] = useState({
    openai_api_key: "",
    openai_key_set: false,
    slip_confidence_threshold: 75,
    slip_notification_preference: "email" as "email" | "in_app" | "both",
    slip_processing_enabled: false,
  });
  const [ingestionSaving, setIngestionSaving] = useState(false);

  // ── Load company settings ──────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .single();

      if (error) {
        setToast({ type: "error", message: "Failed to load settings." });
      } else if (data) {
        const { updated_at: _u, ...rest } = data as CompanySettings & {
          reminder_templates?: unknown;
          openai_api_key?: string | null;
          slip_confidence_threshold?: number | null;
          slip_notification_preference?: string | null;
          slip_processing_enabled?: boolean | null;
        };
        setSettings(rest as SettingsState);

        // Load reminder templates
        if (data.reminder_templates && typeof data.reminder_templates === "object") {
          setTemplates({ ...defaultTemplates(), ...(data.reminder_templates as Partial<ReminderTemplates>) });
        }

        // Load ingestion settings
        setIngestionSettings({
          openai_api_key: "",
          openai_key_set: !!(data as Record<string, unknown>).openai_api_key,
          slip_confidence_threshold: Number((data as Record<string, unknown>).slip_confidence_threshold ?? 75),
          slip_notification_preference: ((data as Record<string, unknown>).slip_notification_preference as "email" | "in_app" | "both") ?? "email",
          slip_processing_enabled: Boolean((data as Record<string, unknown>).slip_processing_enabled ?? false),
        });
      }
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load expense categories ────────────────────────────────────────────────

  const loadCategories = useCallback(async () => {
    setCatLoading(true);
    const { data } = await supabase
      .from("expense_categories")
      .select("*")
      .order("sort_order");
    setCategories((data as ExpenseCategory[]) ?? []);
    setCatLoading(false);
  }, [supabase]);

  // ── Load owners ────────────────────────────────────────────────────────────

  const loadOwners = useCallback(async () => {
    setOwnersLoading(true);
    const { data } = await supabase
      .from("owner_settings")
      .select("*");
    const rows = (data as OwnerSettings[]) ?? [];
    setOwners(rows);
    const drafts: Record<string, OwnerSettings> = {};
    rows.forEach((o) => { drafts[o.id] = { ...o }; });
    setOwnerDrafts(drafts);
    setOwnersLoading(false);
  }, [supabase]);

  function handleChange(name: string, val: string) {
    setSettings((prev) => {
      if (!prev) return prev;
      return { ...prev, [name]: val };
    });
  }

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    if (type === "success") setTimeout(() => setToast(null), 3000);
  }

  // ── Save company settings ──────────────────────────────────────────────────

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
      showToast("error", error.message || "Save failed.");
    } else {
      showToast("success", "Saved!");
    }

    void tab;
  }

  // ── Expense category actions ───────────────────────────────────────────────

  async function handleAddCategory() {
    if (!newCatName.trim()) return;
    setCatSaving(true);
    const maxOrder = categories.reduce((m, c) => Math.max(m, c.sort_order), 0);
    const { error } = await supabase.from("expense_categories").insert({
      name: newCatName.trim(),
      parent_category: newCatParent.trim() || null,
      is_deductible: newCatDeductible,
      sort_order: maxOrder + 1,
      is_archived: false,
    });
    if (error) {
      showToast("error", "Failed to add category: " + error.message);
    } else {
      setNewCatName("");
      setNewCatParent("");
      setNewCatDeductible(false);
      setShowAddCat(false);
      loadCategories();
    }
    setCatSaving(false);
  }

  async function handleArchiveCategory(id: string) {
    await supabase.from("expense_categories").update({ is_archived: true }).eq("id", id);
    loadCategories();
  }

  async function handleUnarchiveCategory(id: string) {
    await supabase.from("expense_categories").update({ is_archived: false }).eq("id", id);
    loadCategories();
  }

  async function handleSaveCatEdit(id: string) {
    await supabase.from("expense_categories").update({
      name: editCatName.trim(),
      parent_category: editCatParent.trim() || null,
    }).eq("id", id);
    setEditingCatId(null);
    loadCategories();
  }

  // ── Owner save ─────────────────────────────────────────────────────────────

  async function handleSaveOwner(id: string) {
    const draft = ownerDrafts[id];
    if (!draft) return;
    setOwnerSaving((prev) => ({ ...prev, [id]: true }));
    const { error } = await supabase.from("owner_settings").upsert({
      id: draft.id,
      user_id: draft.user_id,
      display_name: draft.display_name,
      initials: draft.initials,
      hourly_rate: draft.hourly_rate,
    });
    if (error) {
      showToast("error", "Save failed: " + error.message);
    } else {
      showToast("success", "Owner settings saved.");
      loadOwners();
    }
    setOwnerSaving((prev) => ({ ...prev, [id]: false }));
  }

  function updateOwnerDraft(id: string, field: keyof OwnerSettings, value: string | number) {
    setOwnerDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }

  // ── Reminder templates save ────────────────────────────────────────────────

  async function handleSaveTemplates() {
    if (!settings) return;
    setTemplatesSaving(true);
    const { error } = await supabase
      .from("company_settings")
      .update({ reminder_templates: templates } as unknown as Record<string, unknown>)
      .eq("id", settings.id);
    setTemplatesSaving(false);
    if (error) {
      showToast("error", "Failed to save templates: " + error.message);
    } else {
      showToast("success", "Templates saved.");
    }
  }

  // ── Ingestion settings save ────────────────────────────────────────────────

  async function handleSaveIngestion() {
    if (!settings) return;
    setIngestionSaving(true);
    const updatePayload: Record<string, unknown> = {
      slip_confidence_threshold: ingestionSettings.slip_confidence_threshold,
      slip_notification_preference: ingestionSettings.slip_notification_preference,
      slip_processing_enabled: ingestionSettings.slip_processing_enabled,
    };
    if (ingestionSettings.openai_api_key.trim()) {
      updatePayload.openai_api_key = ingestionSettings.openai_api_key.trim();
    }
    const { error } = await supabase
      .from("company_settings")
      .update(updatePayload)
      .eq("id", settings.id);
    setIngestionSaving(false);
    if (error) {
      showToast("error", "Failed to save ingestion settings: " + error.message);
    } else {
      showToast("success", "Ingestion settings saved.");
      if (ingestionSettings.openai_api_key.trim()) {
        setIngestionSettings((prev) => ({ ...prev, openai_api_key: "", openai_key_set: true }));
      }
    }
  }

  // ── Loading / error states ─────────────────────────────────────────────────

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

  function SaveButton({ tab, onSave }: { tab: string; onSave?: () => void }) {
    const handleClick = onSave ? onSave : () => handleSave(tab);
    return (
      <div className="mt-8">
        <button
          type="button"
          disabled={saving}
          onClick={handleClick}
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

  const activeCategories = categories.filter((c) => !c.is_archived);
  const archivedCategories = categories.filter((c) => c.is_archived);
  const parentCategories = categories.filter((c) => !c.parent_category && !c.is_archived);

  return (
    <Tabs.Root defaultValue="company" className="w-full">
      {/* Tab list */}
      <div className="border-b border-linen mb-8 overflow-x-auto">
        <Tabs.List className="flex gap-0 -mb-px min-w-max" aria-label="Settings sections">
          {[
            { value: "company", label: "Company" },
            { value: "invoice", label: "Invoice Defaults" },
            { value: "banking", label: "Banking" },
            { value: "public", label: "Public Site" },
            { value: "expense_categories", label: "Expense Categories" },
            { value: "owner_rates", label: "Owner Rates" },
            { value: "reminder_templates", label: "Reminder Templates" },
            { value: "slip_ingestion", label: "Slip Ingestion" },
          ].map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className={tabTriggerClass}
              style={{ fontFamily: "var(--font-montserrat)" }}
              onFocus={() => {
                if (tab.value === "expense_categories") loadCategories();
                if (tab.value === "owner_rates") loadOwners();
              }}
            >
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </div>

      {/* ── Company tab ── */}
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

      {/* ── Invoice Defaults tab ── */}
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

      {/* ── Banking tab ── */}
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

      {/* ── Public Site tab ── */}
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

      {/* ── Expense Categories tab ── */}
      <Tabs.Content value="expense_categories">
        <div className="bg-white border border-linen p-8 max-w-3xl" style={{ borderRadius: 0 }}>
          <div className="flex items-center justify-between mb-6">
            <h3
              className="text-navy font-bold text-sm uppercase tracking-wider"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              Expense Categories
            </h3>
            <button
              onClick={() => setShowAddCat((v) => !v)}
              className="text-xs px-3 py-1.5 text-white"
              style={{ background: "#1F2A38", fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
            >
              {showAddCat ? "Cancel" : "+ Add Category"}
            </button>
          </div>

          {/* Add category form */}
          {showAddCat && (
            <div className="border border-linen p-4 mb-6 bg-linen/20">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
                <div className="flex flex-col gap-1">
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Name</label>
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className={boxInputClass}
                    style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                    placeholder="Category name"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Parent Category</label>
                  <select
                    value={newCatParent}
                    onChange={(e) => setNewCatParent(e.target.value)}
                    className={boxInputClass}
                    style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  >
                    <option value="">— None (top level) —</option>
                    {parentCategories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="newCatDeductible"
                    checked={newCatDeductible}
                    onChange={(e) => setNewCatDeductible(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="newCatDeductible" className="text-sm text-ink cursor-pointer" style={{ fontFamily: "var(--font-montserrat)" }}>
                    Tax deductible
                  </label>
                </div>
              </div>
              <button
                onClick={handleAddCategory}
                disabled={catSaving || !newCatName.trim()}
                className="px-4 py-2 text-sm text-white disabled:opacity-50"
                style={{ background: "#1F2A38", fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
              >
                {catSaving ? "Adding…" : "Add Category"}
              </button>
            </div>
          )}

          {catLoading ? (
            <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>Loading…</p>
          ) : (
            <>
              {/* Active categories table */}
              <table className="w-full text-sm mb-4" style={{ fontFamily: "var(--font-montserrat)" }}>
                <thead>
                  <tr className="border-b border-linen">
                    <th className="text-left px-2 py-2 text-xs text-steel uppercase tracking-wider">Name</th>
                    <th className="text-left px-2 py-2 text-xs text-steel uppercase tracking-wider">Parent</th>
                    <th className="text-center px-2 py-2 text-xs text-steel uppercase tracking-wider">Deductible</th>
                    <th className="text-right px-2 py-2 text-xs text-steel uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeCategories.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-2 py-6 text-center text-steel text-sm">No categories yet.</td>
                    </tr>
                  ) : activeCategories.map((cat) => (
                    <tr key={cat.id} className="border-b border-linen last:border-0 hover:bg-linen/20">
                      <td className="px-2 py-2">
                        {editingCatId === cat.id ? (
                          <input
                            type="text"
                            value={editCatName}
                            onChange={(e) => setEditCatName(e.target.value)}
                            className={boxInputClass}
                            style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                            autoFocus
                          />
                        ) : (
                          <span
                            className="cursor-pointer hover:text-navy"
                            onClick={() => { setEditingCatId(cat.id); setEditCatName(cat.name); setEditCatParent(cat.parent_category ?? ""); }}
                          >
                            {cat.name}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-steel">
                        {editingCatId === cat.id ? (
                          <select
                            value={editCatParent}
                            onChange={(e) => setEditCatParent(e.target.value)}
                            className={boxInputClass}
                            style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                          >
                            <option value="">— None —</option>
                            {parentCategories.filter((p) => p.id !== cat.id).map((c) => (
                              <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        ) : (
                          cat.parent_category ?? "—"
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {cat.is_deductible ? (
                          <span className="text-green-600 text-xs font-medium">Yes</span>
                        ) : (
                          <span className="text-steel text-xs">No</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right flex gap-2 justify-end">
                        {editingCatId === cat.id ? (
                          <>
                            <button
                              onClick={() => handleSaveCatEdit(cat.id)}
                              className="text-xs text-white px-2 py-1"
                              style={{ background: "#1F2A38", borderRadius: 0 }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingCatId(null)}
                              className="text-xs text-steel px-2 py-1 border border-linen"
                              style={{ borderRadius: 0 }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleArchiveCategory(cat.id)}
                            className="text-xs text-steel underline hover:text-navy"
                          >
                            Archive
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Archived categories */}
              {archivedCategories.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowArchived((v) => !v)}
                    className="text-xs text-steel underline mb-3"
                    style={{ fontFamily: "var(--font-montserrat)" }}
                  >
                    {showArchived ? "Hide" : "Show"} Archived ({archivedCategories.length})
                  </button>
                  {showArchived && (
                    <table className="w-full text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
                      <tbody>
                        {archivedCategories.map((cat) => (
                          <tr key={cat.id} className="border-b border-linen opacity-60">
                            <td className="px-2 py-2 text-steel line-through">{cat.name}</td>
                            <td className="px-2 py-2 text-steel">{cat.parent_category ?? "—"}</td>
                            <td className="px-2 py-2 text-steel">{cat.is_deductible ? "Deductible" : ""}</td>
                            <td className="px-2 py-2 text-right">
                              <button
                                onClick={() => handleUnarchiveCategory(cat.id)}
                                className="text-xs text-steel underline hover:text-navy"
                              >
                                Restore
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </Tabs.Content>

      {/* ── Owner Rates tab ── */}
      <Tabs.Content value="owner_rates">
        <div className="bg-white border border-linen p-8 max-w-2xl" style={{ borderRadius: 0 }}>
          <h3
            className="text-navy font-bold text-sm uppercase tracking-wider mb-6"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            Owner Rates
          </h3>

          {ownersLoading ? (
            <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>Loading…</p>
          ) : owners.length === 0 ? (
            <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
              No owner settings found. Create owner records in the database to configure rates here.
            </p>
          ) : (
            <div className="space-y-6">
              {owners.map((owner) => {
                const draft = ownerDrafts[owner.id] ?? owner;
                const isSaving = ownerSaving[owner.id] ?? false;
                return (
                  <div key={owner.id} className="border border-linen p-4" style={{ borderRadius: 0 }}>
                    <p className="text-xs text-steel uppercase tracking-widest mb-3" style={{ fontFamily: "var(--font-montserrat)" }}>
                      User ID: {owner.user_id}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                      <div className="flex flex-col gap-1">
                        <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Display Name</label>
                        <input
                          type="text"
                          value={draft.display_name ?? ""}
                          onChange={(e) => updateOwnerDraft(owner.id, "display_name", e.target.value)}
                          className={boxInputClass}
                          style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Initials</label>
                        <input
                          type="text"
                          maxLength={2}
                          value={draft.initials ?? ""}
                          onChange={(e) => updateOwnerDraft(owner.id, "initials", e.target.value)}
                          className={boxInputClass}
                          style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Hourly Rate (ZAR)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft.hourly_rate ?? ""}
                          onChange={(e) => updateOwnerDraft(owner.id, "hourly_rate", parseFloat(e.target.value))}
                          className={boxInputClass}
                          style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => handleSaveOwner(owner.id)}
                      disabled={isSaving}
                      className="px-4 py-2 text-sm text-white disabled:opacity-50"
                      style={{ background: "#1F2A38", fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                    >
                      {isSaving ? "Saving…" : "Save"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <p className="mt-6 text-xs text-steel" style={{ fontFamily: "var(--font-montserrat)" }}>
            These rates are used for sweat equity calculations and time log valuations.
          </p>

          {toast && (
            <p className={`mt-4 text-sm text-center ${toast.type === "success" ? "text-green-600" : "text-red-500"}`} style={{ fontFamily: "var(--font-montserrat)" }}>
              {toast.message}
            </p>
          )}
        </div>
      </Tabs.Content>

      {/* ── Reminder Templates tab ── */}
      <Tabs.Content value="reminder_templates">
        <div className="bg-white border border-linen p-8 max-w-2xl" style={{ borderRadius: 0 }}>
          <h3
            className="text-navy font-bold text-sm uppercase tracking-wider mb-6"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            Reminder Templates
          </h3>

          <div className="space-y-8">
            {TEMPLATE_KEYS.map(({ key, label, variables }) => (
              <div key={key} className="border-b border-linen pb-6 last:border-0">
                <p className="text-xs text-navy font-semibold uppercase tracking-widest mb-3" style={{ fontFamily: "var(--font-montserrat)" }}>
                  {label}
                </p>

                <div className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Subject</label>
                    <input
                      type="text"
                      value={templates[key]?.subject ?? ""}
                      onChange={(e) =>
                        setTemplates((prev) => ({
                          ...prev,
                          [key]: { ...prev[key], subject: e.target.value },
                        }))
                      }
                      className={boxInputClass}
                      style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Body</label>
                    <textarea
                      rows={5}
                      value={templates[key]?.body ?? ""}
                      onChange={(e) =>
                        setTemplates((prev) => ({
                          ...prev,
                          [key]: { ...prev[key], body: e.target.value },
                        }))
                      }
                      className={boxInputClass}
                      style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0, resize: "vertical" }}
                    />
                  </div>

                  <p className="text-xs text-steel" style={{ fontFamily: "var(--font-montserrat)" }}>
                    Available variables: {variables}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <button
              onClick={handleSaveTemplates}
              disabled={templatesSaving}
              className="w-full py-3 text-white text-sm font-semibold transition-opacity disabled:opacity-60"
              style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
            >
              {templatesSaving ? "Saving…" : "Save Templates"}
            </button>
            {toast && (
              <p className={`mt-2 text-sm text-center ${toast.type === "success" ? "text-green-600" : "text-red-500"}`} style={{ fontFamily: "var(--font-montserrat)" }}>
                {toast.message}
              </p>
            )}
          </div>
        </div>
      </Tabs.Content>

      {/* ── Slip Ingestion tab ── */}
      <Tabs.Content value="slip_ingestion">
        <div className="bg-white border border-linen p-8 max-w-2xl" style={{ borderRadius: 0 }}>
          <h3
            className="text-navy font-bold text-sm uppercase tracking-wider mb-6"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            Slip Ingestion
          </h3>

          <div className="space-y-6">
            {/* OpenAI API Key */}
            <div className="flex flex-col gap-1">
              <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>OpenAI API Key</label>
              <input
                type="password"
                value={ingestionSettings.openai_api_key}
                onChange={(e) => setIngestionSettings((prev) => ({ ...prev, openai_api_key: e.target.value }))}
                className={boxInputClass}
                style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                placeholder={ingestionSettings.openai_key_set ? "••••••••  (key is set — enter new value to replace)" : "sk-…"}
                autoComplete="new-password"
              />
              {ingestionSettings.openai_key_set && !ingestionSettings.openai_api_key && (
                <p className="text-xs text-green-600 mt-1" style={{ fontFamily: "var(--font-montserrat)" }}>
                  API key is configured.
                </p>
              )}
            </div>

            {/* Inbound email */}
            <div className="flex flex-col gap-1">
              <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Inbound Email</label>
              <div className="border border-linen bg-linen/20 px-3 py-2">
                <span className="text-sm text-ink font-mono" style={{ fontFamily: "var(--font-montserrat)" }}>
                  slips@staatwright.co.za
                </span>
                <span className="ml-3 text-xs text-steel" style={{ fontFamily: "var(--font-montserrat)" }}>
                  — configure DNS MX record to forward to Postmark
                </span>
              </div>
            </div>

            {/* Confidence threshold */}
            <div className="flex flex-col gap-1">
              <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>
                Default Confidence Threshold (0–100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={ingestionSettings.slip_confidence_threshold}
                onChange={(e) =>
                  setIngestionSettings((prev) => ({
                    ...prev,
                    slip_confidence_threshold: parseInt(e.target.value, 10) || 0,
                  }))
                }
                className={boxInputClass}
                style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
              />
              <p className="text-xs text-steel" style={{ fontFamily: "var(--font-montserrat)" }}>
                Slips with AI confidence below this value will be flagged for manual review.
              </p>
            </div>

            {/* Notification preference */}
            <div className="flex flex-col gap-1">
              <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Notification Preference</label>
              <select
                value={ingestionSettings.slip_notification_preference}
                onChange={(e) =>
                  setIngestionSettings((prev) => ({
                    ...prev,
                    slip_notification_preference: e.target.value as "email" | "in_app" | "both",
                  }))
                }
                className={boxInputClass}
                style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
              >
                <option value="email">Email</option>
                <option value="in_app">In-app</option>
                <option value="both">Both</option>
              </select>
            </div>

            {/* Enable automatic processing */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={ingestionSettings.slip_processing_enabled}
                onClick={() =>
                  setIngestionSettings((prev) => ({
                    ...prev,
                    slip_processing_enabled: !prev.slip_processing_enabled,
                  }))
                }
                className="relative inline-flex h-5 w-9 items-center transition-colors"
                style={{
                  background: ingestionSettings.slip_processing_enabled ? "#1F2A38" : "#EAE4DC",
                  borderRadius: 0,
                  border: "1px solid #EAE4DC",
                }}
              >
                <span
                  className="inline-block h-4 w-4 bg-white transition-transform"
                  style={{
                    transform: ingestionSettings.slip_processing_enabled ? "translateX(18px)" : "translateX(2px)",
                  }}
                />
              </button>
              <label className="text-sm text-ink" style={{ fontFamily: "var(--font-montserrat)" }}>
                Enable automatic slip processing
              </label>
            </div>
          </div>

          <div className="mt-8">
            <button
              onClick={handleSaveIngestion}
              disabled={ingestionSaving}
              className="w-full py-3 text-white text-sm font-semibold transition-opacity disabled:opacity-60"
              style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
            >
              {ingestionSaving ? "Saving…" : "Save Ingestion Settings"}
            </button>
            {toast && (
              <p className={`mt-2 text-sm text-center ${toast.type === "success" ? "text-green-600" : "text-red-500"}`} style={{ fontFamily: "var(--font-montserrat)" }}>
                {toast.message}
              </p>
            )}
          </div>
        </div>
      </Tabs.Content>
    </Tabs.Root>
  );
}

"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import * as Tabs from "@radix-ui/react-tabs";
import { createClient } from "@/lib/supabase/client";
import AdminTopBar from "@/components/admin/AdminTopBar";
import type {
  Brand,
  BrandStatus,
  BrandColour,
  ColourRole,
  BrandTypography,
  TypographyRole,
  FontSource,
  BrandLogo,
  LogoVariant,
} from "@/lib/types";

// ─── Shared styles ──────────────────────────────────────────────────────────

const inputClass =
  "border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm";
const labelClass =
  "block text-xs text-steel uppercase tracking-wider mb-1";
const tabTriggerClass =
  "px-5 py-3 text-sm font-medium border-b-2 transition-colors data-[state=active]:border-navy data-[state=active]:text-navy data-[state=inactive]:border-transparent data-[state=inactive]:text-steel hover:text-navy";

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string | number | null;
  onChange: (val: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col">
      <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>
        {label}
      </label>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
        style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
      />
    </div>
  );
}

// ─── Identity Tab ────────────────────────────────────────────────────────────

function IdentityTab({ brand, onSaved }: { brand: Brand; onSaved: (b: Brand) => void }) {
  const supabase = createClient();
  const [form, setForm] = useState<Brand>(brand);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function set(key: keyof Brand, val: string | boolean | number) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSave() {
    setSaving(true);
    setToast(null);
    const { error } = await supabase
      .from("brands")
      .update({
        name: form.name,
        tagline: form.tagline,
        description: form.description,
        status: form.status,
        live_url: form.live_url,
        show_on_public_site: form.show_on_public_site,
        public_one_liner: form.public_one_liner,
        public_sort_order: form.public_sort_order,
      })
      .eq("id", brand.id);

    setSaving(false);
    if (error) {
      setToast({ type: "error", message: error.message || "Save failed." });
    } else {
      setToast({ type: "success", message: "Saved!" });
      onSaved(form);
      setTimeout(() => setToast(null), 3000);
    }
  }

  return (
    <div className="bg-white border border-linen p-8 max-w-2xl" style={{ borderRadius: 0 }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Field label="Brand Name" value={form.name} onChange={(v) => set("name", v)} />
        <Field label="Tagline" value={form.tagline} onChange={(v) => set("tagline", v)} />
        <div className="sm:col-span-2 flex flex-col">
          <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Description</label>
          <textarea
            rows={4}
            value={form.description ?? ""}
            onChange={(e) => set("description", e.target.value)}
            className="border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm resize-y"
            style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
          />
        </div>
        <div className="flex flex-col">
          <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Status</label>
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value as BrandStatus)}
            className={inputClass}
            style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
          >
            <option value="in_development">In Development</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <Field label="Live URL" value={form.live_url} onChange={(v) => set("live_url", v)} type="url" placeholder="https://" />
        <Field label="Public One-Liner" value={form.public_one_liner} onChange={(v) => set("public_one_liner", v)} />
        <Field label="Public Sort Order" value={form.public_sort_order} onChange={(v) => set("public_sort_order", Number(v))} type="number" />
        <div className="flex items-center gap-3 pt-4">
          <input
            type="checkbox"
            id="identity_show_public"
            checked={form.show_on_public_site}
            onChange={(e) => set("show_on_public_site", e.target.checked)}
            className="w-4 h-4 accent-navy"
          />
          <label
            htmlFor="identity_show_public"
            className="text-sm text-ink"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            Show on public site
          </label>
        </div>
      </div>

      <div className="mt-8">
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="w-full py-3 text-white text-sm font-semibold transition-opacity disabled:opacity-60"
          style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
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
    </div>
  );
}

// ─── Colours Tab ─────────────────────────────────────────────────────────────

function ColoursTab({ brandId }: { brandId: string }) {
  const supabase = createClient();
  const [colours, setColours] = useState<BrandColour[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form state
  const [newName, setNewName] = useState("");
  const [newHex, setNewHex] = useState("#000000");
  const [newRole, setNewRole] = useState<ColourRole>("primary");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  async function loadColours() {
    const { data } = await supabase
      .from("brand_colours")
      .select("*")
      .eq("brand_id", brandId)
      .order("role", { ascending: true });
    setColours(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadColours();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) {
      setAddError("Name is required.");
      return;
    }
    setAdding(true);
    setAddError(null);
    const { error } = await supabase.from("brand_colours").insert({
      brand_id: brandId,
      name: newName.trim(),
      hex: newHex,
      role: newRole,
    });
    setAdding(false);
    if (error) {
      setAddError(error.message);
    } else {
      setNewName("");
      setNewHex("#000000");
      setNewRole("primary");
      loadColours();
    }
  }

  async function handleDelete(id: string) {
    await supabase.from("brand_colours").delete().eq("id", id);
    setColours((prev) => prev.filter((c) => c.id !== id));
  }

  function copyHex(hex: string) {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(hex).catch(() => {});
    }
  }

  if (loading) return <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>Loading…</p>;

  return (
    <div className="max-w-2xl space-y-8">
      {/* Swatches */}
      <div className="bg-white border border-linen p-8" style={{ borderRadius: 0 }}>
        <h4 className="text-navy font-bold text-sm uppercase tracking-wider mb-5" style={{ fontFamily: "var(--font-inter)" }}>
          Palette
        </h4>
        {colours.length === 0 ? (
          <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>No colours yet.</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {colours.map((colour) => (
              <div key={colour.id} className="flex flex-col items-center gap-2 group relative">
                {/* Swatch */}
                <button
                  type="button"
                  title={`Copy ${colour.hex}`}
                  onClick={() => copyHex(colour.hex ?? "")}
                  className="w-10 h-10 border border-linen hover:scale-105 transition-transform cursor-pointer"
                  style={{ backgroundColor: colour.hex ?? "#ccc", borderRadius: 0 }}
                />
                <div className="text-center">
                  <p className="text-xs text-ink font-medium leading-none" style={{ fontFamily: "var(--font-montserrat)" }}>
                    {colour.name}
                  </p>
                  <p className="text-xs text-steel leading-none mt-0.5 uppercase" style={{ fontFamily: "var(--font-montserrat)" }}>
                    {colour.hex}
                  </p>
                  <p className="text-xs text-steel leading-none mt-0.5 capitalize" style={{ fontFamily: "var(--font-montserrat)" }}>
                    {colour.role}
                  </p>
                </div>
                {/* Delete */}
                <button
                  type="button"
                  onClick={() => handleDelete(colour.id)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ borderRadius: 0 }}
                  title="Delete colour"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add swatch form */}
      <div className="bg-white border border-linen p-8" style={{ borderRadius: 0 }}>
        <h4 className="text-navy font-bold text-sm uppercase tracking-wider mb-5" style={{ fontFamily: "var(--font-inter)" }}>
          Add Colour
        </h4>
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="flex flex-col">
            <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              className={inputClass}
              style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
            />
          </div>
          <div className="flex flex-col">
            <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Hex</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={newHex}
                onChange={(e) => setNewHex(e.target.value)}
                className="w-10 h-9 border border-linen cursor-pointer shrink-0"
                style={{ borderRadius: 0, padding: "2px" }}
              />
              <input
                type="text"
                value={newHex}
                onChange={(e) => setNewHex(e.target.value)}
                className={inputClass}
                style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                placeholder="#000000"
              />
            </div>
          </div>
          <div className="flex flex-col">
            <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Role</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as ColourRole)}
              className={inputClass}
              style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
            >
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
              <option value="accent">Accent</option>
              <option value="background">Background</option>
              <option value="text">Text</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={adding}
              className="w-full py-2.5 text-white text-sm font-semibold disabled:opacity-60"
              style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
            >
              {adding ? "Adding…" : "Add Colour"}
            </button>
          </div>
          {addError && (
            <p className="sm:col-span-2 text-red-500 text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
              {addError}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

// ─── Typography Tab ──────────────────────────────────────────────────────────

function TypographyTab({ brandId }: { brandId: string }) {
  const supabase = createClient();
  const [entries, setEntries] = useState<BrandTypography[]>([]);
  const [loading, setLoading] = useState(true);

  const [newFont, setNewFont] = useState("");
  const [newWeight, setNewWeight] = useState("400");
  const [newRole, setNewRole] = useState<TypographyRole>("body");
  const [newSource, setNewSource] = useState<FontSource>("google");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  async function loadEntries() {
    const { data } = await supabase
      .from("brand_typography")
      .select("*")
      .eq("brand_id", brandId)
      .order("role", { ascending: true });
    setEntries(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadEntries();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newFont.trim()) {
      setAddError("Font name is required.");
      return;
    }
    setAdding(true);
    setAddError(null);
    const { error } = await supabase.from("brand_typography").insert({
      brand_id: brandId,
      font_name: newFont.trim(),
      weight: newWeight,
      role: newRole,
      source: newSource,
    });
    setAdding(false);
    if (error) {
      setAddError(error.message);
    } else {
      setNewFont("");
      setNewWeight("400");
      setNewRole("body");
      setNewSource("google");
      loadEntries();
    }
  }

  async function handleDelete(id: string) {
    await supabase.from("brand_typography").delete().eq("id", id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  if (loading) return <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>Loading…</p>;

  return (
    <div className="max-w-2xl space-y-8">
      {/* List */}
      <div className="bg-white border border-linen" style={{ borderRadius: 0 }}>
        <div className="px-8 pt-8 pb-4">
          <h4 className="text-navy font-bold text-sm uppercase tracking-wider" style={{ fontFamily: "var(--font-inter)" }}>
            Type Styles
          </h4>
        </div>
        {entries.length === 0 ? (
          <p className="px-8 pb-8 text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>No type styles yet.</p>
        ) : (
          <ul className="divide-y divide-linen">
            {entries.map((entry) => (
              <li key={entry.id} className="px-8 py-4 flex items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-ink text-sm font-bold" style={{ fontFamily: "var(--font-inter)" }}>
                    {entry.font_name}
                  </span>
                  <span className="text-xs text-steel capitalize" style={{ fontFamily: "var(--font-montserrat)" }}>
                    {entry.role} · {entry.weight} · {entry.source}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(entry.id)}
                  className="text-steel hover:text-red-500 transition-colors text-lg leading-none"
                  title="Delete"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add form */}
      <div className="bg-white border border-linen p-8" style={{ borderRadius: 0 }}>
        <h4 className="text-navy font-bold text-sm uppercase tracking-wider mb-5" style={{ fontFamily: "var(--font-inter)" }}>
          Add Type Style
        </h4>
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="flex flex-col">
            <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Font Name</label>
            <input
              type="text"
              value={newFont}
              onChange={(e) => setNewFont(e.target.value)}
              required
              className={inputClass}
              style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
              placeholder="e.g. Inter"
            />
          </div>
          <div className="flex flex-col">
            <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Weight</label>
            <input
              type="text"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              className={inputClass}
              style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
              placeholder="400"
            />
          </div>
          <div className="flex flex-col">
            <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Role</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as TypographyRole)}
              className={inputClass}
              style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
            >
              <option value="display">Display</option>
              <option value="body">Body</option>
              <option value="ui">UI</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Source</label>
            <select
              value={newSource}
              onChange={(e) => setNewSource(e.target.value as FontSource)}
              className={inputClass}
              style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
            >
              <option value="google">Google</option>
              <option value="custom">Custom</option>
              <option value="system">System</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={adding}
              className="w-full py-2.5 text-white text-sm font-semibold disabled:opacity-60"
              style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
            >
              {adding ? "Adding…" : "Add Type Style"}
            </button>
          </div>
          {addError && (
            <p className="sm:col-span-2 text-red-500 text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
              {addError}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

// ─── Logos Tab ───────────────────────────────────────────────────────────────

function LogosTab({ brandId }: { brandId: string }) {
  const supabase = createClient();
  const [logos, setLogos] = useState<BrandLogo[]>([]);
  const [loading, setLoading] = useState(true);

  const [newVariant, setNewVariant] = useState<LogoVariant>("primary");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadLogos() {
    const { data } = await supabase
      .from("brand_logos")
      .select("*")
      .eq("brand_id", brandId)
      .order("uploaded_at", { ascending: false });
    setLogos(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadLogos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId]);

  function getPublicUrl(storagePath: string): string {
    const { data } = supabase.storage
      .from("brand-assets")
      .getPublicUrl(storagePath);
    return data.publicUrl;
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setUploadError("Please select a file.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    const ext = file.name.split(".").pop();
    const safeName = `${Date.now()}.${ext}`;
    const storagePath = `${brandId}/${newVariant}/${safeName}`;

    const { error: uploadErr } = await supabase.storage
      .from("brand-assets")
      .upload(storagePath, file);

    if (uploadErr) {
      setUploadError(uploadErr.message);
      setUploading(false);
      return;
    }

    const { error: insertErr } = await supabase.from("brand_logos").insert({
      brand_id: brandId,
      variant: newVariant,
      storage_path: storagePath,
    });

    setUploading(false);

    if (insertErr) {
      setUploadError(insertErr.message);
      // Clean up orphaned upload
      await supabase.storage.from("brand-assets").remove([storagePath]);
    } else {
      if (fileInputRef.current) fileInputRef.current.value = "";
      setNewVariant("primary");
      loadLogos();
    }
  }

  async function handleDelete(logo: BrandLogo) {
    await supabase.storage.from("brand-assets").remove([logo.storage_path]);
    await supabase.from("brand_logos").delete().eq("id", logo.id);
    setLogos((prev) => prev.filter((l) => l.id !== logo.id));
  }

  if (loading) return <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>Loading…</p>;

  return (
    <div className="max-w-2xl space-y-8">
      {/* Logo list */}
      <div className="bg-white border border-linen" style={{ borderRadius: 0 }}>
        <div className="px-8 pt-8 pb-4">
          <h4 className="text-navy font-bold text-sm uppercase tracking-wider" style={{ fontFamily: "var(--font-inter)" }}>
            Uploaded Logos
          </h4>
        </div>
        {logos.length === 0 ? (
          <p className="px-8 pb-8 text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>No logos uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-linen">
            {logos.map((logo) => {
              const publicUrl = getPublicUrl(logo.storage_path);
              return (
                <li key={logo.id} className="px-8 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Preview */}
                    <div
                      className="w-16 h-12 border border-linen flex items-center justify-center bg-linen/30 overflow-hidden shrink-0"
                      style={{ borderRadius: 0 }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={publicUrl}
                        alt={`${logo.variant} logo`}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span
                        className="text-sm text-ink font-medium capitalize"
                        style={{ fontFamily: "var(--font-montserrat)" }}
                      >
                        {logo.variant}
                      </span>
                      <span
                        className="text-xs text-steel"
                        style={{ fontFamily: "var(--font-montserrat)" }}
                      >
                        {new Date(logo.uploaded_at).toLocaleDateString("en-ZA", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <a
                      href={publicUrl}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-steel hover:text-navy underline"
                      style={{ fontFamily: "var(--font-montserrat)" }}
                    >
                      Download
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDelete(logo)}
                      className="text-steel hover:text-red-500 transition-colors text-lg leading-none"
                      title="Delete logo"
                    >
                      ×
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Upload form */}
      <div className="bg-white border border-linen p-8" style={{ borderRadius: 0 }}>
        <h4 className="text-navy font-bold text-sm uppercase tracking-wider mb-5" style={{ fontFamily: "var(--font-inter)" }}>
          Upload Logo
        </h4>
        <form onSubmit={handleUpload} className="flex flex-col gap-5">
          <div className="flex flex-col">
            <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Variant</label>
            <select
              value={newVariant}
              onChange={(e) => setNewVariant(e.target.value as LogoVariant)}
              className={inputClass}
              style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
            >
              <option value="primary">Primary</option>
              <option value="icon">Icon</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="horizontal">Horizontal</option>
              <option value="stacked">Stacked</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>File</label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,.svg"
              required
              className="text-sm text-ink py-2 border-b border-linen focus:border-navy outline-none bg-transparent w-full"
              style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
            />
          </div>
          {uploadError && (
            <p className="text-red-500 text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
              {uploadError}
            </p>
          )}
          <button
            type="submit"
            disabled={uploading}
            className="w-full py-2.5 text-white text-sm font-semibold disabled:opacity-60"
            style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
          >
            {uploading ? "Uploading…" : "Upload Logo"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function BrandWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";

  const supabase = createClient();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setBrand(data as Brand);
      }
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <>
        <AdminTopBar title="Brand" user={null} />
        <main className="pt-[56px] p-8">
          <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>Loading…</p>
        </main>
      </>
    );
  }

  if (notFound || !brand) {
    return (
      <>
        <AdminTopBar title="Brand not found" user={null} />
        <main className="pt-[56px] p-8">
          <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
            Brand not found.{" "}
            <button
              type="button"
              onClick={() => router.push("/admin/brands")}
              className="underline hover:text-navy"
            >
              Back to brands
            </button>
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <AdminTopBar title={brand.name} user={null} />

      <main className="pt-[56px] p-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => router.push("/admin/brands")}
            className="text-steel text-sm hover:text-navy transition-colors"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            ← Brands
          </button>
          <span className="text-linen select-none">/</span>
          <span
            className="text-ink text-sm"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            {brand.name}
          </span>
        </div>

        <Tabs.Root defaultValue="identity" className="w-full">
          {/* Tab list */}
          <div className="border-b border-linen mb-8">
            <Tabs.List className="flex gap-0 -mb-px" aria-label="Brand sections">
              {[
                { value: "identity", label: "Identity" },
                { value: "colours", label: "Colours" },
                { value: "typography", label: "Typography" },
                { value: "logos", label: "Logos" },
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

          <Tabs.Content value="identity">
            <IdentityTab brand={brand} onSaved={setBrand} />
          </Tabs.Content>

          <Tabs.Content value="colours">
            <ColoursTab brandId={brand.id} />
          </Tabs.Content>

          <Tabs.Content value="typography">
            <TypographyTab brandId={brand.id} />
          </Tabs.Content>

          <Tabs.Content value="logos">
            <LogosTab brandId={brand.id} />
          </Tabs.Content>
        </Tabs.Root>
      </main>
    </>
  );
}

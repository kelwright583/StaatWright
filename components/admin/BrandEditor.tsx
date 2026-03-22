"use client";

/*
 * SQL migration — run in Supabase SQL Editor if these columns don't exist:
 *
 * ALTER TABLE public.brands
 *   ADD COLUMN IF NOT EXISTS hero_image_path text,
 *   ADD COLUMN IF NOT EXISTS card_bg_color text,
 *   ADD COLUMN IF NOT EXISTS heading_font text,
 *   ADD COLUMN IF NOT EXISTS body_font text,
 *   ADD COLUMN IF NOT EXISTS public_slug text UNIQUE,
 *   ADD COLUMN IF NOT EXISTS public_show_case_study boolean DEFAULT false,
 *   ADD COLUMN IF NOT EXISTS public_extended_description text;
 */

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
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

const inputClass =
  "border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm";
const labelClass =
  "block text-xs text-steel uppercase tracking-wider mb-1";

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

// ─── BrandIdentityForm ──────────────────────────────────────────────────────

interface BrandIdentityProps {
  brand: Brand;
  onSaved: (b: Brand) => void;
  hasPrimaryColour?: boolean;
}

export function BrandIdentityForm({ brand, onSaved, hasPrimaryColour = false }: BrandIdentityProps) {
  const supabase = createClient();
  const [form, setForm] = useState<Brand>(brand);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const boardInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setForm(brand); }, [brand]);

  function set(key: keyof Brand, val: string | boolean | number) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  const missingFields: string[] = [];
  if (!form.name?.trim()) missingFields.push("Brand Name");
  if (!form.public_one_liner?.trim()) missingFields.push("Public One-Liner");
  if (!brand.hero_image_path) missingFields.push("Hero Image (Card Appearance tab)");
  if (!brand.card_bg_color) missingFields.push("Card Background Colour (Card Appearance tab)");
  if (!hasPrimaryColour) missingFields.push("Primary Colour (Colours tab)");
  const canPublish = missingFields.length === 0;

  useEffect(() => {
    if (!canPublish && form.show_on_public_site) {
      setForm((prev) => ({ ...prev, show_on_public_site: false }));
    }
  }, [canPublish, form.show_on_public_site]);

  async function handleBoardUpload() {
    const file = boardInputRef.current?.files?.[0];
    if (!file) return;

    const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!ALLOWED.includes(file.type)) {
      setToast({ type: "error", message: "Only image files are allowed (JPG, PNG, WebP, GIF)." });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setToast({ type: "error", message: "Brand board image must be under 10 MB." });
      return;
    }

    setAnalysing(true);
    setToast(null);

    const ext = file.name.split(".").pop();
    const storagePath = `${brand.id}/brand-board/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("brand-assets").upload(storagePath, file);
    if (upErr) {
      setToast({ type: "error", message: upErr.message });
      setAnalysing(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("brand-assets").getPublicUrl(storagePath);

    try {
      const res = await fetch("/api/brand-board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_url: urlData.publicUrl }),
      });
      const result = await res.json();

      if (!res.ok) {
        setToast({ type: "error", message: result.error || "Brand board analysis failed." });
        setAnalysing(false);
        return;
      }

      if (result.name && !form.name?.trim()) set("name", result.name);
      if (result.tagline) set("tagline", result.tagline);
      if (result.description) set("description", result.description);
      if (result.one_liner) set("public_one_liner", result.one_liner);

      if (result.colours?.length) {
        for (const c of result.colours) {
          await supabase.from("brand_colours").insert({
            brand_id: brand.id,
            name: c.name || "Extracted",
            hex: c.hex,
            role: c.role || "accent",
          });
        }
      }

      const updates: Record<string, string> = {};
      if (result.heading_font) updates.heading_font = result.heading_font;
      if (result.body_font) updates.body_font = result.body_font;
      if (Object.keys(updates).length) {
        await supabase.from("brands").update(updates).eq("id", brand.id);
      }

      setToast({ type: "success", message: "Brand board analysed! Review the fields below and save." });
    } catch {
      setToast({ type: "error", message: "Failed to analyse brand board." });
    }

    setAnalysing(false);
    if (boardInputRef.current) boardInputRef.current.value = "";
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
        show_on_public_site: canPublish ? form.show_on_public_site : false,
        public_one_liner: form.public_one_liner,
        public_sort_order: form.public_sort_order,
      })
      .eq("id", brand.id);

    setSaving(false);
    if (error) {
      setToast({ type: "error", message: error.message || "Save failed." });
    } else {
      setToast({ type: "success", message: "Saved!" });
      onSaved({ ...form, show_on_public_site: canPublish ? form.show_on_public_site : false });
      setTimeout(() => setToast(null), 3000);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Brand Board Upload */}
      <div className="bg-white border border-dashed border-linen p-6" style={{ borderRadius: 0 }}>
        <h4
          className="text-navy font-bold text-sm uppercase tracking-wider mb-2"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          Upload Brand Board
        </h4>
        <p
          className="text-xs text-steel mb-4"
          style={{ fontFamily: "var(--font-montserrat)" }}
        >
          Have a brand board? Upload it and AI will extract colours, fonts, and brand details to
          pre-fill the form. You can review and adjust everything before saving.
        </p>
        <div className="flex items-center gap-4">
          <input
            type="file"
            ref={boardInputRef}
            accept="image/*"
            onChange={handleBoardUpload}
            disabled={analysing}
            className="text-sm text-ink py-2 border-b border-linen focus:border-navy outline-none bg-transparent flex-1"
            style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
          />
          {analysing && (
            <span
              className="text-xs text-navy font-medium animate-pulse"
              style={{ fontFamily: "var(--font-montserrat)" }}
            >
              Analysing brand board…
            </span>
          )}
        </div>
      </div>

      {/* Identity Fields */}
      <div className="bg-white border border-linen p-8" style={{ borderRadius: 0 }}>
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

          {/* Show on Public Site toggle */}
          <div
            className={`sm:col-span-2 flex items-center justify-between gap-4 px-5 py-4 border ${
              !canPublish
                ? "border-linen bg-gray-50 opacity-60"
                : form.show_on_public_site
                  ? "border-green-300 bg-green-50"
                  : "border-linen bg-white"
            }`}
            style={{ borderRadius: 0 }}
          >
            <div className="flex flex-col gap-0.5">
              <span
                className="text-sm font-semibold text-ink"
                style={{ fontFamily: "var(--font-montserrat)" }}
              >
                Show on public site
              </span>
              {canPublish ? (
                <span
                  className="text-xs text-steel"
                  style={{ fontFamily: "var(--font-montserrat)" }}
                >
                  When enabled, this brand appears in Partners &amp; Builds on the public website.
                </span>
              ) : (
                <span
                  className="text-xs text-red-500"
                  style={{ fontFamily: "var(--font-montserrat)" }}
                >
                  Complete these fields first: {missingFields.join(", ")}
                </span>
              )}
            </div>
            <label className={`relative inline-flex items-center shrink-0 ${canPublish ? "cursor-pointer" : "cursor-not-allowed"}`}>
              <input
                type="checkbox"
                id="identity_show_public"
                checked={form.show_on_public_site}
                onChange={(e) => set("show_on_public_site", e.target.checked)}
                disabled={!canPublish}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-linen peer-checked:bg-navy peer-disabled:opacity-40 rounded-full transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
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
    </div>
  );
}

// ─── BrandColoursEditor ─────────────────────────────────────────────────────

export function BrandColoursEditor({ brandId }: { brandId: string }) {
  const supabase = createClient();
  const [colours, setColours] = useState<BrandColour[]>([]);
  const [loading, setLoading] = useState(true);

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

// ─── BrandTypographyEditor ──────────────────────────────────────────────────

export function BrandTypographyEditor({ brandId }: { brandId: string }) {
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

// ─── BrandLogosEditor ───────────────────────────────────────────────────────

export function BrandLogosEditor({ brandId }: { brandId: string }) {
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

    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/svg+xml", "image/webp", "image/gif"];
    const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError("Only image files are allowed (JPG, PNG, SVG, WebP, GIF).");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setUploadError("File must be under 5 MB.");
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

// ─── BrandCardFields ────────────────────────────────────────────────────────

export function BrandCardFields({ brand, onSaved }: { brand: Brand; onSaved: (b: Brand) => void }) {
  const supabase = createClient();
  const [form, setForm] = useState({
    hero_image_path: brand.hero_image_path ?? "",
    card_bg_color: brand.card_bg_color ?? "#1F2A38",
    heading_font: brand.heading_font ?? "",
    body_font: brand.body_font ?? "",
    public_slug: brand.public_slug ?? "",
    public_show_case_study: brand.public_show_case_study ?? false,
    public_extended_description: brand.public_extended_description ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm({
      hero_image_path: brand.hero_image_path ?? "",
      card_bg_color: brand.card_bg_color ?? "#1F2A38",
      heading_font: brand.heading_font ?? "",
      body_font: brand.body_font ?? "",
      public_slug: brand.public_slug ?? "",
      public_show_case_study: brand.public_show_case_study ?? false,
      public_extended_description: brand.public_extended_description ?? "",
    });
  }, [brand]);

  function slugify(val: string) {
    return val.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/--+/g, "-");
  }

  async function handleHeroUpload() {
    const file = heroInputRef.current?.files?.[0];
    if (!file) return;

    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
    if (!ALLOWED_TYPES.includes(file.type)) {
      setToast({ type: "error", message: "Only image files are allowed (JPG, PNG, WebP, GIF)." });
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setToast({ type: "error", message: "Hero image must be under 5 MB." });
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const safeName = `${Date.now()}.${ext}`;
    const storagePath = `${brand.id}/hero/${safeName}`;

    const { error: upErr } = await supabase.storage
      .from("brand-assets")
      .upload(storagePath, file);

    setUploading(false);
    if (upErr) {
      setToast({ type: "error", message: upErr.message });
      return;
    }
    setForm((p) => ({ ...p, hero_image_path: storagePath }));
    if (heroInputRef.current) heroInputRef.current.value = "";
    setToast({ type: "success", message: "Hero image uploaded. Save to apply." });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSave() {
    if (form.public_slug && !/^[a-z0-9-]+$/.test(form.public_slug)) {
      setToast({ type: "error", message: "Slug must be lowercase letters, numbers and hyphens only." });
      return;
    }
    setSaving(true);
    setToast(null);
    const { data, error } = await supabase
      .from("brands")
      .update({
        hero_image_path: form.hero_image_path || null,
        card_bg_color: form.card_bg_color || null,
        heading_font: form.heading_font || null,
        body_font: form.body_font || null,
        public_slug: form.public_slug || null,
        public_show_case_study: form.public_show_case_study,
        public_extended_description: form.public_extended_description || null,
      })
      .eq("id", brand.id)
      .select()
      .single();
    setSaving(false);
    if (error) {
      setToast({ type: "error", message: error.message });
    } else {
      setToast({ type: "success", message: "Saved!" });
      if (data) onSaved(data as Brand);
      setTimeout(() => setToast(null), 3000);
    }
  }

  return (
    <div className="bg-white border border-linen p-8 max-w-2xl" style={{ borderRadius: 0 }}>
      <div className="space-y-6">
        <div className="flex flex-col">
          <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Hero Image</label>
          <input
            type="file"
            ref={heroInputRef}
            accept="image/*"
            onChange={handleHeroUpload}
            className="text-sm text-ink py-2 border-b border-linen focus:border-navy outline-none bg-transparent w-full"
            style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
          />
          {uploading && <p className="text-xs text-steel mt-1" style={{ fontFamily: "var(--font-montserrat)" }}>Uploading…</p>}
          {form.hero_image_path && (
            <p className="text-xs text-steel mt-1" style={{ fontFamily: "var(--font-montserrat)" }}>
              Current: {form.hero_image_path}
            </p>
          )}
        </div>

        <div className="flex flex-col">
          <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Card Background Colour</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.card_bg_color}
              onChange={(e) => setForm((p) => ({ ...p, card_bg_color: e.target.value }))}
              className="w-10 h-9 border border-linen cursor-pointer shrink-0"
              style={{ borderRadius: 0, padding: "2px" }}
            />
            <input
              type="text"
              value={form.card_bg_color}
              onChange={(e) => setForm((p) => ({ ...p, card_bg_color: e.target.value }))}
              className={inputClass}
              style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
              placeholder="#1F2A38"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="flex flex-col">
            <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Heading Font</label>
            <input
              type="text"
              value={form.heading_font}
              onChange={(e) => setForm((p) => ({ ...p, heading_font: e.target.value }))}
              placeholder="'Playfair Display', serif"
              className={inputClass}
              style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
            />
          </div>
          <div className="flex flex-col">
            <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Body Font</label>
            <input
              type="text"
              value={form.body_font}
              onChange={(e) => setForm((p) => ({ ...p, body_font: e.target.value }))}
              placeholder="'DM Sans', sans-serif"
              className={inputClass}
              style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
            />
          </div>
        </div>

        <div className="flex flex-col">
          <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Public Slug</label>
          <input
            type="text"
            value={form.public_slug}
            onChange={(e) => setForm((p) => ({ ...p, public_slug: slugify(e.target.value) }))}
            placeholder="concierge-styled"
            className={inputClass}
            style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
          />
          {form.public_slug && (
            <p className="text-xs text-steel mt-1" style={{ fontFamily: "var(--font-montserrat)" }}>
              staatwright.co.za/work/{form.public_slug}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="brand_case_study"
            checked={form.public_show_case_study}
            onChange={(e) => setForm((p) => ({ ...p, public_show_case_study: e.target.checked }))}
            className="w-4 h-4 accent-navy"
          />
          <label
            htmlFor="brand_case_study"
            className="text-sm text-ink"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            Show case study page
          </label>
        </div>

        <div className="flex flex-col">
          <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Extended Description (Case Study)</label>
          <textarea
            rows={5}
            value={form.public_extended_description}
            onChange={(e) => setForm((p) => ({ ...p, public_extended_description: e.target.value }))}
            className="border border-linen focus:border-navy outline-none bg-transparent p-3 w-full text-ink text-sm resize-y"
            style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
          />
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
          {saving ? "Saving…" : "Save Card Appearance"}
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

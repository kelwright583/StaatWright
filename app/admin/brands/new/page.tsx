"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AdminTopBar from "@/components/admin/AdminTopBar";
import type { BrandStatus } from "@/lib/types";

const inputClass =
  "border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm";
const labelClass =
  "block text-xs text-steel uppercase tracking-wider mb-1";

export default function NewBrandPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [status, setStatus] = useState<BrandStatus>("in_development");
  const [liveUrl, setLiveUrl] = useState("");
  const [showOnPublicSite, setShowOnPublicSite] = useState(false);
  const [publicOneLiner, setPublicOneLiner] = useState("");
  const [publicSortOrder, setPublicSortOrder] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Brand name is required.");
      return;
    }

    setSaving(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from("brands")
      .insert({
        name: name.trim(),
        tagline: tagline.trim() || null,
        status,
        live_url: liveUrl.trim() || null,
        show_on_public_site: showOnPublicSite,
        public_one_liner: publicOneLiner.trim() || null,
        public_sort_order: publicSortOrder,
      })
      .select("id")
      .single();

    if (insertError) {
      setError(insertError.message || "Failed to create brand.");
      setSaving(false);
      return;
    }

    router.push(`/admin/brands/${data.id}`);
  }

  return (
    <>
      <AdminTopBar title="New Brand" user={null} />
      <main className="pt-[56px] p-8">
        <div className="max-w-xl">
          <div className="mb-6 flex items-center gap-3">
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
              New Brand
            </span>
          </div>

          <div
            className="bg-white border border-linen p-8"
            style={{ borderRadius: 0 }}
          >
            <h3
              className="text-navy font-bold text-sm uppercase tracking-wider mb-6"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              Brand Details
            </h3>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {/* Name */}
              <div className="flex flex-col">
                <label
                  className={labelClass}
                  style={{ fontFamily: "var(--font-montserrat)" }}
                >
                  Brand Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className={inputClass}
                  style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                />
              </div>

              {/* Tagline */}
              <div className="flex flex-col">
                <label
                  className={labelClass}
                  style={{ fontFamily: "var(--font-montserrat)" }}
                >
                  Tagline
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className={inputClass}
                  style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                />
              </div>

              {/* Status */}
              <div className="flex flex-col">
                <label
                  className={labelClass}
                  style={{ fontFamily: "var(--font-montserrat)" }}
                >
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as BrandStatus)}
                  className={inputClass}
                  style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                >
                  <option value="in_development">In Development</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* Live URL */}
              <div className="flex flex-col">
                <label
                  className={labelClass}
                  style={{ fontFamily: "var(--font-montserrat)" }}
                >
                  Live URL
                </label>
                <input
                  type="url"
                  value={liveUrl}
                  onChange={(e) => setLiveUrl(e.target.value)}
                  className={inputClass}
                  style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  placeholder="https://"
                />
              </div>

              {/* Public one-liner */}
              <div className="flex flex-col">
                <label
                  className={labelClass}
                  style={{ fontFamily: "var(--font-montserrat)" }}
                >
                  Public One-Liner
                </label>
                <input
                  type="text"
                  value={publicOneLiner}
                  onChange={(e) => setPublicOneLiner(e.target.value)}
                  className={inputClass}
                  style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                />
              </div>

              {/* Sort order */}
              <div className="flex flex-col">
                <label
                  className={labelClass}
                  style={{ fontFamily: "var(--font-montserrat)" }}
                >
                  Public Sort Order
                </label>
                <input
                  type="number"
                  value={publicSortOrder}
                  onChange={(e) => setPublicSortOrder(Number(e.target.value))}
                  className={inputClass}
                  style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                />
              </div>

              {/* Show on public site */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="show_on_public"
                  checked={showOnPublicSite}
                  onChange={(e) => setShowOnPublicSite(e.target.checked)}
                  className="w-4 h-4 accent-navy"
                  style={{ borderRadius: 0 }}
                />
                <label
                  htmlFor="show_on_public"
                  className="text-sm text-ink"
                  style={{ fontFamily: "var(--font-montserrat)" }}
                >
                  Show on public site
                </label>
              </div>

              {/* Error */}
              {error && (
                <p
                  className="text-red-500 text-sm"
                  style={{ fontFamily: "var(--font-montserrat)" }}
                >
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 text-white text-sm font-semibold transition-opacity disabled:opacity-60"
                style={{
                  backgroundColor: "#1F2A38",
                  fontFamily: "var(--font-inter)",
                  borderRadius: 0,
                }}
              >
                {saving ? "Creating…" : "Create Brand"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}

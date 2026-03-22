"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminTopBar from "@/components/admin/AdminTopBar";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

type InboxStatus = "pending" | "approved" | "rejected";

interface ExpenseInboxRow {
  id: string;
  status: InboxStatus;
  raw_image_path: string | null;
  ai_vendor_name: string | null;
  ai_date: string | null;
  ai_total_amount: number | null;
  ai_vat_amount: number | null;
  ai_currency: string | null;
  ai_suggested_category: string | null;
  ai_confidence: number | null;
  ai_notes: string | null;
  vendor_name: string | null;
  expense_date: string | null;
  total_amount: number | null;
  vat_amount: number | null;
  currency: string | null;
  category: string | null;
  notes: string | null;
  expense_id: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const labelClass = "text-xs text-steel uppercase tracking-widest font-medium";
const inputClass =
  "border border-linen bg-white text-ink text-sm px-3 py-2 focus:outline-none focus:border-steel w-full";

function formatZAR(amount: number): string {
  return `R ${amount.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function ConfidenceBadge({ confidence }: { confidence: number | null }) {
  if (confidence === null) {
    return (
      <span className="flex items-center gap-1 text-xs" style={{ color: "#5C6E81", fontFamily: "var(--font-montserrat)" }}>
        <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#5C6E81" }} />
        Manual entry
      </span>
    );
  }
  if (confidence >= 0.85) {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600" style={{ fontFamily: "var(--font-montserrat)" }}>
        <span className="w-2 h-2 rounded-full inline-block bg-green-500" />
        High confidence
      </span>
    );
  }
  if (confidence >= 0.60) {
    return (
      <span className="flex items-center gap-1 text-xs text-amber-600" style={{ fontFamily: "var(--font-montserrat)" }}>
        <span className="w-2 h-2 rounded-full inline-block bg-amber-500" />
        Review
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-red-500" style={{ fontFamily: "var(--font-montserrat)" }}>
      <span className="w-2 h-2 rounded-full inline-block bg-red-500" />
      Low confidence
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ExpenseInboxPage() {
  const supabase = createClient();

  const [user, setUser] = useState<{ email: string } | null>(null);
  const [items, setItems] = useState<ExpenseInboxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<InboxStatus>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Categories
  const [categories, setCategories] = useState<{ id: string; name: string; parent_category: string | null }[]>([]);

  // Review form state
  const [formVendor, setFormVendor] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTotal, setFormTotal] = useState("");
  const [formVat, setFormVat] = useState("");
  const [formCurrency, setFormCurrency] = useState("ZAR");
  const [formCategory, setFormCategory] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // ── Load data ──────────────────────────────────────────────────────────────

  const loadItems = useCallback(async () => {
    setLoading(true);
    const [{ data: inboxData }, { data: { user: u } }, { data: catData }] = await Promise.all([
      supabase.from("expense_inbox").select("*").order("created_at", { ascending: false }),
      supabase.auth.getUser(),
      supabase.from("expense_categories").select("id, name, parent_category").eq("is_archived", false).order("sort_order", { ascending: true }),
    ]);
    setItems((inboxData as ExpenseInboxRow[]) ?? []);
    setUser(u ? { email: u.email ?? "" } : null);
    setCategories((catData ?? []) as { id: string; name: string; parent_category: string | null }[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // ── Populate form when selection changes ───────────────────────────────────

  const selected = items.find((i) => i.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) return;
    setFormVendor(selected.vendor_name ?? selected.ai_vendor_name ?? "");
    setFormDate(selected.expense_date ?? selected.ai_date ?? "");
    setFormTotal(String(selected.total_amount ?? selected.ai_total_amount ?? ""));
    setFormVat(String(selected.vat_amount ?? selected.ai_vat_amount ?? ""));
    setFormCurrency(selected.currency ?? selected.ai_currency ?? "ZAR");
    setFormCategory(selected.category ?? selected.ai_suggested_category ?? "");
    setFormNotes(selected.notes ?? "");
    setActionError(null);
  }, [selected]);

  // ── Upload slip ────────────────────────────────────────────────────────────

  async function handleUpload(file: File) {
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "bin";
    const uuid = crypto.randomUUID();
    const path = `inbox/raw/${uuid}.${ext}`;

    const { error: storageError } = await supabase.storage
      .from("expenses")
      .upload(path, file, { contentType: file.type });

    if (storageError) {
      alert("Upload failed: " + storageError.message);
      setUploading(false);
      return;
    }

    const { error: insertError } = await supabase.from("expense_inbox").insert({
      status: "pending",
      raw_image_path: path,
    });

    if (insertError) {
      alert("Failed to create inbox entry: " + insertError.message);
    }

    setUploading(false);
    loadItems();
  }

  // ── Approve & Save ─────────────────────────────────────────────────────────

  async function handleApprove() {
    if (!selected) return;
    if (!formVendor.trim()) { setActionError("Vendor name is required."); return; }
    if (!formDate) { setActionError("Date is required."); return; }
    if (!formTotal) { setActionError("Total amount is required."); return; }

    setSaving(true);
    setActionError(null);

    // Insert into expenses table
    const { data: newExpense, error: expError } = await supabase
      .from("expenses")
      .insert({
        date: formDate,
        description: formVendor.trim(),
        category: formCategory || null,
        amount_incl_vat: parseFloat(formTotal) || null,
        vat_amount: parseFloat(formVat) || null,
        amount_excl_vat: parseFloat(formTotal) - parseFloat(formVat) || null,
        notes: formNotes.trim() || null,
        slip_path: selected.raw_image_path,
      })
      .select("id")
      .single();

    if (expError) {
      setActionError("Failed to save expense: " + expError.message);
      setSaving(false);
      return;
    }

    // Update inbox record
    const { error: updateError } = await supabase
      .from("expense_inbox")
      .update({
        status: "approved",
        expense_id: newExpense.id,
        reviewed_at: new Date().toISOString(),
        vendor_name: formVendor.trim(),
        expense_date: formDate,
        total_amount: parseFloat(formTotal) || null,
        vat_amount: parseFloat(formVat) || null,
        currency: formCurrency,
        category: formCategory || null,
        notes: formNotes.trim() || null,
      })
      .eq("id", selected.id);

    if (updateError) {
      setActionError("Expense saved but inbox update failed: " + updateError.message);
    }

    setSaving(false);
    loadItems();
  }

  // ── Reject ─────────────────────────────────────────────────────────────────

  async function handleReject() {
    if (!selected) return;
    setSaving(true);
    setActionError(null);

    const { error } = await supabase
      .from("expense_inbox")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", selected.id);

    if (error) {
      setActionError("Reject failed: " + error.message);
    }

    setSaving(false);
    loadItems();
  }

  // ── Image URL ──────────────────────────────────────────────────────────────

  function getImageUrl(path: string): string {
    return supabase.storage.from("expenses").getPublicUrl(path).data.publicUrl;
  }

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filtered = items.filter((i) => i.status === filterStatus);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <AdminTopBar title="Slip Inbox" user={user} />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = "";
        }}
      />

      {/* Split-pane layout: full height minus 56px topbar */}
      <div className="flex" style={{ height: "calc(100vh - 56px)", marginTop: 56 }}>
        {/* ── LEFT PANE ── */}
        <div
          className="border-r border-linen overflow-y-auto flex flex-col"
          style={{ width: 320, minWidth: 320, background: "#FAFAF9" }}
        >
          {/* Pane header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-linen">
            <span
              className="text-xs text-steel uppercase tracking-widest font-medium"
              style={{ fontFamily: "var(--font-montserrat)" }}
            >
              Inbox
            </span>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-xs px-3 py-1.5 text-white disabled:opacity-50"
              style={{ background: "#1F2A38", fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
            >
              {uploading ? "Uploading…" : "+ Upload Slip"}
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex border-b border-linen">
            {(["pending", "approved", "rejected"] as InboxStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className="flex-1 py-2 text-xs capitalize transition-colors"
                style={{
                  fontFamily: "var(--font-montserrat)",
                  borderBottom: filterStatus === s ? "2px solid #1F2A38" : "2px solid transparent",
                  color: filterStatus === s ? "#1F2A38" : "#5C6E81",
                  borderRadius: 0,
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="text-center text-steel text-sm py-8" style={{ fontFamily: "var(--font-montserrat)" }}>
                Loading…
              </p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-steel text-sm py-8" style={{ fontFamily: "var(--font-montserrat)" }}>
                No slips in inbox
              </p>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className="w-full text-left border-b border-linen p-4 transition-colors"
                  style={{
                    background: selectedId === item.id ? "rgba(234,228,220,0.4)" : "transparent",
                    borderRadius: 0,
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    {item.vendor_name || item.ai_vendor_name ? (
                      <span
                        className="font-bold text-sm truncate"
                        style={{ color: "#1F2A38", fontFamily: "var(--font-inter)" }}
                      >
                        {item.vendor_name ?? item.ai_vendor_name}
                      </span>
                    ) : (
                      <span
                        className="text-sm italic truncate"
                        style={{ color: "#5C6E81", fontFamily: "var(--font-inter)" }}
                      >
                        Unknown Vendor
                      </span>
                    )}
                  </div>

                  <div
                    className="text-xs text-steel mb-2 flex gap-2"
                    style={{ fontFamily: "var(--font-montserrat)" }}
                  >
                    {(item.total_amount ?? item.ai_total_amount) != null && (
                      <span>{formatZAR(item.total_amount ?? item.ai_total_amount ?? 0)}</span>
                    )}
                    {(item.expense_date ?? item.ai_date) && (
                      <span>{item.expense_date ?? item.ai_date}</span>
                    )}
                  </div>

                  <ConfidenceBadge confidence={item.ai_confidence} />
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── RIGHT PANE ── */}
        <div className="flex-1 overflow-y-auto" style={{ background: "#FAFAF9" }}>
          {!selected ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
                Select a slip to review
              </p>
            </div>
          ) : (
            <div className="p-8 max-w-2xl">
              {/* Image preview */}
              <div className="mb-6 border border-linen bg-white" style={{ borderRadius: 0 }}>
                {selected.raw_image_path ? (
                  <img
                    src={getImageUrl(selected.raw_image_path)}
                    alt="Slip"
                    style={{ maxHeight: 300, width: "100%", objectFit: "contain" }}
                  />
                ) : (
                  <div
                    className="flex items-center justify-center"
                    style={{ height: 160, color: "#5C6E81", fontFamily: "var(--font-montserrat)", fontSize: 13 }}
                  >
                    No image available
                  </div>
                )}
              </div>

              {/* Status banners for approved / rejected */}
              {selected.status === "approved" && (
                <div className="mb-6 flex items-center gap-3 border border-green-200 bg-green-50 px-4 py-3">
                  <span className="text-green-600 font-semibold text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
                    Approved
                  </span>
                  {selected.expense_id && (
                    <Link
                      href={`/admin/expenses`}
                      className="text-xs text-steel underline"
                      style={{ fontFamily: "var(--font-montserrat)" }}
                    >
                      View expense
                    </Link>
                  )}
                </div>
              )}

              {selected.status === "rejected" && (
                <div className="mb-6 border border-red-200 bg-red-50 px-4 py-3">
                  <span className="text-red-600 font-semibold text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
                    Rejected
                  </span>
                </div>
              )}

              {/* AI confidence */}
              {selected.ai_confidence !== null && (
                <div className="mb-6 flex items-center gap-2">
                  <span
                    className="text-xs text-steel uppercase tracking-widest"
                    style={{ fontFamily: "var(--font-montserrat)" }}
                  >
                    AI Confidence:
                  </span>
                  <span
                    className="text-sm font-semibold"
                    style={{
                      fontFamily: "var(--font-montserrat)",
                      color:
                        selected.ai_confidence >= 0.85
                          ? "#16a34a"
                          : selected.ai_confidence >= 0.60
                          ? "#d97706"
                          : "#dc2626",
                    }}
                  >
                    {Math.round(selected.ai_confidence * 100)}%
                  </span>
                </div>
              )}

              {/* Editable form (only for pending) */}
              {selected.status === "pending" && (
                <div className="bg-white border border-linen p-6 space-y-4" style={{ borderRadius: 0 }}>
                  <h3
                    className="text-navy font-bold text-xs uppercase tracking-wider mb-2"
                    style={{ fontFamily: "var(--font-inter)" }}
                  >
                    Review Details
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Vendor */}
                    <label className="flex flex-col gap-1 sm:col-span-2">
                      <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Vendor</span>
                      <input
                        type="text"
                        value={formVendor}
                        onChange={(e) => setFormVendor(e.target.value)}
                        className={inputClass}
                        style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                        placeholder="Vendor name"
                      />
                    </label>

                    {/* Date */}
                    <label className="flex flex-col gap-1">
                      <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Date</span>
                      <input
                        type="date"
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        className={inputClass}
                        style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                      />
                    </label>

                    {/* Currency */}
                    <label className="flex flex-col gap-1">
                      <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Currency</span>
                      <select
                        value={formCurrency}
                        onChange={(e) => setFormCurrency(e.target.value)}
                        className={inputClass}
                        style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                      >
                        <option value="ZAR">ZAR</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                      </select>
                    </label>

                    {/* Total Amount */}
                    <label className="flex flex-col gap-1">
                      <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Total Amount</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formTotal}
                        onChange={(e) => setFormTotal(e.target.value)}
                        className={inputClass}
                        style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                        placeholder="0.00"
                      />
                    </label>

                    {/* VAT Amount */}
                    <label className="flex flex-col gap-1">
                      <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>VAT Amount</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formVat}
                        onChange={(e) => setFormVat(e.target.value)}
                        className={inputClass}
                        style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                        placeholder="0.00"
                      />
                    </label>

                    {/* Category */}
                    <label className="flex flex-col gap-1">
                      <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Category</span>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className={inputClass}
                        style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                      >
                        <option value="">— Select —</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </label>

                    {/* Notes */}
                    <label className="flex flex-col gap-1 sm:col-span-2">
                      <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Notes</span>
                      <textarea
                        rows={3}
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        className={inputClass}
                        style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                        placeholder="Optional notes…"
                      />
                    </label>
                  </div>

                  {actionError && (
                    <p className="text-red-500 text-xs" style={{ fontFamily: "var(--font-montserrat)" }}>
                      {actionError}
                    </p>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleApprove}
                      disabled={saving}
                      className="px-5 py-2 text-sm text-white disabled:opacity-50 transition-colors"
                      style={{ background: "#1F2A38", fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                    >
                      {saving ? "Saving…" : "Approve & Save"}
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={saving}
                      className="px-5 py-2 text-sm border border-steel text-steel disabled:opacity-50 transition-colors hover:bg-linen"
                      style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {/* AI notes if present */}
              {selected.ai_notes && (
                <div className="mt-4 border border-linen bg-white px-4 py-3">
                  <p className="text-xs text-steel uppercase tracking-widest mb-1" style={{ fontFamily: "var(--font-montserrat)" }}>
                    AI Notes
                  </p>
                  <p className="text-sm text-ink" style={{ fontFamily: "var(--font-montserrat)" }}>
                    {selected.ai_notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

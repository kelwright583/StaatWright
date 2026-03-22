"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Bill, ServiceProvider } from "@/lib/types";
import { formatZAR } from "@/lib/utils";
import Link from "next/link";

interface VentureOption {
  id: string;
  company_name: string;
}

interface Props {
  ventures: VentureOption[];
  providers: ServiceProvider[];
  initialBill?: Partial<Bill>;
  defaultVentureId?: string;
  defaultProviderId?: string;
}

const labelClass = "text-xs text-[#5C6E81] uppercase tracking-widest font-medium";
const inputClass = "border border-[#EAE4DC] bg-white text-[#1F2A38] text-sm px-3 py-2 focus:outline-none focus:border-[#5C6E81] w-full";
const CURRENCIES = ["ZAR", "USD", "EUR", "GBP", "AUD", "CAD"];

export default function BillBuilder({ ventures, providers, initialBill, defaultVentureId, defaultProviderId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = Boolean(initialBill?.id);

  // Form state
  const [ventureId, setVentureId] = useState(initialBill?.venture_id ?? defaultVentureId ?? "");
  const [providerId, setProviderId] = useState(initialBill?.service_provider_id ?? defaultProviderId ?? "");
  const [status, setStatus] = useState<Bill["status"]>(initialBill?.status ?? "draft");
  const [issueDate, setIssueDate] = useState(initialBill?.issue_date ?? "");
  const [dueDate, setDueDate] = useState(initialBill?.due_date ?? "");
  const [reference, setReference] = useState(initialBill?.reference ?? "");
  const [description, setDescription] = useState(initialBill?.description ?? "");
  const [currency, setCurrency] = useState(initialBill?.currency ?? "ZAR");
  const [amountExclVat, setAmountExclVat] = useState(initialBill?.amount_excl_vat?.toFixed(2) ?? "");
  const [vatAmount, setVatAmount] = useState(initialBill?.vat_amount?.toFixed(2) ?? "");
  const [totalAmount, setTotalAmount] = useState(initialBill?.total_amount?.toFixed(2) ?? "");
  const [exchangeRate, setExchangeRate] = useState(initialBill?.exchange_rate?.toFixed(4) ?? "");
  const [category, setCategory] = useState(initialBill?.category ?? "");
  const [notes, setNotes] = useState(initialBill?.notes ?? "");
  const [invoicePath, setInvoicePath] = useState(initialBill?.invoice_path ?? "");

  // Load expense categories
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    supabase
      .from("expense_categories")
      .select("id, name")
      .eq("is_archived", false)
      .order("sort_order", { ascending: true })
      .then((result) => setCategories((result.data ?? []) as { id: string; name: string }[]));
  }, [supabase]);

  // OCR + upload state
  const [dragging, setDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [ocring, setOcring] = useState(false);
  const [ocrNote, setOcrNote] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Amount helpers ─────────────────────────────────────────────────────────

  function recalcFromExcl(exclStr: string) {
    const excl = parseFloat(exclStr);
    if (isNaN(excl)) return;
    const vat = excl * 0.15;
    const total = excl + vat;
    setVatAmount(vat.toFixed(2));
    setTotalAmount(total.toFixed(2));
  }

  function recalcFromTotal(totalStr: string) {
    const total = parseFloat(totalStr);
    if (isNaN(total)) return;
    const excl = total / 1.15;
    const vat = total - excl;
    setAmountExclVat(excl.toFixed(2));
    setVatAmount(vat.toFixed(2));
  }

  // ── File upload + OCR ──────────────────────────────────────────────────────

  const processFile = useCallback(async (file: File) => {
    setUploadedFile(file);
    setOcrNote(null);
    setUploading(true);

    const billId = initialBill?.id ?? `tmp-${Date.now()}`;
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${billId}/${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage.from("bill-invoices").upload(path, file, { upsert: true });
    setUploading(false);

    if (upErr) {
      setOcrNote("Upload failed: " + upErr.message);
      return;
    }

    setInvoicePath(path);
    const publicUrl = supabase.storage.from("bill-invoices").getPublicUrl(path).data.publicUrl;
    setUploadedFileUrl(publicUrl);

    // Only attempt OCR for image types
    const isImage = file.type.startsWith("image/");
    if (!isImage) {
      setOcrNote("PDF uploaded successfully. OCR works best with image files — please fill in the fields manually or re-upload as JPG/PNG.");
      return;
    }

    setOcring(true);
    setOcrNote("Scanning with AI…");

    try {
      const resp = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_url: publicUrl }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        setOcrNote("OCR failed: " + (err.error ?? resp.statusText));
        setOcring(false);
        return;
      }

      const data = await resp.json();

      if (data._note) {
        setOcrNote(data._note);
        setOcring(false);
        return;
      }

      // Pre-fill form fields from OCR
      let filled = 0;

      if (data.issue_date && !issueDate) { setIssueDate(data.issue_date); filled++; }
      if (data.due_date && !dueDate) { setDueDate(data.due_date); filled++; }
      if (data.invoice_number && !reference) { setReference(data.invoice_number); filled++; }
      if (data.description && !description) { setDescription(data.description); filled++; }
      if (data.currency) setCurrency(data.currency);

      if (data.amount_excl_vat && !amountExclVat) {
        const exclStr = data.amount_excl_vat.toFixed(2);
        setAmountExclVat(exclStr);
        recalcFromExcl(exclStr);
        filled++;
      } else if (data.total_amount && !totalAmount) {
        const totalStr = data.total_amount.toFixed(2);
        setTotalAmount(totalStr);
        recalcFromTotal(totalStr);
        if (data.vat_amount) setVatAmount(data.vat_amount.toFixed(2));
        filled++;
      }

      // Try to match provider by name
      if (data.vendor_name && !providerId) {
        const lower = (data.vendor_name as string).toLowerCase();
        const match = providers.find(p => p.name.toLowerCase().includes(lower) || lower.includes(p.name.toLowerCase()));
        if (match) { setProviderId(match.id); filled++; }
      }

      const conf = data.confidence ? Math.round((data.confidence as number) * 100) : null;
      setOcrNote(`AI scan complete — ${filled} field${filled !== 1 ? "s" : ""} filled${conf !== null ? ` (${conf}% confidence)` : ""}. Please verify all values.`);
    } catch (err) {
      setOcrNote("OCR error: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setOcring(false);
    }
  }, [initialBill?.id, providerId, providers, issueDate, dueDate, reference, description, amountExclVat, totalAmount]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      venture_id: ventureId || null,
      service_provider_id: providerId || null,
      status,
      issue_date: issueDate || null,
      due_date: dueDate || null,
      reference: reference.trim() || null,
      description: description.trim() || null,
      currency: currency || "ZAR",
      amount_excl_vat: amountExclVat ? parseFloat(amountExclVat) : null,
      vat_amount: vatAmount ? parseFloat(vatAmount) : null,
      total_amount: totalAmount ? parseFloat(totalAmount) : null,
      exchange_rate: exchangeRate ? parseFloat(exchangeRate) : null,
      zar_equivalent: exchangeRate && totalAmount ? parseFloat(totalAmount) * parseFloat(exchangeRate) : null,
      invoice_path: invoicePath || null,
      category: category || null,
      notes: notes.trim() || null,
    };

    if (isEditing && initialBill?.id) {
      const { error } = await supabase.from("bills").update(payload).eq("id", initialBill.id);
      setSaving(false);
      if (error) { alert("Error: " + error.message); return; }
      router.refresh();
    } else {
      const { data: inserted, error } = await supabase.from("bills").insert(payload).select("id").single();
      setSaving(false);
      if (error) { alert("Error: " + error.message); return; }
      router.push(`/admin/bills/${inserted.id}`);
    }
  }

  async function handleDelete() {
    if (!initialBill?.id) return;
    if (!window.confirm("Delete this bill? This cannot be undone.")) return;
    setDeleting(true);
    await supabase.from("bills").delete().eq("id", initialBill.id);
    router.push("/admin/bills");
  }

  const zarEquivalent = currency !== "ZAR" && totalAmount && exchangeRate
    ? parseFloat(totalAmount) * parseFloat(exchangeRate)
    : null;

  const invoicePublicUrl = invoicePath
    ? supabase.storage.from("bill-invoices").getPublicUrl(invoicePath).data.publicUrl
    : null;

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* ── Invoice Drop Zone ─────────────────────────────────────────────── */}
      <div className="bg-white border border-[#EAE4DC] p-6">
        <p className="text-xs text-[#5C6E81] uppercase tracking-widest font-semibold mb-4" style={{ fontFamily: "var(--font-montserrat)" }}>
          Invoice Document
        </p>

        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="relative cursor-pointer transition-all"
          style={{
            border: dragging ? "2px dashed #1F2A38" : "2px dashed #EAE4DC",
            backgroundColor: dragging ? "rgba(31,42,56,0.04)" : "rgba(243,242,238,0.5)",
            padding: "2rem",
            borderRadius: 0,
            textAlign: "center",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          {uploading ? (
            <p className="text-[#5C6E81] text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>Uploading…</p>
          ) : ocring ? (
            <p className="text-[#1F2A38] text-sm font-medium" style={{ fontFamily: "var(--font-montserrat)" }}>
              🔍 Scanning invoice with AI…
            </p>
          ) : uploadedFile ? (
            <div>
              <p className="text-[#1F2A38] text-sm font-semibold" style={{ fontFamily: "var(--font-montserrat)" }}>
                📎 {uploadedFile.name}
              </p>
              <p className="text-[#5C6E81] text-xs mt-1" style={{ fontFamily: "var(--font-montserrat)" }}>
                Click or drag to replace
              </p>
            </div>
          ) : invoicePath ? (
            <div>
              <p className="text-[#1F2A38] text-sm font-semibold" style={{ fontFamily: "var(--font-montserrat)" }}>
                📎 Invoice attached
              </p>
              <p className="text-[#5C6E81] text-xs mt-1" style={{ fontFamily: "var(--font-montserrat)" }}>
                Click or drag to replace
              </p>
            </div>
          ) : (
            <div>
              <p className="text-[#1F2A38] text-sm font-medium mb-1" style={{ fontFamily: "var(--font-montserrat)" }}>
                Drop invoice here to auto-fill with AI
              </p>
              <p className="text-[#5C6E81] text-xs" style={{ fontFamily: "var(--font-montserrat)" }}>
                JPG, PNG, or PDF • OCR works best with image files
              </p>
            </div>
          )}
        </div>

        {/* OCR note */}
        {ocrNote && (
          <p className="text-xs mt-2 px-1" style={{ fontFamily: "var(--font-montserrat)", color: ocrNote.toLowerCase().includes("failed") || ocrNote.toLowerCase().includes("error") ? "#dc2626" : "#5C6E81" }}>
            {ocrNote}
          </p>
        )}

        {/* View existing invoice */}
        {invoicePublicUrl && (
          <div className="mt-3 flex gap-3">
            <a
              href={uploadedFileUrl ?? invoicePublicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#5C6E81] hover:text-[#1F2A38] underline transition-colors"
              style={{ fontFamily: "var(--font-montserrat)" }}
            >
              View Invoice →
            </a>
          </div>
        )}
      </div>

      {/* ── Core Details ──────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#EAE4DC] p-6 space-y-4">
        <p className="text-xs text-[#5C6E81] uppercase tracking-widest font-semibold mb-1" style={{ fontFamily: "var(--font-montserrat)" }}>Bill Details</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Venture */}
          <label className="flex flex-col gap-1">
            <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Venture / Entity</span>
            <select value={ventureId} onChange={e => setVentureId(e.target.value)} className={inputClass} style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}>
              <option value="">— StaatWright (No specific venture) —</option>
              {ventures.map(v => <option key={v.id} value={v.id}>{v.company_name}</option>)}
            </select>
          </label>

          {/* Service Provider */}
          <label className="flex flex-col gap-1">
            <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Service Provider</span>
            <select value={providerId} onChange={e => setProviderId(e.target.value)} className={inputClass} style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}>
              <option value="">— Select provider —</option>
              {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {!providerId && (
              <Link href="/admin/service-providers/new" target="_blank" className="text-xs text-[#5C6E81] hover:text-[#1F2A38] underline mt-0.5 transition-colors" style={{ fontFamily: "var(--font-montserrat)" }}>
                + Add new provider
              </Link>
            )}
          </label>

          {/* Status */}
          <label className="flex flex-col gap-1">
            <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Status</span>
            <select value={status} onChange={e => setStatus(e.target.value as Bill["status"])} className={inputClass} style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}>
              <option value="draft">Draft</option>
              <option value="received">Received</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </label>

          {/* Reference / Invoice No. */}
          <label className="flex flex-col gap-1">
            <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Supplier Invoice No.</span>
            <input value={reference} onChange={e => setReference(e.target.value)} className={inputClass} placeholder="e.g. INV-0042" style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }} />
          </label>

          {/* Issue Date */}
          <label className="flex flex-col gap-1">
            <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Issue Date</span>
            <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className={inputClass} style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }} />
          </label>

          {/* Due Date */}
          <label className="flex flex-col gap-1">
            <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Due Date</span>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputClass} style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }} />
          </label>

          {/* Description */}
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Description</span>
            <input value={description} onChange={e => setDescription(e.target.value)} className={inputClass} placeholder="What is this bill for?" style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }} />
          </label>

          {/* Category */}
          <label className="flex flex-col gap-1">
            <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Category</span>
            <select value={category} onChange={e => setCategory(e.target.value)} className={inputClass} style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}>
              <option value="">— Select category —</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* ── Amounts ───────────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#EAE4DC] p-6 space-y-4">
        <p className="text-xs text-[#5C6E81] uppercase tracking-widest font-semibold mb-1" style={{ fontFamily: "var(--font-montserrat)" }}>Amounts</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="flex flex-col gap-1">
            <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Currency</span>
            <select value={currency} onChange={e => setCurrency(e.target.value)} className={inputClass} style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Amount Excl. VAT</span>
            <input
              type="number" min="0" step="0.01"
              value={amountExclVat}
              onChange={e => { setAmountExclVat(e.target.value); recalcFromExcl(e.target.value); }}
              className={inputClass} placeholder="0.00"
              style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>VAT (15%)</span>
            <input
              type="number" min="0" step="0.01"
              value={vatAmount}
              onChange={e => setVatAmount(e.target.value)}
              className={inputClass} placeholder="0.00"
              style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Total (Incl. VAT)</span>
            <input
              type="number" min="0" step="0.01"
              value={totalAmount}
              onChange={e => { setTotalAmount(e.target.value); recalcFromTotal(e.target.value); }}
              className={inputClass} placeholder="0.00"
              style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
            />
          </label>
        </div>

        {/* Foreign currency */}
        {currency !== "ZAR" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#EAE4DC]">
            <label className="flex flex-col gap-1">
              <span className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Exchange Rate (1 {currency} = ? ZAR)</span>
              <input
                type="number" min="0" step="0.0001"
                value={exchangeRate}
                onChange={e => setExchangeRate(e.target.value)}
                className={inputClass} placeholder="e.g. 18.5000"
                style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
              />
            </label>
            {zarEquivalent != null && (
              <div className="flex flex-col gap-1 pt-5">
                <span className="text-xs text-[#5C6E81]" style={{ fontFamily: "var(--font-montserrat)" }}>
                  ZAR Equivalent: <strong className="text-[#1F2A38]">{formatZAR(zarEquivalent)}</strong>
                </span>
              </div>
            )}
          </div>
        )}

        {/* VAT preview */}
        {totalAmount && parseFloat(totalAmount) > 0 && (
          <div className="text-xs text-[#5C6E81] border border-[#EAE4DC] bg-[#F3F2EE] px-4 py-2 flex gap-6 flex-wrap" style={{ fontFamily: "var(--font-montserrat)" }}>
            {amountExclVat && <span>Excl. VAT: {currency} {parseFloat(amountExclVat).toFixed(2)}</span>}
            {vatAmount && <span>VAT: {currency} {parseFloat(vatAmount).toFixed(2)}</span>}
            <span className="font-semibold text-[#1F2A38]">Total: {currency} {parseFloat(totalAmount).toFixed(2)}</span>
            {zarEquivalent != null && <span className="font-semibold text-[#1F2A38]">≈ {formatZAR(zarEquivalent)}</span>}
          </div>
        )}
      </div>

      {/* ── Notes ────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#EAE4DC] p-6">
        <p className="text-xs text-[#5C6E81] uppercase tracking-widest font-semibold mb-3" style={{ fontFamily: "var(--font-montserrat)" }}>Notes</p>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          className={inputClass}
          placeholder="Internal notes…"
          style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
        />
      </div>

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving || ocring || uploading}
            className="px-6 py-2.5 text-white text-sm font-semibold disabled:opacity-50 transition-opacity"
            style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
          >
            {saving ? "Saving…" : isEditing ? "Save Changes" : "Create Bill"}
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
        {isEditing && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs text-red-500 hover:text-red-700 underline transition-colors"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            {deleting ? "Deleting…" : "Delete Bill"}
          </button>
        )}
      </div>
    </form>
  );
}

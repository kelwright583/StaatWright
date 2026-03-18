"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Brand, OwnerSettings, BrandColour, BrandLogo } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAmount(n: number, currency = "ZAR"): string {
  if (currency === "ZAR") {
    return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${currency} ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VentureOwnership {
  [ownerName: string]: { percentage: number; role: string; joined_date?: string; notes?: string };
}

interface ExternalBillingRow {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  type: "revenue" | "subscription_cost";
}

interface VenturePartner {
  id: string;
  company_name: string;
  notes: string | null;
  show_on_site: boolean | null;
  brand_id: string | null;
  type: string | null;
  status: string | null;
  website: string | null;
  founding_date: string | null;
  venture_ownership: VentureOwnership | null;
  external_billing: ExternalBillingRow[] | null;
}

interface EquityLedgerEntry {
  id: string;
  entry_type: string;
  owner_id: string | null;
  partner_id: string | null;
  date: string;
  description: string;
  amount: number;
  currency: string | null;
  notes: string | null;
  created_at: string;
}

interface DocumentRow {
  id: string;
  number: string;
  type: string;
  status: string;
  issue_date: string | null;
  total: number | null;
  currency: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VENTURE_STATUSES = [
  { value: "active",       label: "Active" },
  { value: "paused",       label: "Paused" },
  { value: "winding_down", label: "Winding Down" },
  { value: "exited",       label: "Exited" },
];

const EQUITY_ENTRY_TYPES = [
  { value: "capital_injection", label: "Capital Injection", color: "#3b82f6" },
  { value: "sweat_equity",      label: "Sweat Equity",      color: "#22c55e" },
  { value: "distribution",      label: "Distribution",      color: "#f59e0b" },
  { value: "loan_in",           label: "Loan In",           color: "#8b5cf6" },
  { value: "loan_out",          label: "Loan Out",          color: "#ef4444" },
  { value: "repayment",         label: "Repayment",         color: "#6366f1" },
];

const OWNER_ROLES = ["founder", "investor", "advisor", "employee"];

const labelClass = "block text-xs text-steel uppercase tracking-wider mb-1";
const inputClass = "border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm";
const selectClass = "border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm";

// ---------------------------------------------------------------------------
// TabButton
// ---------------------------------------------------------------------------

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick}
      className="px-5 py-3 text-sm font-medium border-b-2 transition-colors"
      style={{
        borderBottomColor: active ? "#1F2A38" : "transparent",
        color: active ? "#1F2A38" : "#5C6E81",
        fontFamily: "var(--font-montserrat)",
        borderRadius: 0,
        marginBottom: "-1px",
      }}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// EntryTypeBadge
// ---------------------------------------------------------------------------

function EntryTypeBadge({ type }: { type: string }) {
  const meta = EQUITY_ENTRY_TYPES.find((t) => t.value === type) ?? { label: type, color: "#5C6E81" };
  return (
    <span
      className="px-2 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: `${meta.color}18`,
        color: meta.color,
        borderRadius: 0,
        fontFamily: "var(--font-montserrat)",
      }}
    >
      {meta.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// DocumentStatusBadge
// ---------------------------------------------------------------------------

const statusMap: Record<string, { dot: string; label: string }> = {
  paid:      { dot: "bg-green-500",  label: "Paid" },
  overdue:   { dot: "bg-red-500",    label: "Overdue" },
  sent:      { dot: "bg-amber-500",  label: "Sent" },
  draft:     { dot: "bg-steel",      label: "Draft" },
  accepted:  { dot: "bg-green-400",  label: "Accepted" },
  declined:  { dot: "bg-red-400",    label: "Declined" },
  issued:    { dot: "bg-amber-400",  label: "Issued" },
};

function DocStatusBadge({ status }: { status: string }) {
  const entry = statusMap[status] ?? { dot: "bg-steel", label: status };
  return (
    <span className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-montserrat)" }}>
      <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${entry.dot}`} />
      <span className="text-xs text-steel capitalize">{entry.label}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function VentureDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();

  const [venture, setVenture] = useState<VenturePartner | null>(null);
  const [owners, setOwners] = useState<OwnerSettings[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [equityEntries, setEquityEntries] = useState<EquityLedgerEntry[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [linkedBrand, setLinkedBrand] = useState<Brand | null>(null);
  const [linkedBrandColours, setLinkedBrandColours] = useState<BrandColour[]>([]);
  const [linkedBrandLogos, setLinkedBrandLogos] = useState<BrandLogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Overview form
  const [overviewForm, setOverviewForm] = useState({
    company_name: "", notes: "", status: "", website: "", founding_date: "",
    show_on_site: false, brand_id: "",
  });
  const [savingOverview, setSavingOverview] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [overviewSuccess, setOverviewSuccess] = useState(false);

  // Ownership state
  const [ownershipData, setOwnershipData] = useState<VentureOwnership>({});
  const [savingOwnership, setSavingOwnership] = useState(false);
  const [ownershipError, setOwnershipError] = useState<string | null>(null);
  const [showAddOwner, setShowAddOwner] = useState(false);
  const [newOwnerForm, setNewOwnerForm] = useState({ owner_id: "", percentage: "", role: "founder", joined_date: "", notes: "" });

  // Equity form
  const [showEquityForm, setShowEquityForm] = useState(false);
  const [equityForm, setEquityForm] = useState({
    entry_type: "capital_injection", owner_id: "", date: new Date().toISOString().slice(0, 10),
    description: "", amount: "", currency: "ZAR", notes: "",
  });
  const [savingEquity, setSavingEquity] = useState(false);
  const [equityError, setEquityError] = useState<string | null>(null);

  // External billing
  const [externalBilling, setExternalBilling] = useState<ExternalBillingRow[]>([]);
  const [showBillingForm, setShowBillingForm] = useState(false);
  const [billingForm, setBillingForm] = useState({ description: "", amount: "", currency: "ZAR", date: new Date().toISOString().slice(0, 10), type: "revenue" as "revenue" | "subscription_cost" });
  const [savingBilling, setSavingBilling] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [
      { data: ventureData },
      { data: ownersData },
      { data: brandsData },
      { data: equityData },
      { data: docsData },
    ] = await Promise.all([
      supabase.from("partners").select("*").eq("id", id).single(),
      supabase.from("owner_settings").select("*").order("display_name"),
      supabase.from("brands").select("*").order("name"),
      supabase.from("equity_ledger").select("*").eq("partner_id", id).order("date", { ascending: false }),
      supabase.from("documents").select("id, number, type, status, issue_date, total, currency").eq("partner_id", id).order("created_at", { ascending: false }),
    ]);

    if (ventureData) {
      const v = ventureData as VenturePartner;
      setVenture(v);
      setOverviewForm({
        company_name: v.company_name,
        notes: v.notes ?? "",
        status: v.status ?? "active",
        website: v.website ?? "",
        founding_date: v.founding_date ?? "",
        show_on_site: v.show_on_site ?? false,
        brand_id: v.brand_id ?? "",
      });
      setOwnershipData(v.venture_ownership ?? {});
      setExternalBilling(v.external_billing ?? []);
    }

    setOwners((ownersData ?? []) as OwnerSettings[]);
    setBrands((brandsData ?? []) as Brand[]);
    setEquityEntries((equityData ?? []) as EquityLedgerEntry[]);
    setDocuments((docsData ?? []) as DocumentRow[]);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load linked brand details when brand_id changes
  useEffect(() => {
    if (!overviewForm.brand_id) { setLinkedBrand(null); setLinkedBrandColours([]); setLinkedBrandLogos([]); return; }
    const b = brands.find((x) => x.id === overviewForm.brand_id) ?? null;
    setLinkedBrand(b);
    if (b) {
      Promise.all([
        supabase.from("brand_colours").select("*").eq("brand_id", b.id),
        supabase.from("brand_logos").select("*").eq("brand_id", b.id),
      ]).then(([{ data: cols }, { data: logs }]) => {
        setLinkedBrandColours((cols ?? []) as BrandColour[]);
        setLinkedBrandLogos((logs ?? []) as BrandLogo[]);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overviewForm.brand_id, brands]);

  // ---------------------------------------------------------------------------
  // Overview save
  // ---------------------------------------------------------------------------

  async function handleSaveOverview(e: React.FormEvent) {
    e.preventDefault();
    if (!overviewForm.company_name.trim()) { setOverviewError("Venture name is required."); return; }
    setSavingOverview(true); setOverviewError(null); setOverviewSuccess(false);

    const { error } = await supabase.from("partners").update({
      company_name: overviewForm.company_name.trim(),
      notes: overviewForm.notes.trim() || null,
      status: overviewForm.status || null,
      website: overviewForm.website.trim() || null,
      founding_date: overviewForm.founding_date || null,
      show_on_site: overviewForm.show_on_site,
      brand_id: overviewForm.brand_id || null,
    }).eq("id", id);

    setSavingOverview(false);
    if (error) { setOverviewError(error.message); return; }
    setOverviewSuccess(true);
    await loadData();
    setTimeout(() => setOverviewSuccess(false), 3000);
  }

  // ---------------------------------------------------------------------------
  // Ownership save
  // ---------------------------------------------------------------------------

  async function handleSaveOwnership() {
    setSavingOwnership(true); setOwnershipError(null);
    const { error } = await supabase.from("partners").update({ venture_ownership: ownershipData }).eq("id", id);
    setSavingOwnership(false);
    if (error) { setOwnershipError(error.message); }
  }

  function handleAddOwnerEntry(e: React.FormEvent) {
    e.preventDefault();
    const owner = owners.find((o) => o.id === newOwnerForm.owner_id);
    if (!owner) return;
    const name = owner.display_name ?? owner.initials ?? owner.id;
    setOwnershipData((prev) => ({
      ...prev,
      [name]: {
        percentage: parseFloat(newOwnerForm.percentage) || 0,
        role: newOwnerForm.role,
        joined_date: newOwnerForm.joined_date || undefined,
        notes: newOwnerForm.notes || undefined,
      },
    }));
    setNewOwnerForm({ owner_id: "", percentage: "", role: "founder", joined_date: "", notes: "" });
    setShowAddOwner(false);
  }

  function updateOwnerField(name: string, field: "percentage" | "role" | "notes", val: string | number) {
    setOwnershipData((prev) => ({
      ...prev,
      [name]: { ...prev[name], [field]: field === "percentage" ? parseFloat(val as string) || 0 : val },
    }));
  }

  const totalPct = Object.values(ownershipData).reduce((s, o) => s + (o.percentage || 0), 0);

  // ---------------------------------------------------------------------------
  // Equity entry save
  // ---------------------------------------------------------------------------

  async function handleSaveEquity(e: React.FormEvent) {
    e.preventDefault();
    if (!equityForm.description.trim()) { setEquityError("Description is required."); return; }
    if (!equityForm.date) { setEquityError("Date is required."); return; }
    setSavingEquity(true); setEquityError(null);

    const { error } = await supabase.from("equity_ledger").insert({
      entry_type: equityForm.entry_type,
      owner_id: equityForm.owner_id || null,
      partner_id: id,
      date: equityForm.date,
      description: equityForm.description.trim(),
      amount: parseFloat(equityForm.amount) || 0,
      currency: equityForm.currency || "ZAR",
      notes: equityForm.notes.trim() || null,
    });

    setSavingEquity(false);
    if (error) { setEquityError(error.message); return; }
    setEquityForm((prev) => ({ ...prev, description: "", amount: "", notes: "" }));
    setShowEquityForm(false);
    await loadData();
  }

  // ---------------------------------------------------------------------------
  // External billing save
  // ---------------------------------------------------------------------------

  async function handleSaveBilling(e: React.FormEvent) {
    e.preventDefault();
    if (!billingForm.description.trim()) return;
    setSavingBilling(true);

    const newRow: ExternalBillingRow = {
      id: crypto.randomUUID(),
      description: billingForm.description.trim(),
      amount: parseFloat(billingForm.amount) || 0,
      currency: billingForm.currency,
      date: billingForm.date,
      type: billingForm.type,
    };

    const updated = [...externalBilling, newRow];
    await supabase.from("partners").update({ external_billing: updated }).eq("id", id);
    setExternalBilling(updated);
    setBillingForm({ description: "", amount: "", currency: "ZAR", date: new Date().toISOString().slice(0, 10), type: "revenue" });
    setShowBillingForm(false);
    setSavingBilling(false);
  }

  // ---------------------------------------------------------------------------
  // Equity summaries
  // ---------------------------------------------------------------------------

  const totalCapitalIn = equityEntries.filter((e) => e.entry_type === "capital_injection").reduce((s, e) => s + e.amount, 0);
  const totalSweat = equityEntries.filter((e) => e.entry_type === "sweat_equity").reduce((s, e) => s + e.amount, 0);
  const totalDistributions = equityEntries.filter((e) => e.entry_type === "distribution").reduce((s, e) => s + e.amount, 0);
  const totalLoansIn = equityEntries.filter((e) => e.entry_type === "loan_in").reduce((s, e) => s + e.amount, 0);
  const totalLoansOut = equityEntries.filter((e) => e.entry_type === "loan_out").reduce((s, e) => s + e.amount, 0);
  const totalRepayments = equityEntries.filter((e) => e.entry_type === "repayment").reduce((s, e) => s + e.amount, 0);
  const netLoans = totalLoansIn - totalLoansOut - totalRepayments;

  const ownerName = (ownerId: string | null) => {
    if (!ownerId) return "—";
    const o = owners.find((x) => x.id === ownerId);
    return o?.display_name ?? o?.initials ?? ownerId;
  };

  // ---------------------------------------------------------------------------
  // Loading / not found
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <>
        <div className="fixed top-0 right-0 flex items-center px-8 bg-white border-b border-linen z-10" style={{ left: "240px", height: "56px" }}>
          <h2 className="text-navy font-bold text-lg" style={{ fontFamily: "var(--font-inter)" }}>Venture</h2>
        </div>
        <main className="pt-[56px] p-8">
          <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>Loading…</p>
        </main>
      </>
    );
  }

  if (!venture) {
    return (
      <>
        <div className="fixed top-0 right-0 flex items-center px-8 bg-white border-b border-linen z-10" style={{ left: "240px", height: "56px" }}>
          <h2 className="text-navy font-bold text-lg" style={{ fontFamily: "var(--font-inter)" }}>Venture Not Found</h2>
        </div>
        <main className="pt-[56px] p-8">
          <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
            Venture not found.{" "}
            <Link href="/admin/ventures" className="underline hover:text-navy">Back to Ventures</Link>
          </p>
        </main>
      </>
    );
  }

  const tabs = [
    { value: "overview",    label: "Overview" },
    { value: "ownership",   label: "Ownership" },
    { value: "equity",      label: "Equity & Loans" },
    { value: "billing",     label: "Billing" },
    { value: "documents",   label: "Documents" },
    { value: "brand",       label: "Brand" },
    { value: "files",       label: "Files" },
  ];

  return (
    <>
      <div
        className="fixed top-0 right-0 flex items-center justify-between px-8 bg-white border-b border-linen z-10"
        style={{ left: "240px", height: "56px" }}
      >
        <h2 className="text-navy font-bold text-lg" style={{ fontFamily: "var(--font-inter)" }}>
          {venture.company_name}
        </h2>
      </div>

      <main className="pt-[56px] p-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-steel mb-6" style={{ fontFamily: "var(--font-montserrat)" }}>
          <Link href="/admin/ventures" className="hover:text-navy underline transition-colors">Ventures</Link>
          <span>/</span>
          <span>{venture.company_name}</span>
        </div>

        {/* Tabs */}
        <div className="border-b border-linen mb-6 overflow-x-auto">
          <div className="flex gap-0 -mb-px min-w-max" role="tablist">
            {tabs.map((tab) => (
              <TabButton key={tab.value} active={activeTab === tab.value} onClick={() => setActiveTab(tab.value)}>
                {tab.label}
              </TabButton>
            ))}
          </div>
        </div>

        {/* ================================================================== */}
        {/* OVERVIEW TAB                                                       */}
        {/* ================================================================== */}
        {activeTab === "overview" && (
          <form onSubmit={handleSaveOverview}>
            <div className="bg-white border border-linen p-8" style={{ borderRadius: 0 }}>
              <h3 className="text-navy font-bold text-xs uppercase tracking-wider mb-6" style={{ fontFamily: "var(--font-inter)" }}>
                Venture Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Venture Name *</label>
                  <input
                    type="text" required value={overviewForm.company_name}
                    onChange={(e) => setOverviewForm((p) => ({ ...p, company_name: e.target.value }))}
                    className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Status</label>
                  <select
                    value={overviewForm.status}
                    onChange={(e) => setOverviewForm((p) => ({ ...p, status: e.target.value }))}
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
                    type="date" value={overviewForm.founding_date}
                    onChange={(e) => setOverviewForm((p) => ({ ...p, founding_date: e.target.value }))}
                    className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Website</label>
                  <input
                    type="text" value={overviewForm.website}
                    onChange={(e) => setOverviewForm((p) => ({ ...p, website: e.target.value }))}
                    className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Brand</label>
                  <select
                    value={overviewForm.brand_id}
                    onChange={(e) => setOverviewForm((p) => ({ ...p, brand_id: e.target.value }))}
                    className={selectClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  >
                    <option value="">— No brand linked —</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Description / Notes</label>
                  <textarea
                    rows={5} value={overviewForm.notes}
                    onChange={(e) => setOverviewForm((p) => ({ ...p, notes: e.target.value }))}
                    className="border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm resize-y"
                    style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer" style={{ fontFamily: "var(--font-montserrat)" }}>
                    <input
                      type="checkbox"
                      checked={overviewForm.show_on_site}
                      onChange={(e) => setOverviewForm((p) => ({ ...p, show_on_site: e.target.checked }))}
                      className="w-4 h-4 accent-navy"
                    />
                    <span className="text-sm text-ink">Show on public site</span>
                  </label>
                </div>
              </div>
              {overviewError && (
                <p className="mt-4 text-sm text-red-500" style={{ fontFamily: "var(--font-montserrat)" }}>{overviewError}</p>
              )}
              {overviewSuccess && (
                <p className="mt-4 text-sm text-green-600" style={{ fontFamily: "var(--font-montserrat)" }}>Saved successfully.</p>
              )}
              <div className="mt-8">
                <button
                  type="submit" disabled={savingOverview}
                  className="px-6 py-2.5 text-white text-sm font-semibold transition-opacity disabled:opacity-60"
                  style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
                >
                  {savingOverview ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ================================================================== */}
        {/* OWNERSHIP TAB                                                      */}
        {/* ================================================================== */}
        {activeTab === "ownership" && (
          <div>
            {/* Summary total */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-steel" style={{ fontFamily: "var(--font-montserrat)" }}>
                  Total allocated:{" "}
                  <span
                    className="font-bold"
                    style={{ color: totalPct === 100 ? "#22c55e" : totalPct > 100 ? "#ef4444" : "#1F2A38" }}
                  >
                    {totalPct}%
                  </span>
                  {totalPct !== 100 && (
                    <span className="ml-2 text-xs" style={{ color: totalPct > 100 ? "#ef4444" : "#f59e0b" }}>
                      {totalPct > 100 ? "⚠ Over 100%" : "⚠ Under 100%"}
                    </span>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddOwner(!showAddOwner)}
                className="px-5 py-2 text-white text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
              >
                {showAddOwner ? "Cancel" : "+ Add Owner"}
              </button>
            </div>

            {/* Add owner form */}
            {showAddOwner && (
              <form onSubmit={handleAddOwnerEntry}>
                <div className="bg-white border border-linen p-6 mb-4" style={{ borderRadius: 0 }}>
                  <h4 className="text-navy font-bold text-xs uppercase tracking-wider mb-4" style={{ fontFamily: "var(--font-inter)" }}>
                    Add Owner
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Owner</label>
                      <select
                        required
                        value={newOwnerForm.owner_id}
                        onChange={(e) => setNewOwnerForm((p) => ({ ...p, owner_id: e.target.value }))}
                        className={selectClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                      >
                        <option value="">— Select owner —</option>
                        {owners.map((o) => (
                          <option key={o.id} value={o.id}>{o.display_name ?? o.initials}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Equity %</label>
                      <input
                        type="number" min="0" max="100" step="0.01" required
                        value={newOwnerForm.percentage}
                        onChange={(e) => setNewOwnerForm((p) => ({ ...p, percentage: e.target.value }))}
                        className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                      />
                    </div>
                    <div>
                      <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Role</label>
                      <select
                        value={newOwnerForm.role}
                        onChange={(e) => setNewOwnerForm((p) => ({ ...p, role: e.target.value }))}
                        className={selectClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                      >
                        {OWNER_ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Joined Date</label>
                      <input
                        type="date" value={newOwnerForm.joined_date}
                        onChange={(e) => setNewOwnerForm((p) => ({ ...p, joined_date: e.target.value }))}
                        className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Notes</label>
                      <input
                        type="text" value={newOwnerForm.notes}
                        onChange={(e) => setNewOwnerForm((p) => ({ ...p, notes: e.target.value }))}
                        className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <button
                      type="submit"
                      className="px-5 py-2 text-white text-sm font-semibold"
                      style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Ownership table */}
            <div className="bg-white border border-linen overflow-x-auto" style={{ borderRadius: 0 }}>
              {Object.keys(ownershipData).length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>No owners added yet.</p>
                </div>
              ) : (
                <table className="w-full text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
                  <thead>
                    <tr className="border-b border-linen" style={{ backgroundColor: "rgba(234,228,220,0.5)" }}>
                      <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Owner</th>
                      <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Equity %</th>
                      <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Role</th>
                      <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Notes</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(ownershipData).map(([name, data]) => (
                      <tr key={name} className="border-b border-linen last:border-0">
                        <td className="px-4 py-3 text-ink font-medium">{name}</td>
                        <td className="px-4 py-3">
                          <input
                            type="number" min="0" max="100" step="0.01"
                            value={data.percentage}
                            onChange={(e) => updateOwnerField(name, "percentage", e.target.value)}
                            className="border-b border-linen focus:border-navy outline-none bg-transparent py-1 w-20 text-ink text-sm"
                            style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                          />
                          <span className="ml-1 text-steel text-xs">%</span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={data.role}
                            onChange={(e) => updateOwnerField(name, "role", e.target.value)}
                            className="border-b border-linen focus:border-navy outline-none bg-transparent py-1 text-ink text-sm"
                            style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                          >
                            {OWNER_ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={data.notes ?? ""}
                            onChange={(e) => updateOwnerField(name, "notes", e.target.value)}
                            className="border-b border-linen focus:border-navy outline-none bg-transparent py-1 w-full text-ink text-sm"
                            style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              const copy = { ...ownershipData };
                              delete copy[name];
                              setOwnershipData(copy);
                            }}
                            className="text-xs text-red-400 hover:text-red-600 transition-colors"
                            style={{ fontFamily: "var(--font-montserrat)" }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: "rgba(234,228,220,0.5)" }}>
                      <td className="px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium" style={{ fontFamily: "var(--font-montserrat)" }}>Total</td>
                      <td
                        className="px-4 py-3 text-sm font-bold"
                        style={{ color: totalPct === 100 ? "#22c55e" : "#ef4444", fontFamily: "var(--font-montserrat)" }}
                      >
                        {totalPct}%
                      </td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            {ownershipError && (
              <p className="mt-3 text-sm text-red-500" style={{ fontFamily: "var(--font-montserrat)" }}>{ownershipError}</p>
            )}
            <div className="mt-4">
              <button
                type="button" disabled={savingOwnership} onClick={handleSaveOwnership}
                className="px-5 py-2 text-white text-sm font-semibold transition-opacity disabled:opacity-60"
                style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
              >
                {savingOwnership ? "Saving…" : "Save Ownership"}
              </button>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* EQUITY & LOANS TAB                                                 */}
        {/* ================================================================== */}
        {activeTab === "equity" && (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Capital In",      value: formatAmount(totalCapitalIn) },
                { label: "Sweat Equity",    value: formatAmount(totalSweat) },
                { label: "Distributions",   value: formatAmount(totalDistributions) },
                { label: "Net Loans",       value: formatAmount(netLoans) },
              ].map((card) => (
                <div key={card.label} className="bg-white border border-linen p-5 flex flex-col gap-2" style={{ borderRadius: 0 }}>
                  <span className="text-xs text-steel uppercase tracking-widest" style={{ fontFamily: "var(--font-montserrat)" }}>
                    {card.label}
                  </span>
                  <span className="font-bold text-lg text-navy" style={{ fontFamily: "var(--font-inter)" }}>
                    {card.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Per-owner summary */}
            {owners.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {owners.map((owner) => {
                  const ownerE = equityEntries.filter((e) => e.owner_id === owner.id);
                  const cap = ownerE.filter((e) => e.entry_type === "capital_injection").reduce((s, e) => s + e.amount, 0);
                  const sw = ownerE.filter((e) => e.entry_type === "sweat_equity").reduce((s, e) => s + e.amount, 0);
                  const dist = ownerE.filter((e) => e.entry_type === "distribution").reduce((s, e) => s + e.amount, 0);
                  if (cap + sw + dist === 0) return null;
                  return (
                    <div key={owner.id} className="bg-white border border-linen p-5" style={{ borderRadius: 0 }}>
                      <div className="flex items-center gap-3 mb-3">
                        <span
                          className="w-9 h-9 flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ backgroundColor: "#5C6E81", borderRadius: 0, fontFamily: "var(--font-inter)" }}
                        >
                          {owner.initials ?? (owner.display_name ?? "?").slice(0, 2).toUpperCase()}
                        </span>
                        <span className="text-navy font-bold text-sm" style={{ fontFamily: "var(--font-inter)" }}>
                          {owner.display_name ?? owner.initials}
                        </span>
                      </div>
                      <dl className="space-y-1.5 text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
                        {[
                          { label: "Capital In", value: formatAmount(cap) },
                          { label: "Sweat Equity", value: formatAmount(sw) },
                          { label: "Distributions", value: formatAmount(dist) },
                        ].map((r) => (
                          <div key={r.label} className="flex justify-between">
                            <dt className="text-steel">{r.label}</dt>
                            <dd className="text-ink">{r.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add entry button + form */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-navy font-bold text-sm uppercase tracking-wider" style={{ fontFamily: "var(--font-inter)" }}>
                  Ledger
                </h3>
                <button
                  type="button"
                  onClick={() => setShowEquityForm(!showEquityForm)}
                  className="px-5 py-2 text-white text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
                >
                  {showEquityForm ? "Cancel" : "+ Add Entry"}
                </button>
              </div>

              {showEquityForm && (
                <form onSubmit={handleSaveEquity}>
                  <div className="bg-white border border-linen p-6 mb-4" style={{ borderRadius: 0 }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Entry Type</label>
                        <select
                          value={equityForm.entry_type}
                          onChange={(e) => setEquityForm((p) => ({ ...p, entry_type: e.target.value }))}
                          className={selectClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                        >
                          {EQUITY_ENTRY_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Owner</label>
                        <select
                          value={equityForm.owner_id}
                          onChange={(e) => setEquityForm((p) => ({ ...p, owner_id: e.target.value }))}
                          className={selectClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                        >
                          <option value="">— Select owner —</option>
                          {owners.map((o) => (
                            <option key={o.id} value={o.id}>{o.display_name ?? o.initials}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Date *</label>
                        <input
                          type="date" required value={equityForm.date}
                          onChange={(e) => setEquityForm((p) => ({ ...p, date: e.target.value }))}
                          className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                        />
                      </div>
                      <div>
                        <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Amount *</label>
                        <input
                          type="number" min="0" step="any" required value={equityForm.amount}
                          onChange={(e) => setEquityForm((p) => ({ ...p, amount: e.target.value }))}
                          className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                        />
                      </div>
                      <div>
                        <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Currency</label>
                        <select
                          value={equityForm.currency}
                          onChange={(e) => setEquityForm((p) => ({ ...p, currency: e.target.value }))}
                          className={selectClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                        >
                          <option value="ZAR">ZAR</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Description *</label>
                        <input
                          type="text" required value={equityForm.description}
                          onChange={(e) => setEquityForm((p) => ({ ...p, description: e.target.value }))}
                          className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Notes</label>
                        <input
                          type="text" value={equityForm.notes}
                          onChange={(e) => setEquityForm((p) => ({ ...p, notes: e.target.value }))}
                          className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                        />
                      </div>
                    </div>
                    {equityError && (
                      <p className="mt-3 text-sm text-red-500" style={{ fontFamily: "var(--font-montserrat)" }}>{equityError}</p>
                    )}
                    <div className="mt-4 flex gap-3">
                      <button
                        type="submit" disabled={savingEquity}
                        className="px-5 py-2 text-white text-sm font-semibold transition-opacity disabled:opacity-60"
                        style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
                      >
                        {savingEquity ? "Saving…" : "Save Entry"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowEquityForm(false); setEquityError(null); }}
                        className="text-sm text-steel hover:text-navy transition-colors"
                        style={{ fontFamily: "var(--font-montserrat)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Ledger table */}
              <div className="bg-white border border-linen overflow-x-auto" style={{ borderRadius: 0 }}>
                {equityEntries.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>No equity entries yet.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
                    <thead>
                      <tr className="border-b border-linen" style={{ backgroundColor: "rgba(234,228,220,0.5)" }}>
                        <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Date</th>
                        <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Owner</th>
                        <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Type</th>
                        <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Description</th>
                        <th className="text-right px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {equityEntries.map((entry) => (
                        <tr key={entry.id} className="border-b border-linen last:border-0 hover:bg-linen/20 transition-colors">
                          <td className="px-4 py-3 text-steel whitespace-nowrap">{formatDate(entry.date)}</td>
                          <td className="px-4 py-3 text-ink">{ownerName(entry.owner_id)}</td>
                          <td className="px-4 py-3"><EntryTypeBadge type={entry.entry_type} /></td>
                          <td className="px-4 py-3 text-ink">{entry.description}</td>
                          <td className="px-4 py-3 text-ink text-right font-medium">
                            {formatAmount(entry.amount, entry.currency ?? "ZAR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* BILLING TAB                                                         */}
        {/* ================================================================== */}
        {activeTab === "billing" && (
          <div className="space-y-8">
            {/* Section 1: StaatWright → Venture docs */}
            <div>
              <h3 className="text-navy font-bold text-sm uppercase tracking-wider mb-4" style={{ fontFamily: "var(--font-inter)" }}>
                StaatWright → Venture
              </h3>
              <div className="bg-white border border-linen overflow-x-auto" style={{ borderRadius: 0 }}>
                {documents.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>No documents linked to this venture.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
                    <thead>
                      <tr className="border-b border-linen" style={{ backgroundColor: "rgba(234,228,220,0.5)" }}>
                        <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">#</th>
                        <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Type</th>
                        <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Status</th>
                        <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Date</th>
                        <th className="text-right px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Total</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc) => (
                        <tr key={doc.id} className="border-b border-linen last:border-0 hover:bg-linen/20 transition-colors">
                          <td className="px-4 py-3 text-ink">{doc.number}</td>
                          <td className="px-4 py-3 text-steel capitalize">{doc.type.replace("_", " ")}</td>
                          <td className="px-4 py-3"><DocStatusBadge status={doc.status} /></td>
                          <td className="px-4 py-3 text-steel">{formatDate(doc.issue_date)}</td>
                          <td className="px-4 py-3 text-ink text-right">{formatAmount(doc.total ?? 0, doc.currency ?? "ZAR")}</td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/admin/${doc.type === "invoice" ? "invoices" : doc.type === "quote" ? "quotes" : "credit-notes"}/${doc.id}`}
                              className="text-xs text-steel hover:text-navy underline transition-colors"
                            >
                              View →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Section 2: External Revenue & Subscriptions */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-navy font-bold text-sm uppercase tracking-wider" style={{ fontFamily: "var(--font-inter)" }}>
                    External Revenue & Subscriptions
                  </h3>
                  <p className="text-xs text-steel mt-1" style={{ fontFamily: "var(--font-montserrat)" }}>
                    Connect venture billing API — coming soon. Manual entries below.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBillingForm(!showBillingForm)}
                  className="px-5 py-2 text-white text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
                >
                  {showBillingForm ? "Cancel" : "+ Add Row"}
                </button>
              </div>

              {showBillingForm && (
                <form onSubmit={handleSaveBilling}>
                  <div className="bg-white border border-linen p-6 mb-4" style={{ borderRadius: 0 }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Description *</label>
                        <input
                          type="text" required value={billingForm.description}
                          onChange={(e) => setBillingForm((p) => ({ ...p, description: e.target.value }))}
                          className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                        />
                      </div>
                      <div>
                        <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Amount</label>
                        <input
                          type="number" min="0" step="any" value={billingForm.amount}
                          onChange={(e) => setBillingForm((p) => ({ ...p, amount: e.target.value }))}
                          className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                        />
                      </div>
                      <div>
                        <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Currency</label>
                        <select
                          value={billingForm.currency}
                          onChange={(e) => setBillingForm((p) => ({ ...p, currency: e.target.value }))}
                          className={selectClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                        >
                          <option value="ZAR">ZAR</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Date</label>
                        <input
                          type="date" value={billingForm.date}
                          onChange={(e) => setBillingForm((p) => ({ ...p, date: e.target.value }))}
                          className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                        />
                      </div>
                      <div>
                        <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Type</label>
                        <select
                          value={billingForm.type}
                          onChange={(e) => setBillingForm((p) => ({ ...p, type: e.target.value as "revenue" | "subscription_cost" }))}
                          className={selectClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                        >
                          <option value="revenue">Revenue</option>
                          <option value="subscription_cost">Subscription Cost</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-4">
                      <button
                        type="submit" disabled={savingBilling}
                        className="px-5 py-2 text-white text-sm font-semibold transition-opacity disabled:opacity-60"
                        style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
                      >
                        {savingBilling ? "Saving…" : "Add Row"}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              <div className="bg-white border border-linen overflow-x-auto" style={{ borderRadius: 0 }}>
                {externalBilling.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>No external billing rows yet.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
                    <thead>
                      <tr className="border-b border-linen" style={{ backgroundColor: "rgba(234,228,220,0.5)" }}>
                        <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Description</th>
                        <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Type</th>
                        <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Date</th>
                        <th className="text-right px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {externalBilling.map((row) => (
                        <tr key={row.id} className="border-b border-linen last:border-0 hover:bg-linen/20 transition-colors">
                          <td className="px-4 py-3 text-ink">{row.description}</td>
                          <td className="px-4 py-3 text-steel capitalize">{row.type.replace("_", " ")}</td>
                          <td className="px-4 py-3 text-steel">{formatDate(row.date)}</td>
                          <td className="px-4 py-3 text-ink text-right">{formatAmount(row.amount, row.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* DOCUMENTS TAB                                                       */}
        {/* ================================================================== */}
        {activeTab === "documents" && (
          <div className="space-y-6">
            <div className="bg-white border border-linen p-8" style={{ borderRadius: 0 }}>
              <h3 className="text-navy font-bold text-sm uppercase tracking-wider mb-2" style={{ fontFamily: "var(--font-inter)" }}>
                Documents & Agreements
              </h3>
              <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
                NDA and agreement generation coming soon.
              </p>
            </div>
            <div className="bg-white border border-linen p-8" style={{ borderRadius: 0 }}>
              <h4 className="text-navy font-bold text-xs uppercase tracking-wider mb-4" style={{ fontFamily: "var(--font-inter)" }}>
                Upload Signed Documents
              </h4>
              <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
                File upload coming soon. Use the{" "}
                <Link href="/admin/files" className="underline hover:text-navy transition-colors">Files section →</Link>{" "}
                in the meantime.
              </p>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* BRAND TAB                                                           */}
        {/* ================================================================== */}
        {activeTab === "brand" && (
          <div>
            {!overviewForm.brand_id ? (
              <div className="bg-white border border-linen p-8 text-center" style={{ borderRadius: 0 }}>
                <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
                  No brand linked — select one in the{" "}
                  <button
                    type="button"
                    onClick={() => setActiveTab("overview")}
                    className="underline hover:text-navy transition-colors"
                  >
                    Overview tab
                  </button>
                  .
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white border border-linen p-6 flex items-center justify-between" style={{ borderRadius: 0 }}>
                  <div>
                    <h3 className="text-navy font-bold text-base" style={{ fontFamily: "var(--font-inter)" }}>
                      {linkedBrand?.name ?? "Brand"}
                    </h3>
                    {linkedBrand?.tagline && (
                      <p className="text-xs text-steel mt-1" style={{ fontFamily: "var(--font-montserrat)" }}>
                        {linkedBrand.tagline}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/admin/brands/${overviewForm.brand_id}`}
                    className="px-4 py-2 border border-linen text-xs text-steel hover:border-navy hover:text-navy transition-colors"
                    style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  >
                    Edit Brand →
                  </Link>
                </div>

                {/* Colours */}
                {linkedBrandColours.length > 0 && (
                  <div className="bg-white border border-linen p-6" style={{ borderRadius: 0 }}>
                    <h4 className="text-navy font-bold text-xs uppercase tracking-wider mb-3" style={{ fontFamily: "var(--font-inter)" }}>
                      Colours
                    </h4>
                    <div className="flex flex-wrap gap-3">
                      {linkedBrandColours.map((c) => (
                        <div key={c.id} className="flex flex-col items-center gap-1.5">
                          <div
                            className="w-10 h-10 border border-linen"
                            style={{ backgroundColor: c.hex ?? "#ccc", borderRadius: 0 }}
                          />
                          <span className="text-xs text-steel" style={{ fontFamily: "var(--font-montserrat)" }}>
                            {c.name ?? c.hex ?? "—"}
                          </span>
                          {c.role && (
                            <span className="text-xs text-steel/60" style={{ fontFamily: "var(--font-montserrat)" }}>
                              {c.role}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Logos */}
                {linkedBrandLogos.length > 0 && (
                  <div className="bg-white border border-linen p-6" style={{ borderRadius: 0 }}>
                    <h4 className="text-navy font-bold text-xs uppercase tracking-wider mb-3" style={{ fontFamily: "var(--font-inter)" }}>
                      Logos
                    </h4>
                    <div className="flex flex-wrap gap-4">
                      {linkedBrandLogos.map((logo) => (
                        <div key={logo.id} className="flex flex-col gap-1.5 items-center">
                          <div className="w-20 h-12 border border-linen flex items-center justify-center bg-linen/30">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`/storage/v1/object/public/brand-assets/${logo.storage_path}`}
                              alt={logo.variant}
                              className="max-w-full max-h-full object-contain"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          </div>
                          <span className="text-xs text-steel" style={{ fontFamily: "var(--font-montserrat)" }}>
                            {logo.variant}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================================================================== */}
        {/* FILES TAB                                                           */}
        {/* ================================================================== */}
        {activeTab === "files" && (
          <div className="bg-white border border-linen p-8" style={{ borderRadius: 0 }}>
            <h3 className="text-navy font-bold text-xs uppercase tracking-wider mb-3" style={{ fontFamily: "var(--font-inter)" }}>
              Files
            </h3>
            <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
              No files uploaded yet. Manage files in the{" "}
              <Link href="/admin/files" className="underline hover:text-navy transition-colors">Files section →</Link>
            </p>
          </div>
        )}
      </main>
    </>
  );
}

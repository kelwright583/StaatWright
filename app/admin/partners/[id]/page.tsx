"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as Tabs from "@radix-ui/react-tabs";
import { createClient } from "@/lib/supabase/client";
import {
  BrandIdentityForm,
  BrandColoursEditor,
  BrandTypographyEditor,
  BrandLogosEditor,
  BrandCardFields,
} from "@/components/admin/BrandEditor";
import BrandCard from "@/components/shared/BrandCard";
import type { Document, Brand, BrandCardData, PartnerNote, PartnerSpec, BrandColour, BrandLogo, OwnerSettings } from "@/lib/types";

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

interface PartnerData {
  id: string;
  company_name: string;
  type: "client" | "venture";
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  vat_number: string | null;
  reg_number: string | null;
  bank_name: string | null;
  bank_account_holder: string | null;
  bank_account_number: string | null;
  bank_branch_code: string | null;
  bank_account_type: string | null;
  relationship_type: string | null;
  status: string | null;
  founding_date: string | null;
  show_on_site: boolean | null;
  brand_id: string | null;
  tags: string[] | null;
  notes_log: PartnerNote[] | null;
  venture_ownership: Record<string, { percentage: number; role: string; joined_date?: string; notes?: string }> | null;
  external_billing: Array<{ id: string; description: string; amount: number; currency: string; date: string; type: string }> | null;
  spec: PartnerSpec | null;
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatZAR(n: number): string {
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatAmount(n: number, currency = "ZAR"): string {
  if (currency === "ZAR") return formatZAR(n);
  return `${currency} ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RELATIONSHIP_OPTIONS = [
  { value: "retainer",  label: "Retainer" },
  { value: "project",   label: "Project" },
  { value: "advisory",  label: "Advisory" },
  { value: "other",     label: "Other" },
];

const VENTURE_STATUSES = [
  { value: "active",       label: "Active" },
  { value: "paused",       label: "Paused" },
  { value: "winding_down", label: "Winding Down" },
  { value: "exited",       label: "Exited" },
];

const SCOPE_STATUSES = [
  { value: "in_spec",  label: "In Spec" },
  { value: "in_build", label: "In Build" },
  { value: "live",     label: "Live" },
  { value: "paused",   label: "Paused" },
  { value: "complete", label: "Complete" },
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

// ---------------------------------------------------------------------------
// Shared CSS classes
// ---------------------------------------------------------------------------

const inputClass = "border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm";
const labelClass = "block text-xs text-steel uppercase tracking-wider mb-1";
const selectClass = "border-b border-linen focus:border-navy outline-none bg-transparent py-2 w-full text-ink text-sm";
const btnPrimary = "px-5 py-2.5 text-white text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40";
const cardClass = "bg-white border border-linen p-8";

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

const statusMap: Record<string, { dot: string; label: string }> = {
  paid:             { dot: "bg-green-500",  label: "Paid" },
  overdue:          { dot: "bg-red-500",    label: "Overdue" },
  sent:             { dot: "bg-amber-500",  label: "Sent" },
  draft:            { dot: "bg-steel",      label: "Draft" },
  accepted:         { dot: "bg-green-400",  label: "Accepted" },
  declined:         { dot: "bg-red-400",    label: "Declined" },
  expired:          { dot: "bg-red-300",    label: "Expired" },
  cancelled:        { dot: "bg-steel",      label: "Cancelled" },
  issued:           { dot: "bg-amber-400",  label: "Issued" },
  partially_paid:   { dot: "bg-indigo-400", label: "Partially Paid" },
};

function StatusBadge({ status }: { status: string }) {
  const entry = statusMap[status] ?? { dot: "bg-steel", label: status };
  return (
    <span className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-montserrat)" }}>
      <span className={`inline-block w-2 h-2 shrink-0 ${entry.dot}`} />
      <span className="text-xs text-steel capitalize">{entry.label}</span>
    </span>
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
      style={{ backgroundColor: `${meta.color}18`, color: meta.color, borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
    >
      {meta.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// TabButton
// ---------------------------------------------------------------------------

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick}
      className="px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap"
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
// DocumentTable (shared for invoices + quotes)
// ---------------------------------------------------------------------------

function DocumentTable({ docs, newHref, newLabel, emptyMsg }: {
  docs: Document[]; newHref: string; newLabel: string; emptyMsg: string;
}) {
  return (
    <div>
      <div className="flex justify-end mb-4">
        <Link
          href={newHref}
          className={btnPrimary}
          style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
        >
          + {newLabel}
        </Link>
      </div>
      <div className="bg-white border border-linen overflow-x-auto" style={{ borderRadius: 0 }}>
        {docs.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>{emptyMsg}</p>
          </div>
        ) : (
          <table className="w-full text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
            <thead>
              <tr className="border-b border-linen" style={{ backgroundColor: "rgba(234,228,220,0.5)" }}>
                <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">#</th>
                <th className="text-right px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Amount</th>
                <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Status</th>
                <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Date</th>
                <th className="text-left px-4 py-3 text-xs text-steel uppercase tracking-wider font-medium">Due / Valid Until</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc.id} className="border-b border-linen last:border-0 hover:bg-linen/20 transition-colors">
                  <td className="px-4 py-3 text-ink">{doc.number}</td>
                  <td className="px-4 py-3 text-ink text-right">{formatZAR(doc.total ?? 0)}</td>
                  <td className="px-4 py-3"><StatusBadge status={doc.status} /></td>
                  <td className="px-4 py-3 text-steel">{formatDate(doc.issue_date)}</td>
                  <td className="px-4 py-3 text-steel">{formatDate(doc.due_date ?? doc.valid_until)}</td>
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
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PartnerDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();

  // Core state
  const [partner, setPartner] = useState<PartnerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Related data
  const [invoices, setInvoices] = useState<Document[]>([]);
  const [quotes, setQuotes] = useState<Document[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [owners, setOwners] = useState<OwnerSettings[]>([]);
  const [equityEntries, setEquityEntries] = useState<EquityLedgerEntry[]>([]);
  const [linkedBrand, setLinkedBrand] = useState<Brand | null>(null);
  const [linkedBrandColours, setLinkedBrandColours] = useState<BrandColour[]>([]);
  const [linkedBrandLogos, setLinkedBrandLogos] = useState<BrandLogo[]>([]);

  // Stats
  const [totalInvoiced, setTotalInvoiced] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalOutstanding, setTotalOutstanding] = useState(0);

  // Overview form
  const [overviewForm, setOverviewForm] = useState({
    company_name: "", contact_name: "", email: "", phone: "",
    website: "", address: "", vat_number: "",
    relationship_type: "", status: "", founding_date: "",
    show_on_site: false, brand_id: "",
  });
  const [savingOverview, setSavingOverview] = useState(false);
  const [overviewMsg, setOverviewMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);

  // Ownership (ventures)
  const [ownershipData, setOwnershipData] = useState<Record<string, { percentage: number; role: string; joined_date?: string; notes?: string }>>({});
  const [savingOwnership, setSavingOwnership] = useState(false);
  const [ownershipError, setOwnershipError] = useState<string | null>(null);
  const [showAddOwner, setShowAddOwner] = useState(false);
  const [newOwnerForm, setNewOwnerForm] = useState({ owner_id: "", percentage: "", role: "founder", joined_date: "", notes: "" });

  // Notes
  const [newNoteText, setNewNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Spec & Brief (ventures)
  const [specForm, setSpecForm] = useState<PartnerSpec>({});
  const [savingSpec, setSavingSpec] = useState(false);
  const [specMsg, setSpecMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [newFeature, setNewFeature] = useState("");
  const [newTechTag, setNewTechTag] = useState("");
  const [newScopeItem, setNewScopeItem] = useState("");
  const [newOtherLink, setNewOtherLink] = useState({ label: "", url: "" });

  // Equity form (ventures)
  const [showEquityForm, setShowEquityForm] = useState(false);
  const [equityForm, setEquityForm] = useState({
    entry_type: "capital_injection", owner_id: "",
    date: new Date().toISOString().slice(0, 10),
    description: "", amount: "", currency: "ZAR", notes: "",
  });
  const [savingEquity, setSavingEquity] = useState(false);
  const [equityError, setEquityError] = useState<string | null>(null);

  // Billing form (ventures)
  const [billingForm, setBillingForm] = useState({
    reg_number: "", bank_name: "", bank_account_holder: "",
    bank_account_number: "", bank_branch_code: "", bank_account_type: "",
  });
  const [savingBilling, setSavingBilling] = useState(false);
  const [billingMsg, setBillingMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  const loadData = useCallback(async () => {
    setLoading(true);

    const [
      { data: partnerData },
      { data: invoiceData },
      { data: quoteData },
      { data: brandsData },
      { data: ownersData },
      { data: equityData },
    ] = await Promise.all([
      supabase.from("partners").select("*").eq("id", id).single(),
      supabase.from("documents").select("*").eq("partner_id", id).eq("type", "invoice").order("created_at", { ascending: false }),
      supabase.from("documents").select("*").eq("partner_id", id).eq("type", "quote").order("created_at", { ascending: false }),
      supabase.from("brands").select("*").order("name"),
      supabase.from("owner_settings").select("*").order("display_name"),
      supabase.from("equity_ledger").select("*").eq("partner_id", id).order("date", { ascending: false }),
    ]);

    if (partnerData) {
      const p = partnerData as PartnerData;
      setPartner(p);
      setOverviewForm({
        company_name: p.company_name,
        contact_name: p.contact_name ?? "",
        email: p.email ?? "",
        phone: p.phone ?? "",
        website: p.website ?? "",
        address: p.address ?? "",
        vat_number: p.vat_number ?? "",
        relationship_type: p.relationship_type ?? "",
        status: p.status ?? "active",
        founding_date: p.founding_date ?? "",
        show_on_site: p.show_on_site ?? false,
        brand_id: p.brand_id ?? "",
      });
      setOwnershipData(p.venture_ownership ?? {});
      setSpecForm(p.spec ?? {});
      setBillingForm({
        reg_number: p.reg_number ?? "",
        bank_name: p.bank_name ?? "",
        bank_account_holder: p.bank_account_holder ?? "",
        bank_account_number: p.bank_account_number ?? "",
        bank_branch_code: p.bank_branch_code ?? "",
        bank_account_type: p.bank_account_type ?? "",
      });
    }

    const allInvoices = (invoiceData ?? []) as Document[];
    setInvoices(allInvoices);
    setQuotes((quoteData ?? []) as Document[]);
    setBrands((brandsData ?? []) as Brand[]);
    setOwners((ownersData ?? []) as OwnerSettings[]);
    setEquityEntries((equityData ?? []) as EquityLedgerEntry[]);

    const invoiced = allInvoices.reduce((s, d) => s + (d.total ?? 0), 0);
    const paid = allInvoices.filter((d) => d.status === "paid").reduce((s, d) => s + (d.total ?? 0), 0);
    const outstanding = allInvoices
      .filter((d) => d.status === "sent" || d.status === "overdue" || d.status === "partially_paid")
      .reduce((s, d) => s + (d.total ?? 0), 0);
    setTotalInvoiced(invoiced);
    setTotalPaid(paid);
    setTotalOutstanding(outstanding);

    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load linked brand when brand_id changes
  useEffect(() => {
    if (!overviewForm.brand_id) {
      setLinkedBrand(null);
      setLinkedBrandColours([]);
      setLinkedBrandLogos([]);
      return;
    }
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
  // Handlers: Overview
  // ---------------------------------------------------------------------------

  async function handleSaveOverview(e: React.FormEvent) {
    e.preventDefault();
    if (!overviewForm.company_name.trim()) {
      setOverviewMsg({ type: "error", text: "Company name is required." });
      return;
    }
    setSavingOverview(true);
    setOverviewMsg(null);

    const payload: Record<string, unknown> = {
      company_name: overviewForm.company_name.trim(),
      contact_name: overviewForm.contact_name.trim() || null,
      email: overviewForm.email.trim() || null,
      phone: overviewForm.phone.trim() || null,
      website: overviewForm.website.trim() || null,
      address: overviewForm.address.trim() || null,
      vat_number: overviewForm.vat_number.trim() || null,
      show_on_site: overviewForm.show_on_site,
      brand_id: overviewForm.brand_id || null,
    };

    if (partner?.type === "client") {
      payload.relationship_type = overviewForm.relationship_type || null;
    } else {
      payload.status = overviewForm.status || null;
      payload.founding_date = overviewForm.founding_date || null;
    }

    const { error } = await supabase.from("partners").update(payload).eq("id", id);
    setSavingOverview(false);
    if (error) { setOverviewMsg({ type: "error", text: error.message }); return; }
    setOverviewMsg({ type: "success", text: "Saved successfully." });
    await loadData();
    setTimeout(() => setOverviewMsg(null), 3000);
  }

  // ---------------------------------------------------------------------------
  // Handlers: Billing
  // ---------------------------------------------------------------------------

  async function handleSaveBilling(e: React.FormEvent) {
    e.preventDefault();
    setSavingBilling(true);
    setBillingMsg(null);
    const { error } = await supabase.from("partners").update({
      reg_number: billingForm.reg_number.trim() || null,
      bank_name: billingForm.bank_name.trim() || null,
      bank_account_holder: billingForm.bank_account_holder.trim() || null,
      bank_account_number: billingForm.bank_account_number.trim() || null,
      bank_branch_code: billingForm.bank_branch_code.trim() || null,
      bank_account_type: billingForm.bank_account_type.trim() || null,
    }).eq("id", id);
    setSavingBilling(false);
    if (error) { setBillingMsg({ type: "error", text: error.message }); return; }
    setBillingMsg({ type: "success", text: "Billing details saved." });
    await loadData();
    setTimeout(() => setBillingMsg(null), 3000);
  }

  // ---------------------------------------------------------------------------
  // Handlers: Notes
  // ---------------------------------------------------------------------------

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    setSavingNote(true);

    const { data: ownerData } = await supabase
      .from("owner_settings")
      .select("initials")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
      .single();

    const initials = ownerData?.initials ?? "SW";

    const newNote: PartnerNote = {
      text: newNoteText.trim(),
      created_at: new Date().toISOString(),
      initials,
    };

    const currentNotes = partner?.notes_log ?? [];
    const updatedNotes = [...currentNotes, newNote];

    await supabase.from("partners").update({ notes_log: updatedNotes }).eq("id", id);
    setNewNoteText("");
    setSavingNote(false);
    await loadData();
  }

  // ---------------------------------------------------------------------------
  // Handlers: Ownership (ventures)
  // ---------------------------------------------------------------------------

  async function handleSaveOwnership() {
    setSavingOwnership(true);
    setOwnershipError(null);
    const { error } = await supabase.from("partners").update({ venture_ownership: ownershipData }).eq("id", id);
    setSavingOwnership(false);
    if (error) setOwnershipError(error.message);
    else await loadData();
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
  const ownershipSplit = Object.entries(ownershipData)
    .map(([name, d]) => `${name.split(" ").map((w) => w[0]).join("")} ${d.percentage}%`)
    .join(" · ");

  // ---------------------------------------------------------------------------
  // Handlers: Spec & Brief (ventures)
  // ---------------------------------------------------------------------------

  async function handleSaveSpec(e: React.FormEvent) {
    e.preventDefault();
    setSavingSpec(true);
    setSpecMsg(null);
    const { error } = await supabase.from("partners").update({ spec: specForm }).eq("id", id);
    setSavingSpec(false);
    if (error) { setSpecMsg({ type: "error", text: error.message }); return; }
    setSpecMsg({ type: "success", text: "Spec saved." });
    await loadData();
    setTimeout(() => setSpecMsg(null), 3000);
  }

  // ---------------------------------------------------------------------------
  // Handlers: Equity Ledger (ventures)
  // ---------------------------------------------------------------------------

  async function handleSaveEquity(e: React.FormEvent) {
    e.preventDefault();
    if (!equityForm.description.trim()) { setEquityError("Description is required."); return; }
    if (!equityForm.date) { setEquityError("Date is required."); return; }
    setSavingEquity(true);
    setEquityError(null);

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
  // Handlers: Brand creation
  // ---------------------------------------------------------------------------

  const [creatingBrand, setCreatingBrand] = useState(false);

  async function handleCreateBrand() {
    setCreatingBrand(true);
    const { data: newBrand, error } = await supabase
      .from("brands")
      .insert({ name: partner?.company_name ?? "New Brand", status: "in_development" })
      .select("id")
      .single();
    if (!error && newBrand) {
      await supabase.from("partners").update({ brand_id: newBrand.id }).eq("id", id);
      await loadData();
    }
    setCreatingBrand(false);
  }

  async function loadBrandJoins() {
    if (!overviewForm.brand_id) return;
    const [{ data: cols }, { data: logs }] = await Promise.all([
      supabase.from("brand_colours").select("*").eq("brand_id", overviewForm.brand_id),
      supabase.from("brand_logos").select("*").eq("brand_id", overviewForm.brand_id),
    ]);
    setLinkedBrandColours((cols ?? []) as BrandColour[]);
    setLinkedBrandLogos((logs ?? []) as BrandLogo[]);
  }

  function handleBrandSaved(updatedBrand: Brand) {
    setLinkedBrand(updatedBrand);
    loadBrandJoins();
  }

  // ---------------------------------------------------------------------------
  // Loading / not found
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <>
        <div className="fixed top-0 right-0 flex items-center px-8 bg-white border-b border-linen z-10" style={{ left: "240px", height: "56px" }}>
          <h2 className="text-navy font-bold text-lg" style={{ fontFamily: "var(--font-inter)" }}>Partner</h2>
        </div>
        <main className="pt-[56px] p-8">
          <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>Loading…</p>
        </main>
      </>
    );
  }

  if (!partner) {
    return (
      <>
        <div className="fixed top-0 right-0 flex items-center px-8 bg-white border-b border-linen z-10" style={{ left: "240px", height: "56px" }}>
          <h2 className="text-navy font-bold text-lg" style={{ fontFamily: "var(--font-inter)" }}>Partner Not Found</h2>
        </div>
        <main className="pt-[56px] p-8">
          <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
            Partner not found.{" "}
            <Link href="/admin/partners" className="underline hover:text-navy">Back to Partners</Link>
          </p>
        </main>
      </>
    );
  }

  const isClient = partner.type === "client";
  const isVenture = partner.type === "venture";

  const clientTabs = [
    { value: "overview",  label: "Overview" },
    { value: "brand",     label: "Brand & Identity" },
    { value: "projects",  label: "Projects" },
    { value: "spec",      label: "Spec & Brief" },
    { value: "invoices",  label: `Invoices (${invoices.length})` },
    { value: "quotes",    label: `Quotes (${quotes.length})` },
    { value: "files",     label: "Files" },
    { value: "notes",     label: "Notes" },
    { value: "statement", label: "Statement" },
  ];

  const ventureTabs = [
    { value: "overview",  label: "Overview" },
    { value: "brand",     label: "Brand & Identity" },
    { value: "billing",   label: "Billing" },
    { value: "spec",      label: "Spec & Brief" },
    { value: "projects",  label: "Projects" },
    { value: "invoices",  label: `Invoices (${invoices.length})` },
    { value: "equity",    label: "Equity Ledger" },
    { value: "files",     label: "Files" },
    { value: "notes",     label: "Notes" },
  ];

  const tabs = isClient ? clientTabs : ventureTabs;

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <>
      {/* ── Header Strip ──────────────────────────────────────────────── */}
      <div
        className="fixed top-0 right-0 flex items-center justify-between px-8 bg-white border-b border-linen z-10"
        style={{ left: "240px", height: "56px" }}
      >
        <div className="flex items-center gap-4">
          <h2 className="text-navy font-bold text-lg" style={{ fontFamily: "var(--font-inter)" }}>
            {partner.company_name}
          </h2>
          <span
            className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-white"
            style={{
              backgroundColor: isClient ? "#3b82f6" : "#f59e0b",
              borderRadius: 0,
              fontFamily: "var(--font-inter)",
            }}
          >
            {partner.type}
          </span>
        </div>

        <div className="flex items-center gap-6">
          {/* Stats */}
          <div className="hidden md:flex items-center gap-5 text-xs" style={{ fontFamily: "var(--font-montserrat)" }}>
            <div className="flex flex-col items-end">
              <span className="text-steel uppercase tracking-wider">Invoiced</span>
              <span className="text-ink font-bold">{formatZAR(totalInvoiced)}</span>
            </div>
            <div className="w-px h-6 bg-linen" />
            <div className="flex flex-col items-end">
              <span className="text-steel uppercase tracking-wider">Paid</span>
              <span className="text-green-600 font-bold">{formatZAR(totalPaid)}</span>
            </div>
            <div className="w-px h-6 bg-linen" />
            <div className="flex flex-col items-end">
              <span className="text-steel uppercase tracking-wider">Outstanding</span>
              <span className={`font-bold ${totalOutstanding > 0 ? "text-amber-600" : "text-ink"}`}>
                {formatZAR(totalOutstanding)}
              </span>
            </div>
            {isVenture && ownershipSplit && (
              <>
                <div className="w-px h-6 bg-linen" />
                <div className="flex flex-col items-end">
                  <span className="text-steel uppercase tracking-wider">Ownership</span>
                  <span className="text-ink font-bold">{ownershipSplit}</span>
                </div>
              </>
            )}
          </div>

          {isClient && (
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/invoices/new?partner_id=${id}`}
                className="px-3 py-1.5 text-white text-xs font-semibold transition-opacity hover:opacity-80"
                style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
              >
                + Invoice
              </Link>
              <Link
                href={`/admin/quotes/new?partner_id=${id}`}
                className="px-3 py-1.5 text-white text-xs font-semibold transition-opacity hover:opacity-80"
                style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
              >
                + Quote
              </Link>
              <Link
                href={`/admin/partners/${id}/statement`}
                className="px-4 py-1.5 border border-linen text-xs text-steel hover:border-navy hover:text-navy transition-colors"
                style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
              >
                Statement
              </Link>
            </div>
          )}
          {isVenture && (
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/invoices/new?partner_id=${id}`}
                className="px-3 py-1.5 text-white text-xs font-semibold transition-opacity hover:opacity-80"
                style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
              >
                + Invoice
              </Link>
              <button
                type="button"
                onClick={() => setActiveTab("equity")}
                className="px-3 py-1.5 border border-linen text-xs text-steel hover:border-navy hover:text-navy transition-colors"
                style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
              >
                + Equity Entry
              </button>
            </div>
          )}
        </div>
      </div>

      <main className="pt-[56px] p-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-steel mb-6" style={{ fontFamily: "var(--font-montserrat)" }}>
          <Link href="/admin/partners" className="hover:text-navy underline transition-colors">Partners</Link>
          <span>/</span>
          <span>{partner.company_name}</span>
        </div>

        {/* Mobile stats strip */}
        <div className="flex md:hidden items-center gap-4 mb-6 flex-wrap text-xs" style={{ fontFamily: "var(--font-montserrat)" }}>
          <span className="text-steel">Invoiced: <strong className="text-ink">{formatZAR(totalInvoiced)}</strong></span>
          <span className="text-steel">Paid: <strong className="text-green-600">{formatZAR(totalPaid)}</strong></span>
          <span className="text-steel">Outstanding: <strong className={totalOutstanding > 0 ? "text-amber-600" : "text-ink"}>{formatZAR(totalOutstanding)}</strong></span>
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

        {/* ================================================================ */}
        {/* OVERVIEW TAB                                                     */}
        {/* ================================================================ */}
        {activeTab === "overview" && (
          <form onSubmit={handleSaveOverview}>
            <div className={cardClass} style={{ borderRadius: 0 }}>
              <h3 className="text-navy font-bold text-xs uppercase tracking-wider mb-6" style={{ fontFamily: "var(--font-inter)" }}>
                {isClient ? "Client Details" : "Venture Details"}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Company Name *</label>
                  <input
                    type="text" required value={overviewForm.company_name}
                    onChange={(e) => setOverviewForm((p) => ({ ...p, company_name: e.target.value }))}
                    className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>

                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Contact Name</label>
                  <input
                    type="text" value={overviewForm.contact_name}
                    onChange={(e) => setOverviewForm((p) => ({ ...p, contact_name: e.target.value }))}
                    className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Email</label>
                  <input
                    type="email" value={overviewForm.email}
                    onChange={(e) => setOverviewForm((p) => ({ ...p, email: e.target.value }))}
                    className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Phone</label>
                  <input
                    type="text" value={overviewForm.phone}
                    onChange={(e) => setOverviewForm((p) => ({ ...p, phone: e.target.value }))}
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
                <div className="sm:col-span-2">
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Address</label>
                  <input
                    type="text" value={overviewForm.address}
                    onChange={(e) => setOverviewForm((p) => ({ ...p, address: e.target.value }))}
                    className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>VAT Number</label>
                  <input
                    type="text" value={overviewForm.vat_number}
                    onChange={(e) => setOverviewForm((p) => ({ ...p, vat_number: e.target.value }))}
                    className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                  />
                </div>

                {/* Client-specific fields */}
                {isClient && (
                  <div>
                    <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Relationship Type</label>
                    <select
                      value={overviewForm.relationship_type}
                      onChange={(e) => setOverviewForm((p) => ({ ...p, relationship_type: e.target.value }))}
                      className={selectClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                    >
                      <option value="">— Select —</option>
                      {RELATIONSHIP_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Venture-specific fields */}
                {isVenture && (
                  <>
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
                  </>
                )}

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
                  <label className="flex items-center gap-3 cursor-pointer" style={{ fontFamily: "var(--font-montserrat)" }}>
                    <input
                      type="checkbox"
                      checked={overviewForm.show_on_site}
                      onChange={(e) => setOverviewForm((p) => ({ ...p, show_on_site: e.target.checked }))}
                      className="w-4 h-4 accent-navy"
                      style={{ borderRadius: 0 }}
                    />
                    <span className="text-sm text-ink">Show on public site</span>
                  </label>
                </div>

                {/* Ownership display for ventures */}
                {isVenture && Object.keys(ownershipData).length > 0 && (
                  <div className="sm:col-span-2 border-t border-linen pt-6 mt-2">
                    <h4 className="text-navy font-bold text-xs uppercase tracking-wider mb-3" style={{ fontFamily: "var(--font-inter)" }}>
                      Ownership Split
                    </h4>
                    <div className="flex flex-wrap gap-4">
                      {Object.entries(ownershipData).map(([name, data]) => (
                        <div key={name} className="flex items-center gap-2 border border-linen px-3 py-2" style={{ borderRadius: 0 }}>
                          <span
                            className="w-7 h-7 flex items-center justify-center text-xs font-bold text-white shrink-0"
                            style={{ backgroundColor: "#5C6E81", borderRadius: 0, fontFamily: "var(--font-inter)" }}
                          >
                            {name.split(" ").map((w) => w[0]).join("").toUpperCase()}
                          </span>
                          <div>
                            <div className="text-sm text-ink font-medium" style={{ fontFamily: "var(--font-montserrat)" }}>{name}</div>
                            <div className="text-xs text-steel" style={{ fontFamily: "var(--font-montserrat)" }}>
                              {data.percentage}% · {data.role}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {overviewMsg && (
                <p
                  className={`mt-4 text-sm ${overviewMsg.type === "error" ? "text-red-500" : "text-green-600"}`}
                  style={{ fontFamily: "var(--font-montserrat)" }}
                >
                  {overviewMsg.text}
                </p>
              )}
              <div className="mt-8">
                <button
                  type="submit" disabled={savingOverview}
                  className={btnPrimary}
                  style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
                >
                  {savingOverview ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ================================================================ */}
        {/* PROJECTS TAB (placeholder)                                       */}
        {/* ================================================================ */}
        {activeTab === "projects" && (
          <div className={cardClass} style={{ borderRadius: 0 }}>
            <h3 className="text-navy font-bold text-xs uppercase tracking-wider mb-3" style={{ fontFamily: "var(--font-inter)" }}>
              Projects
            </h3>
            <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
              Project management coming soon. Track time, budgets, and deliverables per project.
            </p>
          </div>
        )}

        {/* ================================================================ */}
        {/* INVOICES TAB                                                     */}
        {/* ================================================================ */}
        {activeTab === "invoices" && (
          <DocumentTable
            docs={invoices}
            newHref={`/admin/invoices/new?partner_id=${id}`}
            newLabel="New Invoice"
            emptyMsg={`No invoices for this ${partner.type} yet.`}
          />
        )}

        {/* ================================================================ */}
        {/* QUOTES TAB (clients only)                                        */}
        {/* ================================================================ */}
        {activeTab === "quotes" && isClient && (
          <DocumentTable
            docs={quotes}
            newHref={`/admin/quotes/new?partner_id=${id}`}
            newLabel="New Quote"
            emptyMsg="No quotes for this client yet."
          />
        )}

        {/* ================================================================ */}
        {/* STATEMENT TAB (clients only — redirect)                          */}
        {/* ================================================================ */}
        {activeTab === "statement" && isClient && (
          <div className={cardClass} style={{ borderRadius: 0 }}>
            <h3 className="text-navy font-bold text-xs uppercase tracking-wider mb-3" style={{ fontFamily: "var(--font-inter)" }}>
              Statement
            </h3>
            <p className="text-steel text-sm mb-4" style={{ fontFamily: "var(--font-montserrat)" }}>
              View the full client statement with all invoices, payments, and balances.
            </p>
            <Link
              href={`/admin/partners/${id}/statement`}
              className={btnPrimary}
              style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
            >
              Open Statement →
            </Link>
          </div>
        )}

        {/* ================================================================ */}
        {/* FILES TAB                                                        */}
        {/* ================================================================ */}
        {activeTab === "files" && (
          <div className={cardClass} style={{ borderRadius: 0 }}>
            <h3 className="text-navy font-bold text-xs uppercase tracking-wider mb-3" style={{ fontFamily: "var(--font-inter)" }}>
              Files
            </h3>
            <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
              Files coming soon. Upload and organise files in the{" "}
              <Link href="/admin/files" className="underline hover:text-navy transition-colors">Files section →</Link>
            </p>
          </div>
        )}

        {/* ================================================================ */}
        {/* NOTES TAB                                                        */}
        {/* ================================================================ */}
        {activeTab === "notes" && (
          <div className={cardClass} style={{ borderRadius: 0 }}>
            <h3 className="text-navy font-bold text-xs uppercase tracking-wider mb-6" style={{ fontFamily: "var(--font-inter)" }}>
              Activity Notes
            </h3>

            <div className="space-y-3 mb-8">
              {(partner.notes_log ?? []).length === 0 ? (
                <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>No notes yet.</p>
              ) : (
                [...(partner.notes_log ?? [])].reverse().map((note: PartnerNote, i: number) => (
                  <div key={i} className="border-l-2 border-linen pl-4 py-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white"
                        style={{ backgroundColor: "#1F2A38", borderRadius: 0, fontFamily: "var(--font-inter)" }}
                      >
                        {note.initials}
                      </span>
                      <span className="text-xs text-steel" style={{ fontFamily: "var(--font-montserrat)" }}>
                        {formatDateTime(note.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-ink" style={{ fontFamily: "var(--font-montserrat)" }}>{note.text}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddNote} className="border-t border-linen pt-6">
              <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Add Note</label>
              <textarea
                rows={3}
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Add an internal note…"
                className="border border-linen focus:border-navy outline-none bg-transparent p-3 w-full text-ink text-sm resize-y mt-1"
                style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
              />
              <button
                type="submit"
                disabled={savingNote || !newNoteText.trim()}
                className={`mt-3 ${btnPrimary}`}
                style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
              >
                {savingNote ? "Saving…" : "Add Note"}
              </button>
            </form>
          </div>
        )}

        {/* ================================================================ */}
        {/* BRAND & IDENTITY TAB (clients + ventures)                        */}
        {/* ================================================================ */}
        {activeTab === "brand" && (
          <div className="space-y-6">
            {!overviewForm.brand_id ? (
              <div className={`${cardClass} text-center`} style={{ borderRadius: 0 }}>
                <p className="text-steel text-sm mb-4" style={{ fontFamily: "var(--font-montserrat)" }}>
                  No brand identity linked to this {partner.type} yet.
                </p>
                <button
                  type="button"
                  onClick={handleCreateBrand}
                  disabled={creatingBrand}
                  className={btnPrimary}
                  style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
                >
                  {creatingBrand ? "Creating…" : "Create Brand Identity"}
                </button>
              </div>
            ) : (
              <>
                {/* Public Site Card Preview */}
                <div className="bg-white border border-linen p-6" style={{ borderRadius: 0 }}>
                  <h3 className="text-navy font-bold text-xs uppercase tracking-wider mb-4"
                      style={{ fontFamily: "var(--font-inter)" }}>
                    Public Site Preview
                  </h3>
                  <div className="max-w-sm">
                    {linkedBrand && (
                      <BrandCard brand={{
                        ...linkedBrand,
                        brand_colours: linkedBrandColours ?? [],
                        brand_logos: linkedBrandLogos ?? [],
                      } as BrandCardData} />
                    )}
                  </div>
                  <p className="text-xs text-steel mt-3" style={{ fontFamily: "var(--font-montserrat)" }}>
                    This is how the card appears on staatwright.co.za
                  </p>
                </div>

                {/* Radix Tabs for brand sub-sections */}
                <Tabs.Root defaultValue="identity">
                  <Tabs.List className="flex border-b border-linen mb-4">
                    <Tabs.Trigger value="identity" className="px-5 py-3 text-sm font-medium border-b-2 transition-colors data-[state=active]:border-navy data-[state=active]:text-navy data-[state=inactive]:border-transparent data-[state=inactive]:text-steel hover:text-navy" style={{ fontFamily: "var(--font-montserrat)" }}>Identity</Tabs.Trigger>
                    <Tabs.Trigger value="card" className="px-5 py-3 text-sm font-medium border-b-2 transition-colors data-[state=active]:border-navy data-[state=active]:text-navy data-[state=inactive]:border-transparent data-[state=inactive]:text-steel hover:text-navy" style={{ fontFamily: "var(--font-montserrat)" }}>Card Appearance</Tabs.Trigger>
                    <Tabs.Trigger value="colours" className="px-5 py-3 text-sm font-medium border-b-2 transition-colors data-[state=active]:border-navy data-[state=active]:text-navy data-[state=inactive]:border-transparent data-[state=inactive]:text-steel hover:text-navy" style={{ fontFamily: "var(--font-montserrat)" }}>Colours</Tabs.Trigger>
                    <Tabs.Trigger value="typography" className="px-5 py-3 text-sm font-medium border-b-2 transition-colors data-[state=active]:border-navy data-[state=active]:text-navy data-[state=inactive]:border-transparent data-[state=inactive]:text-steel hover:text-navy" style={{ fontFamily: "var(--font-montserrat)" }}>Typography</Tabs.Trigger>
                    <Tabs.Trigger value="logos" className="px-5 py-3 text-sm font-medium border-b-2 transition-colors data-[state=active]:border-navy data-[state=active]:text-navy data-[state=inactive]:border-transparent data-[state=inactive]:text-steel hover:text-navy" style={{ fontFamily: "var(--font-montserrat)" }}>Logos</Tabs.Trigger>
                  </Tabs.List>

                  <Tabs.Content value="identity">
                    <BrandIdentityForm brand={linkedBrand!} onSaved={handleBrandSaved} />
                  </Tabs.Content>
                  <Tabs.Content value="card">
                    <BrandCardFields brand={linkedBrand!} onSaved={handleBrandSaved} />
                  </Tabs.Content>
                  <Tabs.Content value="colours">
                    <BrandColoursEditor brandId={overviewForm.brand_id} />
                  </Tabs.Content>
                  <Tabs.Content value="typography">
                    <BrandTypographyEditor brandId={overviewForm.brand_id} />
                  </Tabs.Content>
                  <Tabs.Content value="logos">
                    <BrandLogosEditor brandId={overviewForm.brand_id} />
                  </Tabs.Content>
                </Tabs.Root>
              </>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* SPEC & BRIEF TAB (clients + ventures)                            */}
        {/* ================================================================ */}
        {activeTab === "spec" && (
          <form onSubmit={handleSaveSpec}>
            <div className="space-y-6">
              {/* Project Brief */}
              <div className={cardClass} style={{ borderRadius: 0 }}>
                <h3 className="text-navy font-bold text-xs uppercase tracking-wider mb-6" style={{ fontFamily: "var(--font-inter)" }}>
                  Project Brief
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)", marginBottom: 0 }}>One-liner</label>
                      <span className="text-xs text-steel" style={{ fontFamily: "var(--font-montserrat)" }}>
                        {(specForm.one_liner ?? "").length} / 120
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={120}
                      value={specForm.one_liner ?? ""}
                      onChange={(e) => setSpecForm((p) => ({ ...p, one_liner: e.target.value }))}
                      placeholder="A short, punchy description…"
                      className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Description</label>
                    <textarea
                      rows={4}
                      value={specForm.description ?? ""}
                      onChange={(e) => setSpecForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Full project description…"
                      className="border border-linen focus:border-navy outline-none bg-transparent p-3 w-full text-ink text-sm resize-y"
                      style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Problem Being Solved</label>
                    <textarea
                      rows={3}
                      value={specForm.problem ?? ""}
                      onChange={(e) => setSpecForm((p) => ({ ...p, problem: e.target.value }))}
                      className="border border-linen focus:border-navy outline-none bg-transparent p-3 w-full text-ink text-sm resize-y"
                      style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                    />
                  </div>
                  <div>
                    <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Target Audience</label>
                    <input
                      type="text"
                      value={specForm.target_audience ?? ""}
                      onChange={(e) => setSpecForm((p) => ({ ...p, target_audience: e.target.value }))}
                      className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                    />
                  </div>
                  <div>
                    <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Launch Date</label>
                    <input
                      type="date"
                      value={specForm.launch_date ?? ""}
                      onChange={(e) => setSpecForm((p) => ({ ...p, launch_date: e.target.value }))}
                      className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                    />
                  </div>
                  <div>
                    <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Live URL</label>
                    <input
                      type="text"
                      value={specForm.live_url ?? ""}
                      onChange={(e) => setSpecForm((p) => ({ ...p, live_url: e.target.value }))}
                      placeholder="https://…"
                      className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                    />
                  </div>

                  {/* Key Features */}
                  <div className="sm:col-span-2">
                    <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Key Features</label>
                    <div className="space-y-2 mt-1">
                      {(specForm.key_features ?? []).map((feat, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-sm text-ink flex-1" style={{ fontFamily: "var(--font-montserrat)" }}>{feat}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...(specForm.key_features ?? [])];
                              updated.splice(i, 1);
                              setSpecForm((p) => ({ ...p, key_features: updated }));
                            }}
                            className="text-xs text-red-400 hover:text-red-600 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newFeature}
                          onChange={(e) => setNewFeature(e.target.value)}
                          placeholder="Add a feature…"
                          className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newFeature.trim()) {
                              e.preventDefault();
                              setSpecForm((p) => ({ ...p, key_features: [...(p.key_features ?? []), newFeature.trim()] }));
                              setNewFeature("");
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newFeature.trim()) {
                              setSpecForm((p) => ({ ...p, key_features: [...(p.key_features ?? []), newFeature.trim()] }));
                              setNewFeature("");
                            }
                          }}
                          className="px-3 py-1 border border-linen text-xs text-steel hover:border-navy hover:text-navy transition-colors shrink-0"
                          style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tech Stack */}
                  <div className="sm:col-span-2">
                    <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Tech Stack</label>
                    <div className="flex flex-wrap gap-2 mt-1 mb-2">
                      {(specForm.tech_stack ?? []).map((tag, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-linen text-ink"
                          style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...(specForm.tech_stack ?? [])];
                              updated.splice(i, 1);
                              setSpecForm((p) => ({ ...p, tech_stack: updated }));
                            }}
                            className="text-steel hover:text-red-500 ml-1"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTechTag}
                        onChange={(e) => setNewTechTag(e.target.value)}
                        placeholder="e.g. Next.js, Supabase…"
                        className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newTechTag.trim()) {
                            e.preventDefault();
                            setSpecForm((p) => ({ ...p, tech_stack: [...(p.tech_stack ?? []), newTechTag.trim()] }));
                            setNewTechTag("");
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newTechTag.trim()) {
                            setSpecForm((p) => ({ ...p, tech_stack: [...(p.tech_stack ?? []), newTechTag.trim()] }));
                            setNewTechTag("");
                          }
                        }}
                        className="px-3 py-1 border border-linen text-xs text-steel hover:border-navy hover:text-navy transition-colors shrink-0"
                        style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scope of Work */}
              <div className={cardClass} style={{ borderRadius: 0 }}>
                <h3 className="text-navy font-bold text-xs uppercase tracking-wider mb-6" style={{ fontFamily: "var(--font-inter)" }}>
                  Scope of Work
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Scope Status</label>
                    <select
                      value={specForm.scope_status ?? ""}
                      onChange={(e) => setSpecForm((p) => ({ ...p, scope_status: e.target.value as PartnerSpec["scope_status"] }))}
                      className={selectClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                    >
                      <option value="">— Select —</option>
                      {SCOPE_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Scope Items</label>
                    <div className="space-y-2 mt-1">
                      {(specForm.scope_items ?? []).map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={item.done}
                            onChange={() => {
                              const updated = [...(specForm.scope_items ?? [])];
                              updated[i] = { ...updated[i], done: !updated[i].done };
                              setSpecForm((p) => ({ ...p, scope_items: updated }));
                            }}
                            className="w-4 h-4 accent-navy shrink-0"
                            style={{ borderRadius: 0 }}
                          />
                          <span
                            className={`text-sm flex-1 ${item.done ? "line-through text-steel" : "text-ink"}`}
                            style={{ fontFamily: "var(--font-montserrat)" }}
                          >
                            {item.text}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...(specForm.scope_items ?? [])];
                              updated.splice(i, 1);
                              setSpecForm((p) => ({ ...p, scope_items: updated }));
                            }}
                            className="text-xs text-red-400 hover:text-red-600 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newScopeItem}
                          onChange={(e) => setNewScopeItem(e.target.value)}
                          placeholder="Add scope item…"
                          className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newScopeItem.trim()) {
                              e.preventDefault();
                              setSpecForm((p) => ({
                                ...p,
                                scope_items: [...(p.scope_items ?? []), { text: newScopeItem.trim(), done: false }],
                              }));
                              setNewScopeItem("");
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newScopeItem.trim()) {
                              setSpecForm((p) => ({
                                ...p,
                                scope_items: [...(p.scope_items ?? []), { text: newScopeItem.trim(), done: false }],
                              }));
                              setNewScopeItem("");
                            }
                          }}
                          className="px-3 py-1 border border-linen text-xs text-steel hover:border-navy hover:text-navy transition-colors shrink-0"
                          style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Links & Resources */}
              <div className={cardClass} style={{ borderRadius: 0 }}>
                <h3 className="text-navy font-bold text-xs uppercase tracking-wider mb-6" style={{ fontFamily: "var(--font-inter)" }}>
                  Links & Resources
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>GitHub URL</label>
                    <input
                      type="text"
                      value={specForm.github_url ?? ""}
                      onChange={(e) => setSpecForm((p) => ({ ...p, github_url: e.target.value }))}
                      placeholder="https://github.com/…"
                      className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                    />
                  </div>
                  <div>
                    <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Figma URL</label>
                    <input
                      type="text"
                      value={specForm.figma_url ?? ""}
                      onChange={(e) => setSpecForm((p) => ({ ...p, figma_url: e.target.value }))}
                      placeholder="https://figma.com/…"
                      className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                    />
                  </div>
                  <div>
                    <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Staging URL</label>
                    <input
                      type="text"
                      value={specForm.staging_url ?? ""}
                      onChange={(e) => setSpecForm((p) => ({ ...p, staging_url: e.target.value }))}
                      placeholder="https://staging.…"
                      className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                    />
                  </div>
                  <div>
                    <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Production URL</label>
                    <input
                      type="text"
                      value={specForm.production_url ?? ""}
                      onChange={(e) => setSpecForm((p) => ({ ...p, production_url: e.target.value }))}
                      placeholder="https://…"
                      className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                    />
                  </div>

                  {/* Other Links */}
                  <div className="sm:col-span-2">
                    <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Other Links</label>
                    <div className="space-y-2 mt-1">
                      {(specForm.other_links ?? []).map((link, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-sm text-ink" style={{ fontFamily: "var(--font-montserrat)" }}>
                            <strong>{link.label}:</strong>{" "}
                            <a href={link.url} target="_blank" rel="noopener noreferrer" className="underline text-steel hover:text-navy">
                              {link.url}
                            </a>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...(specForm.other_links ?? [])];
                              updated.splice(i, 1);
                              setSpecForm((p) => ({ ...p, other_links: updated }));
                            }}
                            className="text-xs text-red-400 hover:text-red-600 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={newOtherLink.label}
                            onChange={(e) => setNewOtherLink((p) => ({ ...p, label: e.target.value }))}
                            placeholder="Label"
                            className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={newOtherLink.url}
                            onChange={(e) => setNewOtherLink((p) => ({ ...p, url: e.target.value }))}
                            placeholder="https://…"
                            className={inputClass} style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (newOtherLink.label.trim() && newOtherLink.url.trim()) {
                              setSpecForm((p) => ({
                                ...p,
                                other_links: [...(p.other_links ?? []), { label: newOtherLink.label.trim(), url: newOtherLink.url.trim() }],
                              }));
                              setNewOtherLink({ label: "", url: "" });
                            }
                          }}
                          className="px-3 py-1 border border-linen text-xs text-steel hover:border-navy hover:text-navy transition-colors shrink-0"
                          style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Internal Notes */}
              <div className={cardClass} style={{ borderRadius: 0 }}>
                <h3 className="text-navy font-bold text-xs uppercase tracking-wider mb-6" style={{ fontFamily: "var(--font-inter)" }}>
                  Internal Notes
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Architecture Decisions</label>
                    <textarea
                      rows={4}
                      value={specForm.architecture_notes ?? ""}
                      onChange={(e) => setSpecForm((p) => ({ ...p, architecture_notes: e.target.value }))}
                      className="border border-linen focus:border-navy outline-none bg-transparent p-3 w-full text-ink text-sm resize-y"
                      style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                    />
                  </div>
                  <div>
                    <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Technical Debt</label>
                    <textarea
                      rows={4}
                      value={specForm.technical_debt ?? ""}
                      onChange={(e) => setSpecForm((p) => ({ ...p, technical_debt: e.target.value }))}
                      className="border border-linen focus:border-navy outline-none bg-transparent p-3 w-full text-ink text-sm resize-y"
                      style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                    />
                  </div>
                  <div>
                    <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Roadmap</label>
                    <textarea
                      rows={4}
                      value={specForm.roadmap ?? ""}
                      onChange={(e) => setSpecForm((p) => ({ ...p, roadmap: e.target.value }))}
                      className="border border-linen focus:border-navy outline-none bg-transparent p-3 w-full text-ink text-sm resize-y"
                      style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                    />
                  </div>
                </div>
              </div>

              {/* Save button */}
              {specMsg && (
                <p
                  className={`text-sm ${specMsg.type === "error" ? "text-red-500" : "text-green-600"}`}
                  style={{ fontFamily: "var(--font-montserrat)" }}
                >
                  {specMsg.text}
                </p>
              )}
              <div>
                <button
                  type="submit" disabled={savingSpec}
                  className={btnPrimary}
                  style={{ backgroundColor: "#1F2A38", fontFamily: "var(--font-inter)", borderRadius: 0 }}
                >
                  {savingSpec ? "Saving…" : "Save Spec & Brief"}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ================================================================ */}
        {/* BILLING TAB (ventures)                                           */}
        {/* ================================================================ */}
        {activeTab === "billing" && isVenture && (
          <form onSubmit={handleSaveBilling}>
            <div className={cardClass} style={{ borderRadius: 0 }}>
              <h3 className="text-navy font-bold text-xs uppercase tracking-wider mb-6" style={{ fontFamily: "var(--font-inter)" }}>
                Billing &amp; Banking Details
              </h3>
              <p className="text-xs text-steel mb-6" style={{ fontFamily: "var(--font-montserrat)" }}>
                These details appear on all invoices and documents issued from this venture.
                Leave a field blank to fall back to the company-wide settings.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Registration Number</label>
                  <input
                    type="text"
                    className={inputClass}
                    style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                    value={billingForm.reg_number}
                    onChange={(e) => setBillingForm((p) => ({ ...p, reg_number: e.target.value }))}
                    placeholder="e.g. 2024/012345/07"
                  />
                </div>

                <div />

                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Bank Name</label>
                  <input
                    type="text"
                    className={inputClass}
                    style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                    value={billingForm.bank_name}
                    onChange={(e) => setBillingForm((p) => ({ ...p, bank_name: e.target.value }))}
                    placeholder="e.g. First National Bank"
                  />
                </div>

                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Account Holder</label>
                  <input
                    type="text"
                    className={inputClass}
                    style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                    value={billingForm.bank_account_holder}
                    onChange={(e) => setBillingForm((p) => ({ ...p, bank_account_holder: e.target.value }))}
                  />
                </div>

                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Account Number</label>
                  <input
                    type="text"
                    className={inputClass}
                    style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                    value={billingForm.bank_account_number}
                    onChange={(e) => setBillingForm((p) => ({ ...p, bank_account_number: e.target.value }))}
                  />
                </div>

                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Branch Code</label>
                  <input
                    type="text"
                    className={inputClass}
                    style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                    value={billingForm.bank_branch_code}
                    onChange={(e) => setBillingForm((p) => ({ ...p, bank_branch_code: e.target.value }))}
                    placeholder="e.g. 250655"
                  />
                </div>

                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-montserrat)" }}>Account Type</label>
                  <select
                    className={inputClass}
                    style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
                    value={billingForm.bank_account_type}
                    onChange={(e) => setBillingForm((p) => ({ ...p, bank_account_type: e.target.value }))}
                  >
                    <option value="">— Select type —</option>
                    <option value="Current">Current</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Savings">Savings</option>
                    <option value="Business">Business</option>
                  </select>
                </div>
              </div>

              {billingMsg && (
                <div
                  className={`mt-4 text-sm px-4 py-3 border ${billingMsg.type === "error" ? "border-red-300 text-red-700 bg-red-50" : "border-green-300 text-green-700 bg-green-50"}`}
                  style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
                >
                  {billingMsg.text}
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={savingBilling}
                  className="px-6 py-2.5 bg-navy text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  style={{ fontFamily: "var(--font-inter)", borderRadius: 0 }}
                >
                  {savingBilling ? "Saving…" : "Save Billing Details"}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ================================================================ */}
        {/* EQUITY LEDGER TAB (ventures)                                     */}
        {/* ================================================================ */}
        {activeTab === "equity" && isVenture && (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Capital In",    value: formatAmount(totalCapitalIn) },
                { label: "Sweat Equity",  value: formatAmount(totalSweat) },
                { label: "Distributions", value: formatAmount(totalDistributions) },
                { label: "Net Loans",     value: formatAmount(netLoans) },
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

            {/* Add entry */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-navy font-bold text-sm uppercase tracking-wider" style={{ fontFamily: "var(--font-inter)" }}>
                  Ledger
                </h3>
                <button
                  type="button"
                  onClick={() => setShowEquityForm(!showEquityForm)}
                  className={btnPrimary}
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
                        className={btnPrimary}
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
      </main>
    </>
  );
}

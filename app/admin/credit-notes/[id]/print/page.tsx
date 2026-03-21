import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PrintButton from "@/components/admin/PrintButton";
import type { Document, Partner, CompanySettings } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

function formatZAR(amount: number): string {
  return `R ${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-ZA", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function CreditNotePrintPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: docData }, { data: settingsData }] = await Promise.all([
    supabase.from("documents").select("*, partner:partners!partner_id(*)").eq("id", id).single(),
    supabase.from("company_settings").select("*").single(),
  ]);

  if (!docData || docData.type !== "credit_note") notFound();

  const doc = docData as Document & { partner: Partner | null };
  const settings = settingsData as CompanySettings;

  let venture: Partner | null = null;
  if (doc.venture_id) {
    const { data } = await supabase.from("partners").select("*").eq("id", doc.venture_id).single();
    venture = data as Partner | null;
  }

  let headerColor = "#1F2A38";
  let logoUrl: string | null = null;
  let headingFont = "sans-serif";
  let bodyFont = "Georgia, 'Times New Roman', serif";

  if (venture?.brand_id) {
    const [{ data: brandData }, { data: logosData }, { data: coloursData }] = await Promise.all([
      supabase.from("brands").select("*").eq("id", venture.brand_id).single(),
      supabase.from("brand_logos").select("*").eq("brand_id", venture.brand_id),
      supabase.from("brand_colours").select("*").eq("brand_id", venture.brand_id),
    ]);
    const primaryColour = (coloursData ?? []).find((c: { role: string }) => c.role === "primary");
    headerColor = primaryColour?.hex ?? brandData?.card_bg_color ?? "#1F2A38";
    headingFont = brandData?.heading_font ?? "sans-serif";
    bodyFont = brandData?.body_font ?? "Georgia, 'Times New Roman', serif";
    const primaryLogo = (logosData ?? []).find((l: { variant: string }) => l.variant === "primary");
    if (primaryLogo) {
      logoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/brand-assets/${primaryLogo.storage_path}`;
    }
  }

  const fromEntity = venture
    ? { name: venture.company_name, address: venture.address, reg_number: venture.reg_number, vat_number: venture.vat_number, email: venture.email }
    : { name: settings.name, address: settings.address, reg_number: settings.reg_number, vat_number: settings.vat_number, email: settings.email };

  const bank = venture?.bank_name
    ? { bank_name: venture.bank_name, bank_account_holder: venture.bank_account_holder, bank_account_number: venture.bank_account_number, bank_branch_code: venture.bank_branch_code, bank_account_type: venture.bank_account_type }
    : { bank_name: settings.bank_name, bank_account_holder: settings.bank_account_holder, bank_account_number: settings.bank_account_number, bank_branch_code: settings.bank_branch_code, bank_account_type: settings.bank_account_type };

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 20mm; }
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        * { box-sizing: border-box; }
        body { font-family: ${bodyFont}; color: #1A1A1A; }
      `}</style>

      <div className="no-print" style={{ position: "fixed", top: 16, right: 16, zIndex: 50 }}>
        <PrintButton />
      </div>

      <div style={{ maxWidth: 794, margin: "0 auto", padding: "40px 48px", background: "#fff", minHeight: "100vh" }}>
        <div style={{ backgroundColor: headerColor, padding: "24px 32px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40, color: "#F3F2EE" }}>
          <div>
            {logoUrl ? (
              <img src={logoUrl} alt={fromEntity.name ?? ""} style={{ height: 48, marginBottom: 10, objectFit: "contain" }} />
            ) : (
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: headingFont, marginBottom: 8 }}>{fromEntity.name ?? "StaatWright"}</div>
            )}
            {fromEntity.address && <div style={{ fontSize: 12, opacity: 0.8, whiteSpace: "pre-line", lineHeight: 1.5 }}>{fromEntity.address}</div>}
            {fromEntity.reg_number && <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>Reg: {fromEntity.reg_number}</div>}
            {fromEntity.vat_number && <div style={{ fontSize: 11, opacity: 0.7 }}>VAT: {fromEntity.vat_number}</div>}
            {fromEntity.email && <div style={{ fontSize: 11, opacity: 0.7 }}>{fromEntity.email}</div>}
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, opacity: 0.7, fontFamily: "sans-serif", marginBottom: 4 }}>CREDIT NOTE</div>
            <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "sans-serif", marginBottom: 12 }}>{doc.number}</div>
            <div style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.8, fontFamily: "sans-serif" }}>
              <div>Issue Date: {formatDate(doc.issue_date)}</div>
              <div style={{ marginTop: 4 }}>
                <span style={{ backgroundColor: doc.status === "issued" ? "#f59e0b" : "#5C6E81", padding: "2px 10px", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#fff", fontWeight: 600 }}>
                  {doc.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {doc.partner && (
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontSize: 10, fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 2, color: "#5C6E81", marginBottom: 8, fontWeight: 600 }}>Issued To</div>
            <div style={{ backgroundColor: "#F3F2EE", padding: "16px 20px", fontSize: 13, lineHeight: 1.7 }}>
              <div style={{ fontWeight: 700, fontSize: 15, fontFamily: "sans-serif" }}>{doc.partner.company_name}</div>
              {doc.partner.contact_name && <div>{doc.partner.contact_name}</div>}
              {doc.partner.address && <div style={{ whiteSpace: "pre-line" }}>{doc.partner.address}</div>}
              {doc.partner.email && <div>{doc.partner.email}</div>}
              {doc.partner.vat_number && <div style={{ color: "#5C6E81", fontSize: 12 }}>VAT: {doc.partner.vat_number}</div>}
            </div>
          </div>
        )}

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 32, fontSize: 13 }}>
          <thead>
            <tr style={{ backgroundColor: headerColor, color: "#F3F2EE" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", fontFamily: "sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>DESCRIPTION</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontFamily: "sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: 1, width: 60 }}>QTY</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontFamily: "sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: 1, width: 100 }}>UNIT PRICE</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontFamily: "sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: 1, width: 60 }}>VAT %</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontFamily: "sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: 1, width: 100 }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {(doc.line_items ?? []).map((item, idx) =>
              item.type === "heading" ? (
                <tr key={item.id} style={{ backgroundColor: "#EAE4DC" }}>
                  <td colSpan={5} style={{ padding: "10px 12px", fontWeight: 700, fontFamily: "sans-serif", fontSize: 13, color: "#1F2A38" }}>{item.description}</td>
                </tr>
              ) : (
                <tr key={item.id} style={{ borderBottom: "1px solid #EAE4DC", backgroundColor: idx % 2 === 0 ? "#fff" : "#fafaf9" }}>
                  <td style={{ padding: "10px 12px", color: "#1A1A1A" }}>{item.description}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#5C6E81" }}>{item.qty ?? 0}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#5C6E81" }}>{formatZAR(item.unit_price ?? 0)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#5C6E81" }}>{item.vat_rate ?? 0}%</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#1A1A1A", fontWeight: 500 }}>{formatZAR(item.line_total ?? 0)}</td>
                </tr>
              )
            )}
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 40 }}>
          <div style={{ width: 280, fontFamily: "sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #EAE4DC", fontSize: 13, color: "#5C6E81" }}>
              <span>Subtotal</span><span>{formatZAR(doc.subtotal ?? 0)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #EAE4DC", fontSize: 13, color: "#5C6E81" }}>
              <span>VAT</span><span>{formatZAR(doc.vat_total ?? 0)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", fontSize: 16, fontWeight: 700, color: "#1F2A38" }}>
              <span>CREDIT AMOUNT</span><span>{formatZAR(doc.total ?? 0)}</span>
            </div>
          </div>
        </div>

        {doc.notes && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 2, color: "#5C6E81", marginBottom: 6, fontWeight: 600 }}>Notes</div>
            <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-line", color: "#1A1A1A" }}>{doc.notes}</div>
          </div>
        )}

        {doc.terms && (
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontSize: 10, fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 2, color: "#5C6E81", marginBottom: 6, fontWeight: 600 }}>Terms &amp; Conditions</div>
            <div style={{ fontSize: 12, lineHeight: 1.7, whiteSpace: "pre-line", color: "#5C6E81" }}>{doc.terms}</div>
          </div>
        )}

        {(bank.bank_name || bank.bank_account_number) && (
          <div style={{ borderTop: `2px solid ${headerColor}`, paddingTop: 20, marginTop: 24 }}>
            <div style={{ fontSize: 10, fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 2, color: "#5C6E81", marginBottom: 10, fontWeight: 600 }}>Banking Details</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px 24px", fontSize: 12 }}>
              {bank.bank_name && <div><div style={{ color: "#5C6E81", fontSize: 10, fontFamily: "sans-serif", marginBottom: 2 }}>Bank</div><div style={{ color: "#1A1A1A" }}>{bank.bank_name}</div></div>}
              {bank.bank_account_holder && <div><div style={{ color: "#5C6E81", fontSize: 10, fontFamily: "sans-serif", marginBottom: 2 }}>Account Holder</div><div style={{ color: "#1A1A1A" }}>{bank.bank_account_holder}</div></div>}
              {bank.bank_account_number && <div><div style={{ color: "#5C6E81", fontSize: 10, fontFamily: "sans-serif", marginBottom: 2 }}>Account Number</div><div style={{ color: "#1A1A1A" }}>{bank.bank_account_number}</div></div>}
              {bank.bank_branch_code && <div><div style={{ color: "#5C6E81", fontSize: 10, fontFamily: "sans-serif", marginBottom: 2 }}>Branch Code</div><div style={{ color: "#1A1A1A" }}>{bank.bank_branch_code}</div></div>}
              {bank.bank_account_type && <div><div style={{ color: "#5C6E81", fontSize: 10, fontFamily: "sans-serif", marginBottom: 2 }}>Account Type</div><div style={{ color: "#1A1A1A" }}>{bank.bank_account_type}</div></div>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

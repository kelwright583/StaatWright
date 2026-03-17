import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PrintButton from "@/components/admin/PrintButton";
import type { Document, Client, CompanySettings } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

function formatZAR(amount: number): string {
  return `R ${amount.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function CreditNotePrintPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: docData }, { data: settingsData }] = await Promise.all([
    supabase
      .from("documents")
      .select("*, client:clients(*)")
      .eq("id", id)
      .single(),
    supabase.from("company_settings").select("*").single(),
  ]);

  if (!docData || docData.type !== "credit_note") notFound();

  const doc = docData as Document & { client: Client | null };
  const settings = settingsData as CompanySettings;

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 20mm; }
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        * { box-sizing: border-box; }
        body { font-family: Georgia, 'Times New Roman', serif; color: #1A1A1A; }
      `}</style>

      {/* Print button */}
      <div
        className="no-print"
        style={{ position: "fixed", top: 16, right: 16, zIndex: 50 }}
      >
        <PrintButton />
      </div>

      {/* Document */}
      <div
        style={{
          maxWidth: 794,
          margin: "0 auto",
          padding: "40px 48px",
          background: "#fff",
          minHeight: "100vh",
        }}
      >
        {/* Header bar */}
        <div
          style={{
            backgroundColor: "#1F2A38",
            padding: "24px 32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 40,
            color: "#F3F2EE",
          }}
        >
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "sans-serif", marginBottom: 8 }}>
              {settings.name ?? "StaatWright"}
            </div>
            {settings.address && (
              <div style={{ fontSize: 12, opacity: 0.8, whiteSpace: "pre-line", lineHeight: 1.5 }}>
                {settings.address}
              </div>
            )}
            {settings.reg_number && (
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                Reg: {settings.reg_number}
              </div>
            )}
            {settings.vat_number && (
              <div style={{ fontSize: 11, opacity: 0.7 }}>VAT: {settings.vat_number}</div>
            )}
            {settings.email && (
              <div style={{ fontSize: 11, opacity: 0.7 }}>{settings.email}</div>
            )}
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, opacity: 0.7, fontFamily: "sans-serif", marginBottom: 4 }}>
              CREDIT NOTE
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "sans-serif", marginBottom: 12 }}>
              {doc.number}
            </div>
            <div style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.8, fontFamily: "sans-serif" }}>
              <div>Issue Date: {formatDate(doc.issue_date)}</div>
              <div style={{ marginTop: 4 }}>
                <span
                  style={{
                    backgroundColor: doc.status === "issued" ? "#f59e0b" : "#5C6E81",
                    padding: "2px 10px",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    color: "#fff",
                    fontWeight: 600,
                  }}
                >
                  {doc.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Credit to */}
        {doc.client && (
          <div style={{ marginBottom: 40 }}>
            <div
              style={{
                fontSize: 10,
                fontFamily: "sans-serif",
                textTransform: "uppercase",
                letterSpacing: 2,
                color: "#5C6E81",
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              Credit To
            </div>
            <div
              style={{
                backgroundColor: "#F3F2EE",
                padding: "16px 20px",
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 15, fontFamily: "sans-serif" }}>
                {doc.client.company_name}
              </div>
              {doc.client.contact_person && <div>{doc.client.contact_person}</div>}
              {doc.client.address && (
                <div style={{ whiteSpace: "pre-line" }}>{doc.client.address}</div>
              )}
              {doc.client.email && <div>{doc.client.email}</div>}
              {doc.client.vat_number && (
                <div style={{ color: "#5C6E81", fontSize: 12 }}>
                  VAT: {doc.client.vat_number}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Line items */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 32, fontSize: 13 }}>
          <thead>
            <tr style={{ backgroundColor: "#1F2A38", color: "#F3F2EE" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", fontFamily: "sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>
                DESCRIPTION
              </th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontFamily: "sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: 1, width: 60 }}>
                QTY
              </th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontFamily: "sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: 1, width: 100 }}>
                UNIT PRICE
              </th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontFamily: "sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: 1, width: 60 }}>
                VAT %
              </th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontFamily: "sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: 1, width: 100 }}>
                TOTAL
              </th>
            </tr>
          </thead>
          <tbody>
            {(doc.line_items ?? []).map((item, idx) =>
              item.type === "heading" ? (
                <tr key={item.id} style={{ backgroundColor: "#EAE4DC" }}>
                  <td
                    colSpan={5}
                    style={{
                      padding: "10px 12px",
                      fontWeight: 700,
                      fontFamily: "sans-serif",
                      fontSize: 13,
                      color: "#1F2A38",
                    }}
                  >
                    {item.description}
                  </td>
                </tr>
              ) : (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: "1px solid #EAE4DC",
                    backgroundColor: idx % 2 === 0 ? "#fff" : "#fafaf9",
                  }}
                >
                  <td style={{ padding: "10px 12px", color: "#1A1A1A" }}>
                    {item.description}
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#5C6E81" }}>
                    {item.qty ?? 0}
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#5C6E81" }}>
                    {formatZAR(item.unit_price ?? 0)}
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#5C6E81" }}>
                    {item.vat_rate ?? 0}%
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#1A1A1A", fontWeight: 500 }}>
                    {formatZAR(item.line_total ?? 0)}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 40 }}>
          <div style={{ width: 280, fontFamily: "sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #EAE4DC", fontSize: 13, color: "#5C6E81" }}>
              <span>Subtotal</span>
              <span>{formatZAR(doc.subtotal ?? 0)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #EAE4DC", fontSize: 13, color: "#5C6E81" }}>
              <span>VAT</span>
              <span>{formatZAR(doc.vat_total ?? 0)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", fontSize: 16, fontWeight: 700, color: "#1F2A38" }}>
              <span>CREDIT TOTAL</span>
              <span>{formatZAR(doc.total ?? 0)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {doc.notes && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 2, color: "#5C6E81", marginBottom: 6, fontWeight: 600 }}>
              Notes
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-line", color: "#1A1A1A" }}>
              {doc.notes}
            </div>
          </div>
        )}

        {/* Terms */}
        {doc.terms && (
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontSize: 10, fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 2, color: "#5C6E81", marginBottom: 6, fontWeight: 600 }}>
              Terms &amp; Conditions
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.7, whiteSpace: "pre-line", color: "#5C6E81" }}>
              {doc.terms}
            </div>
          </div>
        )}

        {/* Banking details */}
        {(settings.bank_name || settings.bank_account_number) && (
          <div style={{ borderTop: "2px solid #1F2A38", paddingTop: 20, marginTop: 24 }}>
            <div style={{ fontSize: 10, fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: 2, color: "#5C6E81", marginBottom: 10, fontWeight: 600 }}>
              Banking Details
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px 24px", fontSize: 12 }}>
              {settings.bank_name && (
                <div>
                  <div style={{ color: "#5C6E81", fontSize: 10, fontFamily: "sans-serif", marginBottom: 2 }}>Bank</div>
                  <div>{settings.bank_name}</div>
                </div>
              )}
              {settings.bank_account_holder && (
                <div>
                  <div style={{ color: "#5C6E81", fontSize: 10, fontFamily: "sans-serif", marginBottom: 2 }}>Account Holder</div>
                  <div>{settings.bank_account_holder}</div>
                </div>
              )}
              {settings.bank_account_number && (
                <div>
                  <div style={{ color: "#5C6E81", fontSize: 10, fontFamily: "sans-serif", marginBottom: 2 }}>Account Number</div>
                  <div>{settings.bank_account_number}</div>
                </div>
              )}
              {settings.bank_branch_code && (
                <div>
                  <div style={{ color: "#5C6E81", fontSize: 10, fontFamily: "sans-serif", marginBottom: 2 }}>Branch Code</div>
                  <div>{settings.bank_branch_code}</div>
                </div>
              )}
              {settings.bank_account_type && (
                <div>
                  <div style={{ color: "#5C6E81", fontSize: 10, fontFamily: "sans-serif", marginBottom: 2 }}>Account Type</div>
                  <div>{settings.bank_account_type}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

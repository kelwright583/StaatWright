import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import ExcelJS from "exceljs";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const asAt = searchParams.get("asAt") ?? new Date().toISOString().slice(0, 10);

  // ── AR: outstanding invoices ───────────────────────────────────────────────
  const { data: allInvoices } = await supabase
    .from("documents")
    .select("id, total")
    .eq("type", "invoice")
    .not("status", "eq", "paid")
    .not("status", "eq", "cancelled")
    .lte("created_at", asAt + "T23:59:59");

  const invoiceIds = (allInvoices ?? []).map((i) => i.id);
  let paymentMap: Record<string, number> = {};
  let creditMap: Record<string, number> = {};

  if (invoiceIds.length > 0) {
    const { data: pmts } = await supabase
      .from("invoice_payments")
      .select("document_id, amount")
      .in("document_id", invoiceIds)
      .lte("payment_date", asAt);

    for (const p of pmts ?? []) {
      paymentMap[p.document_id] = (paymentMap[p.document_id] ?? 0) + (p.amount ?? 0);
    }

    const { data: cns } = await supabase
      .from("documents")
      .select("linked_document_id, total")
      .eq("type", "credit_note")
      .in("linked_document_id", invoiceIds)
      .lte("created_at", asAt + "T23:59:59");

    for (const cn of cns ?? []) {
      if (cn.linked_document_id) {
        creditMap[cn.linked_document_id] = (creditMap[cn.linked_document_id] ?? 0) + (cn.total ?? 0);
      }
    }
  }

  const totalAR = (allInvoices ?? []).reduce((s, inv) => {
    return s + Math.max(0, (inv.total ?? 0) - (paymentMap[inv.id] ?? 0) - (creditMap[inv.id] ?? 0));
  }, 0);

  // ── Cash estimate ──────────────────────────────────────────────────────────
  const { data: allPayments } = await supabase
    .from("invoice_payments")
    .select("amount")
    .lte("payment_date", asAt);
  const totalPaymentsReceived = (allPayments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);

  const { data: allExpenses } = await supabase
    .from("expenses")
    .select("amount_incl_vat")
    .lte("date", asAt);
  const totalExpensesAll = (allExpenses ?? []).reduce((s, e) => s + (e.amount_incl_vat ?? 0), 0);
  const cashEstimate = Math.max(0, totalPaymentsReceived - totalExpensesAll);

  // ── Accounts payable (last 30 days proxy) ─────────────────────────────────
  const thirtyAgo = new Date(asAt);
  thirtyAgo.setDate(thirtyAgo.getDate() - 30);
  const { data: recentExp } = await supabase
    .from("expenses")
    .select("amount_incl_vat")
    .gte("date", thirtyAgo.toISOString().slice(0, 10))
    .lte("date", asAt);
  const recentExpenses = (recentExp ?? []).reduce((s, e) => s + (e.amount_incl_vat ?? 0), 0);

  // ── VAT payable ────────────────────────────────────────────────────────────
  const vatPayable = totalAR * (15 / 115);

  // ── Equity ledger ──────────────────────────────────────────────────────────
  const { data: equityData } = await supabase
    .from("equity_ledger")
    .select("entry_type, amount")
    .lte("date", asAt);

  let capital = 0, sweat = 0, loans = 0;
  for (const e of equityData ?? []) {
    if (e.entry_type === "capital_injection") capital += e.amount ?? 0;
    if (e.entry_type === "sweat_equity") sweat += e.amount ?? 0;
    if (e.entry_type === "loan_in") loans += e.amount ?? 0;
    if (e.entry_type === "loan_repayment") loans -= e.amount ?? 0;
  }
  const loansNet = Math.max(0, loans);

  // ── Drawings ───────────────────────────────────────────────────────────────
  const { data: drawingsData } = await supabase
    .from("drawings")
    .select("amount")
    .lte("date", asAt);
  const drawings = (drawingsData ?? []).reduce((s, d) => s + (d.amount ?? 0), 0);

  // ── Retained earnings ──────────────────────────────────────────────────────
  const { data: paidInvoices } = await supabase
    .from("documents")
    .select("total")
    .eq("type", "invoice")
    .eq("status", "paid")
    .lte("created_at", asAt + "T23:59:59");
  const totalPaidInvoices = (paidInvoices ?? []).reduce((s, i) => s + (i.total ?? 0), 0);
  const retainedEarnings = totalPaidInvoices - totalExpensesAll;

  // ── Computed totals ────────────────────────────────────────────────────────
  const totalCurrentAssets = totalAR + cashEstimate;
  const totalAssets = totalCurrentAssets;
  const totalLiabilities = recentExpenses + vatPayable + loansNet;
  const totalEquity = capital + sweat + retainedEarnings - drawings;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
  const diff = Math.abs(totalAssets - totalLiabilitiesAndEquity);
  const balanced = totalAssets === 0 || diff / Math.max(totalAssets, 1) <= 0.10;

  // ── Workbook ───────────────────────────────────────────────────────────────
  const NAVY = "FF1F2A38";
  const WHITE = "FFFFFFFF";
  const LINEN = "FFEAE4DC";
  const zarFmt = "R #,##0.00";

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "StaatWright";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Balance Sheet");
  sheet.columns = [
    { key: "label", width: 42 },
    { key: "amount", width: 22 },
    { key: "note", width: 50 },
  ];

  function addTitle(text: string) {
    const r = sheet.addRow([text, "", ""]);
    r.getCell(1).font = { bold: true, size: 14, color: { argb: NAVY } };
    r.height = 22;
    return r;
  }

  function addSubtitle(text: string) {
    const r = sheet.addRow([text, "", ""]);
    r.getCell(1).font = { size: 10, color: { argb: "FF5C6E81" } };
    return r;
  }

  function addSection(label: string) {
    const r = sheet.addRow([label, "", ""]);
    r.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
      cell.font = { bold: true, color: { argb: WHITE }, size: 11 };
    });
    r.height = 18;
    return r;
  }

  function addSubSection(label: string) {
    const r = sheet.addRow([label, "", ""]);
    r.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LINEN } };
      cell.font = { bold: true, size: 10 };
    });
    return r;
  }

  function addLineItem(label: string, value: number, note = "", indent = true) {
    const r = sheet.addRow([indent ? `    ${label}` : label, value, note]);
    r.getCell(2).numFmt = zarFmt;
    r.getCell(3).font = { italic: true, size: 9, color: { argb: "FF5C6E81" } };
    return r;
  }

  function addTotal(label: string, value: number) {
    const r = sheet.addRow([label, value, ""]);
    r.getCell(1).font = { bold: true, size: 11 };
    r.getCell(2).font = { bold: true, size: 11 };
    r.getCell(2).numFmt = zarFmt;
    r.getCell(2).border = {
      top: { style: "thin", color: { argb: NAVY } },
      bottom: { style: "double", color: { argb: NAVY } },
    };
    return r;
  }

  function addGrandTotal(label: string, value: number) {
    const r = sheet.addRow([label, value, ""]);
    r.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
      cell.font = { bold: true, color: { argb: WHITE }, size: 12 };
    });
    r.getCell(2).numFmt = zarFmt;
    r.height = 20;
    return r;
  }

  function addBlank() {
    sheet.addRow(["", "", ""]);
  }

  // Title
  addTitle("Balance Sheet");
  addSubtitle(`As at: ${asAt}`);
  addSubtitle(`Balance check: ${balanced ? "BALANCED (within 10%)" : "DISCREPANCY DETECTED"} — Assets: ${totalAssets.toFixed(2)} / L+E: ${totalLiabilitiesAndEquity.toFixed(2)}`);
  addBlank();

  // ASSETS
  addSection("ASSETS");
  addSubSection("Current Assets");
  addLineItem("Accounts Receivable", totalAR, "Outstanding invoice balances (total - payments - credit notes)");
  addLineItem("Cash / Bank (estimated)", cashEstimate, "All payments received minus all expenses — connect bank for accuracy");
  addTotal("Total Current Assets", totalCurrentAssets);
  addBlank();
  addSubSection("Fixed Assets");
  addLineItem("Fixed assets — not tracked", 0, "Add fixed asset tracking to include property, equipment, vehicles");
  addTotal("Total Fixed Assets", 0);
  addBlank();
  addGrandTotal("TOTAL ASSETS", totalAssets);
  addBlank();

  // LIABILITIES
  addSection("LIABILITIES");
  addSubSection("Current Liabilities");
  addLineItem("Accounts Payable (approx.)", recentExpenses, "Total expenses in last 30 days — approximation");
  addLineItem("VAT Payable (estimated)", vatPayable, "15/115 of outstanding AR — estimate only");
  addLineItem("Loans / Shareholder Loans", loansNet, "Net of loan_in minus loan_repayment entries in equity ledger");
  addTotal("Total Current Liabilities", totalLiabilities);
  addBlank();
  addGrandTotal("TOTAL LIABILITIES", totalLiabilities);
  addBlank();

  // EQUITY
  addSection("EQUITY");
  addLineItem("Owners' Capital", capital, "Sum of capital_injection entries in equity ledger");
  addLineItem("Sweat Equity", sweat, "Sum of sweat_equity entries in equity ledger");
  addLineItem("Retained Earnings", retainedEarnings, "Total paid invoices minus total expenses (approximate)");
  addLineItem("Drawings (deducted)", -drawings, "Total drawings by all owners");
  addTotal("Total Equity", totalEquity);
  addBlank();
  addGrandTotal("TOTAL LIABILITIES + EQUITY", totalLiabilitiesAndEquity);
  addBlank();

  // Disclaimer
  const discRow = sheet.addRow(["NOTE: This balance sheet is an approximation based on available data. Connect bank accounts and journal entries for IFRS-compliant reporting.", "", ""]);
  discRow.getCell(1).font = { italic: true, size: 9, color: { argb: "FF5C6E81" } };

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `staatwright-balance-sheet-${asAt}.xlsx`;

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return new Response("Missing from/to query parameters", { status: 400 });
  }

  // Fetch paid invoices (income)
  const { data: invoices, error: invErr } = await supabase
    .from("documents")
    .select("number, issue_date, subtotal, vat_total, total, partners(company_name)")
    .eq("type", "invoice")
    .eq("status", "paid")
    .gte("issue_date", from)
    .lte("issue_date", to)
    .order("issue_date", { ascending: true });

  if (invErr) return new Response(invErr.message, { status: 500 });

  // Fetch expenses
  const { data: expenses, error: expErr } = await supabase
    .from("expenses")
    .select("date, description, category, amount_excl_vat, vat_amount, amount_incl_vat, notes")
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true });

  if (expErr) return new Response(expErr.message, { status: 500 });

  // ── Totals ────────────────────────────────────────────────────────────────────
  const totalIncome = (invoices ?? []).reduce((s, r) => s + (r.subtotal ?? 0), 0);

  // Group expenses by category
  const expenseByCategory: Record<string, number> = {};
  for (const exp of expenses ?? []) {
    const cat = exp.category ?? "Uncategorised";
    expenseByCategory[cat] = (expenseByCategory[cat] ?? 0) + (exp.amount_excl_vat ?? 0);
  }
  const totalExpenses = Object.values(expenseByCategory).reduce((a, b) => a + b, 0);
  const netProfit = totalIncome - totalExpenses;

  // ── Workbook ─────────────────────────────────────────────────────────────────
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "StaatWright";
  workbook.created = new Date();

  const zarFmt = 'R #,##0.00';
  const dateFmt = 'DD MMM YYYY';

  const NAVY = "FF1F2A38";
  const WHITE = "FFFFFFFF";
  const LINEN = "FFEAE4DC";
  const CREAM = "FFF3F2EE";

  function styleHeader(row: ExcelJS.Row) {
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
      cell.font = { color: { argb: WHITE }, bold: true, size: 11 };
      cell.alignment = { vertical: "middle", horizontal: "left" };
    });
    row.height = 20;
  }

  function styleSection(row: ExcelJS.Row, label: string) {
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LINEN } };
      cell.font = { bold: true, size: 11 };
    });
    void label;
  }

  // ── Sheet 1: Summary ─────────────────────────────────────────────────────────
  const summary = workbook.addWorksheet("Summary");
  summary.columns = [
    { key: "label", width: 36 },
    { key: "amount", width: 20 },
  ];

  // Title
  const titleRow = summary.addRow(["Profit & Loss Statement", ""]);
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: NAVY } };
  titleRow.getCell(1).style = { font: { bold: true, size: 14 } };

  const periodRow = summary.addRow([`Period: ${from} to ${to}`, ""]);
  periodRow.getCell(1).font = { color: { argb: "FF5C6E81" }, size: 10 };
  summary.addRow(["", ""]);

  // INCOME section
  const incomeHeader = summary.addRow(["INCOME", ""]);
  styleSection(incomeHeader, "INCOME");

  const incomeRow = summary.addRow(["Revenue from paid invoices (excl. VAT)", totalIncome]);
  incomeRow.getCell(2).numFmt = zarFmt;

  const incomeTotalRow = summary.addRow(["Total Income", totalIncome]);
  incomeTotalRow.getCell(1).font = { bold: true };
  incomeTotalRow.getCell(2).numFmt = zarFmt;
  incomeTotalRow.getCell(2).font = { bold: true };
  summary.addRow(["", ""]);

  // EXPENSES section
  const expHeader = summary.addRow(["EXPENSES", ""]);
  styleSection(expHeader, "EXPENSES");

  for (const [cat, amt] of Object.entries(expenseByCategory).sort()) {
    const r = summary.addRow([cat, amt]);
    r.getCell(2).numFmt = zarFmt;
  }

  const expTotalRow = summary.addRow(["Total Expenses", totalExpenses]);
  expTotalRow.getCell(1).font = { bold: true };
  expTotalRow.getCell(2).numFmt = zarFmt;
  expTotalRow.getCell(2).font = { bold: true };
  summary.addRow(["", ""]);

  // NET PROFIT
  const netRow = summary.addRow(["NET PROFIT", netProfit]);
  netRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.font = { color: { argb: WHITE }, bold: true, size: 12 };
  });
  netRow.getCell(2).numFmt = zarFmt;

  // ── Sheet 2: Detail ──────────────────────────────────────────────────────────
  const detail = workbook.addWorksheet("Detail");

  // Income section
  detail.addRow(["INCOME — Paid Invoices"]).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.font = { color: { argb: WHITE }, bold: true, size: 12 };
  });

  const invHeaders = detail.addRow(["Invoice #", "Partner", "Issue Date", "Subtotal (ZAR)", "VAT (ZAR)", "Total (ZAR)"]);
  styleHeader(invHeaders);
  detail.getColumn(1).width = 16;
  detail.getColumn(2).width = 30;
  detail.getColumn(3).width = 16;
  detail.getColumn(4).width = 18;
  detail.getColumn(5).width = 16;
  detail.getColumn(6).width = 16;

  for (const inv of invoices ?? []) {
    const partner = (inv.partners as { company_name?: string } | null)?.company_name ?? "";
    const r = detail.addRow([
      inv.number,
      partner,
      inv.issue_date ? new Date(inv.issue_date) : null,
      inv.subtotal ?? 0,
      inv.vat_total ?? 0,
      inv.total ?? 0,
    ]);
    r.getCell(3).numFmt = dateFmt;
    r.getCell(4).numFmt = zarFmt;
    r.getCell(5).numFmt = zarFmt;
    r.getCell(6).numFmt = zarFmt;

    if (r.number % 2 === 0) {
      r.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CREAM } };
      });
    }
  }

  const invTotal = detail.addRow(["", "TOTAL INCOME", "", totalIncome, "", ""]);
  invTotal.getCell(2).font = { bold: true };
  invTotal.getCell(4).numFmt = zarFmt;
  invTotal.getCell(4).font = { bold: true };
  detail.addRow(["", "", "", "", "", ""]);

  // Expenses section
  detail.addRow(["EXPENSES"]).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.font = { color: { argb: WHITE }, bold: true, size: 12 };
  });

  const expHeaders = detail.addRow(["Date", "Description", "Category", "Excl VAT", "VAT", "Incl VAT"]);
  styleHeader(expHeaders);

  for (const exp of expenses ?? []) {
    const r = detail.addRow([
      exp.date ? new Date(exp.date) : null,
      exp.description ?? "",
      exp.category ?? "",
      exp.amount_excl_vat ?? 0,
      exp.vat_amount ?? 0,
      exp.amount_incl_vat ?? 0,
    ]);
    r.getCell(1).numFmt = dateFmt;
    r.getCell(4).numFmt = zarFmt;
    r.getCell(5).numFmt = zarFmt;
    r.getCell(6).numFmt = zarFmt;

    if (r.number % 2 === 0) {
      r.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CREAM } };
      });
    }
  }

  const expTotal = detail.addRow(["", "TOTAL EXPENSES", "", totalExpenses, "", ""]);
  expTotal.getCell(2).font = { bold: true };
  expTotal.getCell(4).numFmt = zarFmt;
  expTotal.getCell(4).font = { bold: true };
  detail.addRow(["", "", "", "", "", ""]);

  // Net Profit row
  const netDetailRow = detail.addRow(["", "NET PROFIT", "", netProfit, "", ""]);
  netDetailRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.font = { color: { argb: WHITE }, bold: true, size: 12 };
  });
  netDetailRow.getCell(4).numFmt = zarFmt;

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `staatwright-pl-${from}-${to}.xlsx`;

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

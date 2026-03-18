import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import ExcelJS from "exceljs";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDocVat(row: {
  total: number | null;
  vat_amount: number | null;
  vat_total: number | null;
}): { excl: number; vatAmt: number; incl: number } {
  const incl = row.total ?? 0;
  const vatAmt = row.vat_amount ?? row.vat_total ?? 0;
  return { excl: incl - vatAmt, vatAmt, incl };
}

function getExpenseVat(row: {
  amount_incl_vat: number | null;
  vat_amount: number | null;
  vat_rate: number | null;
}): { excl: number; vatAmt: number; incl: number } {
  const incl = row.amount_incl_vat ?? 0;
  let vatAmt = row.vat_amount ?? 0;
  if (!vatAmt && incl) {
    const rate = row.vat_rate ?? 0.15;
    vatAmt = rate > 0 ? (incl * rate) / (1 + rate) : 0;
  }
  return { excl: incl - vatAmt, vatAmt, incl };
}

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2A38" } };
    cell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 11 };
    cell.alignment = { vertical: "middle", horizontal: "left" };
  });
  row.height = 20;
}

function styleAltRow(row: ExcelJS.Row) {
  if (row.number % 2 === 0) {
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F2EE" } };
    });
  }
}

function styleTotalsRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAE4DC" } };
    cell.font = { bold: true };
  });
}

const ZAR_FMT = 'R #,##0.00;[Red]-R #,##0.00';
const DATE_FMT = 'DD MMM YYYY';

// ─── Route ────────────────────────────────────────────────────────────────────

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

  // ── Fetch data ─────────────────────────────────────────────────────────────

  const [{ data: invoiceRows, error: invErr }, { data: expenseRows, error: expErr }] =
    await Promise.all([
      supabase
        .from("documents")
        .select(
          "number, issue_date, status, subtotal, vat_total, total, vat_amount, vat_rate, partner:partners(company_name)"
        )
        .eq("type", "invoice")
        .in("status", ["paid", "partial"])
        .gte("issue_date", from)
        .lte("issue_date", to)
        .order("issue_date", { ascending: true }),
      supabase
        .from("expenses")
        .select("date, description, category, amount_incl_vat, vat_amount, vat_rate")
        .gte("date", from)
        .lte("date", to)
        .order("date", { ascending: true }),
    ]);

  if (invErr) return new Response(invErr.message, { status: 500 });
  if (expErr) return new Response(expErr.message, { status: 500 });

  // ── Build workbook ─────────────────────────────────────────────────────────

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "StaatWright";
  workbook.created = new Date();

  // ── Sheet 1: Output VAT ────────────────────────────────────────────────────

  const outputSheet = workbook.addWorksheet("Output VAT");
  outputSheet.columns = [
    { header: "Invoice #", key: "number", width: 16 },
    { header: "Client", key: "client", width: 32 },
    { header: "Date", key: "date", width: 16 },
    { header: "Excl. VAT", key: "excl", width: 18 },
    { header: "VAT (15%)", key: "vat", width: 18 },
    { header: "Total Incl. VAT", key: "incl", width: 20 },
  ];

  styleHeader(outputSheet.getRow(1));

  let outExclTotal = 0;
  let outVatTotal = 0;
  let outInclTotal = 0;

  for (const row of invoiceRows ?? []) {
    const { excl, vatAmt, incl } = getDocVat(
      row as { total: number | null; vat_amount: number | null; vat_total: number | null }
    );
    const partner = (row.partner as { company_name?: string } | null)?.company_name ?? "";
    const added = outputSheet.addRow({
      number: row.number,
      client: partner,
      date: row.issue_date ? new Date(row.issue_date) : null,
      excl,
      vat: vatAmt,
      incl,
    });
    added.getCell("date").numFmt = DATE_FMT;
    added.getCell("excl").numFmt = ZAR_FMT;
    added.getCell("vat").numFmt = ZAR_FMT;
    added.getCell("incl").numFmt = ZAR_FMT;
    styleAltRow(added);
    outExclTotal += excl;
    outVatTotal += vatAmt;
    outInclTotal += incl;
  }

  // Totals row
  const outTotalsRow = outputSheet.addRow({
    number: "TOTAL",
    client: "",
    date: null,
    excl: outExclTotal,
    vat: outVatTotal,
    incl: outInclTotal,
  });
  outTotalsRow.getCell("excl").numFmt = ZAR_FMT;
  outTotalsRow.getCell("vat").numFmt = ZAR_FMT;
  outTotalsRow.getCell("incl").numFmt = ZAR_FMT;
  styleTotalsRow(outTotalsRow);

  // ── Sheet 2: Input VAT ─────────────────────────────────────────────────────

  const inputSheet = workbook.addWorksheet("Input VAT");
  inputSheet.columns = [
    { header: "Date", key: "date", width: 16 },
    { header: "Supplier / Description", key: "description", width: 36 },
    { header: "Category", key: "category", width: 22 },
    { header: "Excl. VAT", key: "excl", width: 18 },
    { header: "VAT (15%)", key: "vat", width: 18 },
    { header: "Total Incl. VAT", key: "incl", width: 20 },
  ];

  styleHeader(inputSheet.getRow(1));

  let inExclTotal = 0;
  let inVatTotal = 0;
  let inInclTotal = 0;

  for (const row of expenseRows ?? []) {
    const { excl, vatAmt, incl } = getExpenseVat(
      row as { amount_incl_vat: number | null; vat_amount: number | null; vat_rate: number | null }
    );
    const added = inputSheet.addRow({
      date: row.date ? new Date(row.date) : null,
      description: row.description,
      category: row.category ?? "",
      excl,
      vat: vatAmt,
      incl,
    });
    added.getCell("date").numFmt = DATE_FMT;
    added.getCell("excl").numFmt = ZAR_FMT;
    added.getCell("vat").numFmt = ZAR_FMT;
    added.getCell("incl").numFmt = ZAR_FMT;
    styleAltRow(added);
    inExclTotal += excl;
    inVatTotal += vatAmt;
    inInclTotal += incl;
  }

  const inTotalsRow = inputSheet.addRow({
    date: null,
    description: "TOTAL",
    category: "",
    excl: inExclTotal,
    vat: inVatTotal,
    incl: inInclTotal,
  });
  inTotalsRow.getCell("excl").numFmt = ZAR_FMT;
  inTotalsRow.getCell("vat").numFmt = ZAR_FMT;
  inTotalsRow.getCell("incl").numFmt = ZAR_FMT;
  styleTotalsRow(inTotalsRow);

  // ── Sheet 3: Summary ───────────────────────────────────────────────────────

  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.columns = [
    { header: "Item", key: "item", width: 36 },
    { header: "Amount (ZAR)", key: "amount", width: 20 },
  ];

  styleHeader(summarySheet.getRow(1));

  const netVat = outVatTotal - inVatTotal;

  const summaryData = [
    { item: "Period", amount: `${from} to ${to}` },
    { item: "Output VAT (collected from clients)", amount: outVatTotal },
    { item: "Input VAT (claimable on expenses)", amount: inVatTotal },
    { item: netVat >= 0 ? "Net VAT Payable to SARS" : "VAT Refund Due", amount: Math.abs(netVat) },
  ];

  for (const [i, row] of summaryData.entries()) {
    const added = summarySheet.addRow(row);
    if (i > 0) {
      // numeric rows
      added.getCell("amount").numFmt = ZAR_FMT;
    }
    if (i === summaryData.length - 1) {
      styleTotalsRow(added);
    }
  }

  // ── Respond ────────────────────────────────────────────────────────────────

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `vat-report-${from}-to-${to}.xlsx`;

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

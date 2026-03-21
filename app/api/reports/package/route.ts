import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import ExcelJS from "exceljs";

const NAVY  = "FF1F2A38";
const WHITE = "FFFFFFFF";
const CREAM = "FFF3F2EE";
const LINEN = "FFEAE4DC";
const zarFmt  = "R #,##0.00";
const dateFmt = "DD MMM YYYY";

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.font = { color: { argb: WHITE }, bold: true, size: 11 };
    cell.alignment = { vertical: "middle", horizontal: "left" };
  });
  row.height = 20;
}

function stripeRow(row: ExcelJS.Row) {
  if (row.number % 2 === 0) {
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CREAM } };
    });
  }
}

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
  const from = searchParams.get("from");
  const to   = searchParams.get("to");
  if (!from || !to) return new Response("Missing from/to query parameters", { status: 400 });

  // ── Fetch all data in parallel ─────────────────────────────────────────────

  const [invResult, expResult, drawResult] = await Promise.all([
    supabase
      .from("documents")
      .select("number, issue_date, due_date, status, subtotal, vat_total, total, currency, zar_equivalent, partners(company_name)")
      .eq("type", "invoice")
      .gte("issue_date", from)
      .lte("issue_date", to)
      .order("issue_date", { ascending: true }),

    supabase
      .from("expenses")
      .select("date, description, category, amount_excl_vat, vat_amount, amount_incl_vat, notes")
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending: true }),

    supabase
      .from("drawings")
      .select("date, amount, method, reference, notes, owner_settings(display_name)")
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending: true }),
  ]);

  if (invResult.error)  return new Response(invResult.error.message,  { status: 500 });
  if (expResult.error)  return new Response(expResult.error.message,  { status: 500 });
  if (drawResult.error) return new Response(drawResult.error.message, { status: 500 });

  const invoices  = invResult.data  ?? [];
  const expenses  = expResult.data  ?? [];
  const drawings  = drawResult.data ?? [];

  // ── P&L summary values ────────────────────────────────────────────────────

  const paidInvoices = invoices.filter((i) => i.status === "paid" || i.status === "partially_paid");
  const totalIncome  = paidInvoices.reduce((s, r) => {
    const isForex = r.currency && r.currency !== "ZAR";
    return s + (isForex ? (r.zar_equivalent ?? r.subtotal ?? 0) : (r.subtotal ?? 0));
  }, 0);

  const expByCat: Record<string, number> = {};
  for (const e of expenses) {
    const cat = e.category ?? "Uncategorised";
    expByCat[cat] = (expByCat[cat] ?? 0) + (e.amount_excl_vat ?? 0);
  }
  const totalExpenses = Object.values(expByCat).reduce((a, b) => a + b, 0);
  const netProfit     = totalIncome - totalExpenses;
  const totalDrawings = drawings.reduce((s, d) => s + (d.amount ?? 0), 0);

  // ── Build workbook ────────────────────────────────────────────────────────

  const workbook     = new ExcelJS.Workbook();
  workbook.creator   = "StaatWright";
  workbook.created   = new Date();

  // ── Sheet 1: P&L Summary ──────────────────────────────────────────────────

  const plSheet = workbook.addWorksheet("P&L Summary");
  plSheet.columns = [{ key: "label", width: 40 }, { key: "amount", width: 20 }];

  const titleRow = plSheet.addRow([`Profit & Loss — ${from} to ${to}`, ""]);
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: NAVY } };
  plSheet.addRow(["", ""]);

  const incSecRow = plSheet.addRow(["INCOME", ""]);
  incSecRow.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LINEN } };
    c.font = { bold: true };
  });

  const incRow = plSheet.addRow(["Revenue from paid invoices (excl. VAT)", totalIncome]);
  incRow.getCell(2).numFmt = zarFmt;

  const incTotalRow = plSheet.addRow(["Total Income", totalIncome]);
  incTotalRow.getCell(1).font = { bold: true };
  incTotalRow.getCell(2).numFmt = zarFmt;
  incTotalRow.getCell(2).font  = { bold: true };
  plSheet.addRow(["", ""]);

  const expSecRow = plSheet.addRow(["EXPENSES", ""]);
  expSecRow.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LINEN } };
    c.font = { bold: true };
  });

  for (const [cat, amt] of Object.entries(expByCat).sort()) {
    const r = plSheet.addRow([cat, amt]);
    r.getCell(2).numFmt = zarFmt;
  }

  const expTotalRow = plSheet.addRow(["Total Expenses", totalExpenses]);
  expTotalRow.getCell(1).font = { bold: true };
  expTotalRow.getCell(2).numFmt = zarFmt;
  expTotalRow.getCell(2).font  = { bold: true };
  plSheet.addRow(["", ""]);

  const netRow = plSheet.addRow(["NET PROFIT", netProfit]);
  netRow.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    c.font = { color: { argb: WHITE }, bold: true, size: 12 };
  });
  netRow.getCell(2).numFmt = zarFmt;

  plSheet.addRow(["", ""]);
  const drawSumRow = plSheet.addRow(["Total Drawings (period)", totalDrawings]);
  drawSumRow.getCell(1).font = { italic: true };
  drawSumRow.getCell(2).numFmt = zarFmt;
  drawSumRow.getCell(2).font  = { italic: true };

  // ── Sheet 2: Invoice Register ─────────────────────────────────────────────

  const invSheet = workbook.addWorksheet("Invoice Register");
  invSheet.columns = [
    { header: "Invoice #",     key: "number",     width: 16 },
    { header: "Partner",       key: "partner",    width: 30 },
    { header: "Issue Date",    key: "issue_date", width: 16 },
    { header: "Due Date",      key: "due_date",   width: 16 },
    { header: "Status",        key: "status",     width: 16 },
    { header: "Subtotal (ZAR)",key: "subtotal",   width: 18 },
    { header: "VAT (ZAR)",     key: "vat_total",  width: 14 },
    { header: "Total (ZAR)",   key: "total",      width: 16 },
    { header: "Currency",      key: "currency",   width: 12 },
  ];
  styleHeader(invSheet.getRow(1));

  for (const row of invoices) {
    const partner = (row.partners as { company_name?: string } | null)?.company_name ?? "";
    const isForex = row.currency && row.currency !== "ZAR";
    const subtotalZAR = isForex ? (row.zar_equivalent ?? row.subtotal ?? 0) : (row.subtotal ?? 0);
    const totalZAR    = isForex ? (row.zar_equivalent ?? row.total ?? 0)    : (row.total ?? 0);

    const added = invSheet.addRow({
      number:     row.number,
      partner,
      issue_date: row.issue_date ? new Date(row.issue_date) : null,
      due_date:   row.due_date   ? new Date(row.due_date)   : null,
      status:     row.status ? String(row.status).charAt(0).toUpperCase() + String(row.status).slice(1) : "",
      subtotal:   subtotalZAR,
      vat_total:  row.vat_total ?? 0,
      total:      totalZAR,
      currency:   row.currency ?? "ZAR",
    });

    added.getCell("issue_date").numFmt = dateFmt;
    added.getCell("due_date").numFmt   = dateFmt;
    added.getCell("subtotal").numFmt   = zarFmt;
    added.getCell("vat_total").numFmt  = zarFmt;
    added.getCell("total").numFmt      = zarFmt;
    stripeRow(added);
  }

  // ── Sheet 3: Expense Register ─────────────────────────────────────────────

  const expSheet = workbook.addWorksheet("Expense Register");
  expSheet.columns = [
    { header: "Date",       key: "date",            width: 16 },
    { header: "Description",key: "description",     width: 36 },
    { header: "Category",   key: "category",        width: 20 },
    { header: "Excl VAT",   key: "amount_excl_vat", width: 16 },
    { header: "VAT",        key: "vat_amount",      width: 14 },
    { header: "Incl VAT",   key: "amount_incl_vat", width: 16 },
    { header: "Notes",      key: "notes",           width: 30 },
  ];
  styleHeader(expSheet.getRow(1));

  for (const row of expenses) {
    const added = expSheet.addRow({
      date:            row.date ? new Date(row.date) : null,
      description:     row.description ?? "",
      category:        row.category ?? "",
      amount_excl_vat: row.amount_excl_vat ?? 0,
      vat_amount:      row.vat_amount ?? 0,
      amount_incl_vat: row.amount_incl_vat ?? 0,
      notes:           row.notes ?? "",
    });

    added.getCell("date").numFmt            = dateFmt;
    added.getCell("amount_excl_vat").numFmt = zarFmt;
    added.getCell("vat_amount").numFmt      = zarFmt;
    added.getCell("amount_incl_vat").numFmt = zarFmt;
    stripeRow(added);
  }

  // ── Sheet 4: Drawings Log ─────────────────────────────────────────────────

  const drawSheet = workbook.addWorksheet("Drawings Log");
  drawSheet.columns = [
    { header: "Date",      key: "date",      width: 16 },
    { header: "Owner",     key: "owner",     width: 24 },
    { header: "Amount",    key: "amount",    width: 16 },
    { header: "Method",    key: "method",    width: 16 },
    { header: "Reference", key: "reference", width: 20 },
    { header: "Notes",     key: "notes",     width: 30 },
  ];
  styleHeader(drawSheet.getRow(1));

  for (const row of drawings) {
    const ownerName =
      (row.owner_settings as { display_name?: string } | null)?.display_name ?? "Unknown";

    const added = drawSheet.addRow({
      date:      row.date ? new Date(row.date) : null,
      owner:     ownerName,
      amount:    row.amount ?? 0,
      method:    row.method ?? "",
      reference: row.reference ?? "",
      notes:     row.notes ?? "",
    });

    added.getCell("date").numFmt   = dateFmt;
    added.getCell("amount").numFmt = zarFmt;
    stripeRow(added);
  }

  // ── Write and return ──────────────────────────────────────────────────────

  const buffer   = await workbook.xlsx.writeBuffer();
  const filename = `staatwright-package-${from}-${to}.xlsx`;

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

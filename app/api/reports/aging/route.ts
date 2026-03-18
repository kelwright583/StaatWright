import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import ExcelJS from "exceljs";

export async function GET() {
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

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // ── Fetch unpaid invoices ──────────────────────────────────────────────────
  const { data: invData, error: invErr } = await supabase
    .from("documents")
    .select("id, number, partner_id, status, total, currency, created_at, due_date, partners(company_name)")
    .eq("type", "invoice")
    .not("status", "eq", "paid")
    .not("status", "eq", "cancelled");

  if (invErr) return new Response(invErr.message, { status: 500 });

  const invoices = invData ?? [];
  const invoiceIds = invoices.map((i) => i.id);

  // ── Payments ───────────────────────────────────────────────────────────────
  let paymentMap: Record<string, number> = {};
  let creditMap: Record<string, number> = {};

  if (invoiceIds.length > 0) {
    const { data: pmts } = await supabase
      .from("invoice_payments")
      .select("document_id, amount")
      .in("document_id", invoiceIds);

    for (const p of pmts ?? []) {
      paymentMap[p.document_id] = (paymentMap[p.document_id] ?? 0) + (p.amount ?? 0);
    }

    const { data: cns } = await supabase
      .from("documents")
      .select("linked_document_id, total")
      .eq("type", "credit_note")
      .in("linked_document_id", invoiceIds);

    for (const cn of cns ?? []) {
      if (cn.linked_document_id) {
        creditMap[cn.linked_document_id] = (creditMap[cn.linked_document_id] ?? 0) + (cn.total ?? 0);
      }
    }
  }

  // ── Build aging rows ───────────────────────────────────────────────────────
  type BucketKey = "Current" | "1–30 days" | "31–60 days" | "61–90 days" | "90+ days";

  function getBucket(dueDateStr: string): { label: BucketKey; daysOverdue: number } {
    const due = new Date(dueDateStr);
    const diffMs = today.getTime() - due.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (days <= 0) return { label: "Current", daysOverdue: 0 };
    if (days <= 30) return { label: "1–30 days", daysOverdue: days };
    if (days <= 60) return { label: "31–60 days", daysOverdue: days };
    if (days <= 90) return { label: "61–90 days", daysOverdue: days };
    return { label: "90+ days", daysOverdue: days };
  }

  interface AgingRow {
    client: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    total: number;
    paid: number;
    outstanding: number;
    currency: string;
    bucket: BucketKey;
    daysOverdue: number;
  }

  const rows: AgingRow[] = [];

  for (const inv of invoices) {
    const paid = (paymentMap[inv.id] ?? 0) + (creditMap[inv.id] ?? 0);
    const total = inv.total ?? 0;
    const outstanding = Math.max(0, total - paid);
    if (outstanding === 0) continue;

    let dueDate = inv.due_date;
    if (!dueDate) {
      const created = new Date(inv.created_at);
      created.setDate(created.getDate() + 30);
      dueDate = created.toISOString().slice(0, 10);
    }

    const partnerRaw = inv.partners as { company_name?: string } | null;
    const { label, daysOverdue } = getBucket(dueDate);

    rows.push({
      client: partnerRaw?.company_name ?? "Unknown",
      invoiceNumber: inv.number ?? "—",
      invoiceDate: inv.created_at?.slice(0, 10) ?? "",
      dueDate,
      total,
      paid,
      outstanding,
      currency: inv.currency ?? "ZAR",
      bucket: label,
      daysOverdue,
    });
  }

  // Sort by client, then daysOverdue desc
  rows.sort((a, b) => {
    if (a.client !== b.client) return a.client.localeCompare(b.client);
    return b.daysOverdue - a.daysOverdue;
  });

  // ── Bucket totals ──────────────────────────────────────────────────────────
  const buckets: BucketKey[] = ["Current", "1–30 days", "31–60 days", "61–90 days", "90+ days"];
  const bucketTotals: Record<BucketKey, number> = {
    "Current": 0,
    "1–30 days": 0,
    "31–60 days": 0,
    "61–90 days": 0,
    "90+ days": 0,
  };
  for (const r of rows) bucketTotals[r.bucket] += r.outstanding;
  const grandTotal = rows.reduce((s, r) => s + r.outstanding, 0);

  // ── Workbook ───────────────────────────────────────────────────────────────
  const NAVY = "FF1F2A38";
  const WHITE = "FFFFFFFF";
  const LINEN = "FFEAE4DC";
  const CREAM = "FFF3F2EE";
  const zarFmt = "R #,##0.00";
  const dateFmt = "DD MMM YYYY";

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "StaatWright";
  workbook.created = new Date();

  // ── Sheet 1: Summary ───────────────────────────────────────────────────────
  const summary = workbook.addWorksheet("Summary");
  summary.columns = [
    { key: "bucket", width: 24 },
    { key: "amount", width: 20 },
    { key: "count",  width: 12 },
  ];

  const titleRow = summary.addRow(["AR Aging Report", "", ""]);
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: NAVY } };
  summary.addRow([`As at: ${todayStr}`, "", ""])
    .getCell(1).font = { size: 10, color: { argb: "FF5C6E81" } };
  summary.addRow(["", "", ""]);

  const hdr = summary.addRow(["Age Bucket", "Outstanding", "# Invoices"]);
  hdr.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.font = { color: { argb: WHITE }, bold: true };
  });

  for (const b of buckets) {
    const count = rows.filter((r) => r.bucket === b).length;
    const r = summary.addRow([b, bucketTotals[b], count]);
    r.getCell(2).numFmt = zarFmt;
  }

  summary.addRow(["", "", ""]);
  const totalRow = summary.addRow(["GRAND TOTAL", grandTotal, rows.length]);
  totalRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.font = { color: { argb: WHITE }, bold: true };
  });
  totalRow.getCell(2).numFmt = zarFmt;

  // ── Sheet 2: Detail ────────────────────────────────────────────────────────
  const detail = workbook.addWorksheet("Detail");
  detail.columns = [
    { key: "client",    width: 30 },
    { key: "inv",       width: 16 },
    { key: "invDate",   width: 16 },
    { key: "dueDate",   width: 16 },
    { key: "currency",  width: 10 },
    { key: "total",     width: 18 },
    { key: "paid",      width: 18 },
    { key: "outstanding", width: 18 },
    { key: "bucket",    width: 16 },
    { key: "daysOverdue", width: 14 },
  ];

  const detailHdr = detail.addRow([
    "Client", "Invoice #", "Invoice Date", "Due Date", "CCY",
    "Total", "Paid", "Outstanding", "Age Bucket", "Days Overdue",
  ]);
  detailHdr.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.font = { color: { argb: WHITE }, bold: true };
  });
  detailHdr.height = 20;

  let prevClient = "";
  let clientSubtotal = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const isNewClient = r.client !== prevClient;

    if (isNewClient && prevClient !== "") {
      // Client subtotal row
      const subRow = detail.addRow(["", `${prevClient} Subtotal`, "", "", "", "", "", clientSubtotal, "", ""]);
      subRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LINEN } };
        cell.font = { bold: true };
      });
      subRow.getCell(8).numFmt = zarFmt;
      clientSubtotal = 0;
    }

    const dataRow = detail.addRow([
      isNewClient ? r.client : "",
      r.invoiceNumber,
      r.invoiceDate ? new Date(r.invoiceDate) : null,
      r.dueDate ? new Date(r.dueDate) : null,
      r.currency,
      r.total,
      r.paid,
      r.outstanding,
      r.bucket,
      r.daysOverdue,
    ]);
    dataRow.getCell(3).numFmt = dateFmt;
    dataRow.getCell(4).numFmt = dateFmt;
    dataRow.getCell(6).numFmt = zarFmt;
    dataRow.getCell(7).numFmt = zarFmt;
    dataRow.getCell(8).numFmt = zarFmt;

    if (dataRow.number % 2 === 0) {
      dataRow.eachCell((cell) => {
        if (!cell.fill || (cell.fill as ExcelJS.PatternFill).fgColor?.argb !== NAVY) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CREAM } };
        }
      });
    }

    clientSubtotal += r.outstanding;
    prevClient = r.client;
  }

  // Last client subtotal
  if (prevClient !== "" && rows.length > 0) {
    const subRow = detail.addRow(["", `${prevClient} Subtotal`, "", "", "", "", "", clientSubtotal, "", ""]);
    subRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LINEN } };
      cell.font = { bold: true };
    });
    subRow.getCell(8).numFmt = zarFmt;
  }

  // Grand total
  const gtRow = detail.addRow(["GRAND TOTAL", "", "", "", "", "", "", grandTotal, "", ""]);
  gtRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.font = { color: { argb: WHITE }, bold: true };
  });
  gtRow.getCell(8).numFmt = zarFmt;

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `staatwright-ar-aging-${todayStr}.xlsx`;

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

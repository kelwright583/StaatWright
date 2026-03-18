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

  const { data: rows, error } = await supabase
    .from("documents")
    .select("number, issue_date, due_date, status, subtotal, vat_total, total, partner_id, partners(company_name)")
    .eq("type", "invoice")
    .gte("created_at", `${from}T00:00:00.000Z`)
    .lte("created_at", `${to}T23:59:59.999Z`)
    .order("issue_date", { ascending: true });

  if (error) return new Response(error.message, { status: 500 });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "StaatWright";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Invoice Register");

  // Column definitions
  sheet.columns = [
    { header: "Invoice #", key: "number", width: 16 },
    { header: "Partner", key: "partner", width: 30 },
    { header: "Issue Date", key: "issue_date", width: 16 },
    { header: "Due Date", key: "due_date", width: 16 },
    { header: "Status", key: "status", width: 14 },
    { header: "Subtotal (ZAR)", key: "subtotal", width: 18 },
    { header: "VAT (ZAR)", key: "vat_total", width: 16 },
    { header: "Total (ZAR)", key: "total", width: 16 },
  ];

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F2A38" },
    };
    cell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 11 };
    cell.alignment = { vertical: "middle", horizontal: "left" };
  });
  headerRow.height = 20;

  // Format helpers
  const zarFmt = 'R #,##0.00';
  const dateFmt = 'DD MMM YYYY';

  // Add data rows
  for (const row of rows ?? []) {
    const partner = (row.partners as { company_name?: string } | null)?.company_name ?? "";
    const added = sheet.addRow({
      number: row.number,
      partner,
      issue_date: row.issue_date ? new Date(row.issue_date) : null,
      due_date: row.due_date ? new Date(row.due_date) : null,
      status: row.status ? String(row.status).charAt(0).toUpperCase() + String(row.status).slice(1) : "",
      subtotal: row.subtotal ?? 0,
      vat_total: row.vat_total ?? 0,
      total: row.total ?? 0,
    });

    // Apply formats
    added.getCell("issue_date").numFmt = dateFmt;
    added.getCell("due_date").numFmt = dateFmt;
    added.getCell("subtotal").numFmt = zarFmt;
    added.getCell("vat_total").numFmt = zarFmt;
    added.getCell("total").numFmt = zarFmt;

    // Alternate row shading
    if (added.number % 2 === 0) {
      added.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F2EE" } };
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `staatwright-invoices-${from}-${to}.xlsx`;

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

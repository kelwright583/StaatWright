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

  // Fetch drawings joined with owner_settings for display_name
  const { data: rows, error } = await supabase
    .from("drawings")
    .select("date, amount, method, reference, notes, owner_id, owner_settings(display_name)")
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true });

  if (error) return new Response(error.message, { status: 500 });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "StaatWright";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Drawings Log");

  sheet.columns = [
    { header: "Date", key: "date", width: 16 },
    { header: "Owner", key: "owner", width: 24 },
    { header: "Amount", key: "amount", width: 16 },
    { header: "Method", key: "method", width: 16 },
    { header: "Reference", key: "reference", width: 20 },
    { header: "Notes", key: "notes", width: 30 },
  ];

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

  const zarFmt = 'R #,##0.00';
  const dateFmt = 'DD MMM YYYY';

  for (const row of rows ?? []) {
    const ownerName =
      (row.owner_settings as { display_name?: string } | null)?.display_name ??
      row.owner_id ??
      "Unknown";

    const added = sheet.addRow({
      date: row.date ? new Date(row.date) : null,
      owner: ownerName,
      amount: row.amount ?? 0,
      method: row.method ?? "",
      reference: row.reference ?? "",
      notes: row.notes ?? "",
    });

    added.getCell("date").numFmt = dateFmt;
    added.getCell("amount").numFmt = zarFmt;

    if (added.number % 2 === 0) {
      added.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F2EE" } };
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `staatwright-drawings-${from}-${to}.xlsx`;

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

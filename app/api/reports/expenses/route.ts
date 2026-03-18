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
    .from("expenses")
    .select("date, description, category, amount_excl_vat, vat_amount, amount_incl_vat, notes")
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true });

  if (error) return new Response(error.message, { status: 500 });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "StaatWright";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Expense Register");

  sheet.columns = [
    { header: "Date", key: "date", width: 16 },
    { header: "Description", key: "description", width: 36 },
    { header: "Category", key: "category", width: 20 },
    { header: "Excl VAT", key: "amount_excl_vat", width: 16 },
    { header: "VAT", key: "vat_amount", width: 14 },
    { header: "Incl VAT", key: "amount_incl_vat", width: 16 },
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
    const added = sheet.addRow({
      date: row.date ? new Date(row.date) : null,
      description: row.description ?? "",
      category: row.category ?? "",
      amount_excl_vat: row.amount_excl_vat ?? 0,
      vat_amount: row.vat_amount ?? 0,
      amount_incl_vat: row.amount_incl_vat ?? 0,
      notes: row.notes ?? "",
    });

    added.getCell("date").numFmt = dateFmt;
    added.getCell("amount_excl_vat").numFmt = zarFmt;
    added.getCell("vat_amount").numFmt = zarFmt;
    added.getCell("amount_incl_vat").numFmt = zarFmt;

    if (added.number % 2 === 0) {
      added.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F2EE" } };
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `staatwright-expenses-${from}-${to}.xlsx`;

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

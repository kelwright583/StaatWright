import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReminderType =
  | "3_days_before"
  | "due_today"
  | "7_days_overdue"
  | "14_days_overdue";

interface ReminderTemplate {
  subject: string;
  body: string;
}

interface ReminderTemplates {
  [key: string]: ReminderTemplate;
}

// ─── Helper: interpolate template variables ────────────────────────────────────

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

// ─── Helper: days overdue ─────────────────────────────────────────────────────

function calcDaysOverdue(dueDateStr: string | null): number {
  if (!dueDateStr) return 0;
  const dueDate = new Date(dueDateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ success: false, reason: "Unauthorized" }, { status: 401 });
  }

  // Parse body
  let body: { document_id?: string; reminder_type?: ReminderType };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, reason: "Invalid JSON body" }, { status: 400 });
  }

  const { document_id, reminder_type } = body;

  if (!document_id || !reminder_type) {
    return NextResponse.json(
      { success: false, reason: "document_id and reminder_type are required" },
      { status: 400 }
    );
  }

  // Fetch document with partner
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("*, partner:partners(*)")
    .eq("id", document_id)
    .single();

  if (docError || !doc) {
    return NextResponse.json(
      { success: false, reason: "Document not found" },
      { status: 404 }
    );
  }

  const partner = doc.partner as { email: string | null; company_name: string | null } | null;

  if (!partner?.email) {
    return NextResponse.json(
      { success: false, reason: "Partner has no email address" },
      { status: 422 }
    );
  }

  // Fetch company settings for reminder templates
  const { data: companySettings } = await supabase
    .from("company_settings")
    .select("reminder_templates")
    .single();

  const reminderTemplates = (companySettings?.reminder_templates ?? {}) as ReminderTemplates;
  const template = reminderTemplates[reminder_type] as ReminderTemplate | undefined;

  if (!template?.subject || !template?.body) {
    return NextResponse.json(
      { success: false, reason: `No template configured for reminder type: ${reminder_type}` },
      { status: 422 }
    );
  }

  // Build interpolation variables
  const daysOverdue = calcDaysOverdue(doc.due_date as string | null);
  const amount = doc.total != null
    ? `R ${(doc.total as number).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "";

  const vars: Record<string, string> = {
    partner_name: partner.company_name ?? partner.email,
    invoice_number: (doc.number as string) ?? "",
    amount,
    due_date: (doc.due_date as string) ?? "",
    days_overdue: String(daysOverdue),
  };

  const subject = interpolate(template.subject, vars);
  const bodyText = interpolate(template.body, vars);

  // Send via Resend if key is configured
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    // Record the attempt as a document event but report not sent
    await supabase.from("document_events").insert({
      document_id,
      event_type: "reminder_sent",
      detail: {
        reminder_type,
        sent_to: partner.email,
        sent: false,
        reason: "RESEND_API_KEY not configured",
      },
      created_by: user.id,
    });

    return NextResponse.json(
      { success: false, reason: "RESEND_API_KEY not configured" },
      { status: 200 }
    );
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@staatwright.co.za";

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: partner.email,
      subject,
      text: bodyText,
    }),
  });

  if (!resendRes.ok) {
    const resendError = await resendRes.text();
    await supabase.from("document_events").insert({
      document_id,
      event_type: "reminder_sent",
      detail: {
        reminder_type,
        sent_to: partner.email,
        sent: false,
        reason: `Resend error: ${resendError}`,
      },
      created_by: user.id,
    });
    return NextResponse.json(
      { success: false, reason: `Email send failed: ${resendError}` },
      { status: 500 }
    );
  }

  // Record successful send as document event
  await supabase.from("document_events").insert({
    document_id,
    event_type: "reminder_sent",
    detail: {
      reminder_type,
      sent_to: partner.email,
      sent: true,
    },
    created_by: user.id,
  });

  return NextResponse.json({ success: true });
}

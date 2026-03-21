import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatZAR } from "@/lib/utils";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { document_id } = await request.json();

    if (!document_id) {
      return NextResponse.json({ error: "document_id is required" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch document with partner (bill-to client)
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("*, partner:partners!partner_id(*)")
      .eq("id", document_id)
      .single();

    if (docErr || !doc) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (doc.type !== "invoice") {
      return NextResponse.json({ error: "Document is not an invoice" }, { status: 400 });
    }

    const partner = doc.partner as { email?: string; company_name?: string; contact_name?: string } | null;

    if (!partner?.email) {
      return NextResponse.json(
        { error: "Client has no email address. Please add an email to the client record." },
        { status: 400 }
      );
    }

    // Fetch company settings for fallback sender info
    const { data: settings } = await supabase
      .from("company_settings")
      .select("name, email, phone")
      .single();

    // Try to load venture for sender identity
    let ventureName: string | null = null;
    let ventureEmail: string | null = null;
    let venturePhone: string | null = null;
    if (doc.venture_id) {
      const { data: venture } = await supabase
        .from("partners")
        .select("company_name, email, phone")
        .eq("id", doc.venture_id)
        .single();
      if (venture) {
        ventureName = (venture as { company_name?: string }).company_name ?? null;
        ventureEmail = (venture as { email?: string }).email ?? null;
        venturePhone = (venture as { phone?: string }).phone ?? null;
      }
    }

    const senderName = ventureName ?? settings?.name ?? "StaatWright Solutions";
    const senderPhone = venturePhone ?? settings?.phone ?? null;
    // Email sender must be a verified domain — use venture email only if it matches a verified Resend domain;
    // otherwise fall back to the configured RESEND_FROM_EMAIL env var.
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? ventureEmail ?? "noreply@staatwright.co.za";

    const subject = `Invoice ${doc.number} from ${senderName}`;
    const invoiceUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://staatwright.co.za"}/admin/invoices/${doc.id}/print`;

    const dueDateLine = doc.due_date
      ? new Date(doc.due_date).toLocaleDateString("en-ZA", { day: "2-digit", month: "long", year: "numeric" })
      : null;

    const greeting = `Dear ${partner.contact_name || partner.company_name || "Client"}`;

    const textBody = [
      `${greeting},`,
      "",
      `Please find your invoice details below.`,
      "",
      `Invoice:    ${doc.number}`,
      `Amount Due: ${formatZAR(doc.total ?? 0)}`,
      dueDateLine ? `Due Date:   ${dueDateLine}` : "",
      "",
      `View invoice online: ${invoiceUrl}`,
      "",
      `Kind regards,`,
      senderName,
      senderPhone ? `Tel: ${senderPhone}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FAFAF9;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;">
    <tr><td style="padding:32px 40px;background:#FFFFFF;border:1px solid #EAE4DC;">

      <p style="font-size:22px;font-weight:700;color:#1F2A38;margin:0 0 24px;">${senderName}</p>

      <p style="color:#1A1A1A;font-size:15px;margin:0 0 20px;">${greeting},</p>
      <p style="color:#1A1A1A;font-size:15px;margin:0 0 28px;">
        Please find your invoice details below.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #EAE4DC;border-bottom:1px solid #EAE4DC;margin-bottom:28px;">
        <tr>
          <td style="padding:12px 0;color:#5C6E81;font-size:13px;">Invoice</td>
          <td style="padding:12px 0;color:#1A1A1A;font-size:13px;font-weight:600;text-align:right;">${doc.number}</td>
        </tr>
        <tr style="background:#F3F2EE;">
          <td style="padding:12px 0 12px 8px;color:#5C6E81;font-size:13px;">Amount Due</td>
          <td style="padding:12px 8px 12px 0;color:#1F2A38;font-size:15px;font-weight:700;text-align:right;">${formatZAR(doc.total ?? 0)}</td>
        </tr>
        ${dueDateLine ? `<tr>
          <td style="padding:12px 0;color:#5C6E81;font-size:13px;">Due Date</td>
          <td style="padding:12px 0;color:#1A1A1A;font-size:13px;text-align:right;">${dueDateLine}</td>
        </tr>` : ""}
      </table>

      <a href="${invoiceUrl}"
         style="display:inline-block;background:#1F2A38;color:#FFFFFF;text-decoration:none;
                padding:12px 28px;font-size:13px;font-weight:600;letter-spacing:0.05em;">
        VIEW INVOICE
      </a>

      <p style="color:#5C6E81;font-size:12px;margin:32px 0 0;">
        Kind regards,<br>
        <strong style="color:#1F2A38;">${senderName}</strong>
        ${senderPhone ? `<br>${senderPhone}` : ""}
      </p>
    </td></tr>
  </table>
</body>
</html>`;

    // Send email via Resend
    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: `${senderName} <${fromEmail}>`,
        to: partner.email,
        subject,
        text: textBody,
        html: htmlBody,
      });
    }

    // Update document status to 'sent'
    await supabase
      .from("documents")
      .update({ status: "sent", updated_at: new Date().toISOString() })
      .eq("id", document_id);

    // Write document event
    await supabase.from("document_events").insert({
      document_id,
      event_type: "sent",
      detail: {
        from: doc.status,
        to: "sent",
        sent_to: partner.email,
      },
      created_by: user?.id ?? null,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Send invoice error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

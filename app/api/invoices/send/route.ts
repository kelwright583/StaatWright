import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

function formatZAR(amount: number): string {
  return `R ${amount.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export async function POST(request: NextRequest) {
  try {
    const { document_id } = await request.json();

    if (!document_id) {
      return NextResponse.json({ error: "document_id is required" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    // Fetch document with partner
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("*, partner:partners(*)")
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
        { error: "Partner has no email address. Please add an email to the partner record." },
        { status: 400 }
      );
    }

    // Fetch company settings for sender info
    const { data: settings } = await supabase
      .from("company_settings")
      .select("company_name, email, phone")
      .single();

    const senderName = settings?.company_name || "StaatWright Solutions";
    const senderEmail = settings?.email || "noreply@staatwright.co.za";

    const subject = `Invoice ${doc.number} from ${senderName}`;
    const invoiceUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://staatwright.co.za"}/admin/invoices/${doc.id}/print`;

    const textBody = [
      `Dear ${partner.contact_name || partner.company_name || "Client"},`,
      "",
      `Please find attached Invoice ${doc.number}.`,
      "",
      `Amount Due: ${formatZAR(doc.total ?? 0)}`,
      doc.due_date ? `Due Date: ${new Date(doc.due_date).toLocaleDateString("en-ZA", { day: "2-digit", month: "long", year: "numeric" })}` : "",
      "",
      `You can view this invoice online at: ${invoiceUrl}`,
      "",
      `Kind regards,`,
      senderName,
      settings?.phone ? `Tel: ${settings.phone}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    // Send email via Resend
    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: `${senderName} <noreply@staatwright.co.za>`,
        to: partner.email,
        subject,
        text: textBody,
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

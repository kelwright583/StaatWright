import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { name, company, email, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Name, email and message are required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Save to DB (anon insert allowed via RLS)
    await supabase.from("contact_submissions").insert({ name, company: company || null, email, message });

    // Fetch notify email from settings
    const { data: settings } = await supabase
      .from("company_settings")
      .select("contact_email")
      .single();

    const notifyEmail = settings?.contact_email || process.env.CONTACT_EMAIL;

    if (notifyEmail && process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: "StaatWright <noreply@staatwright.co.za>",
        to: notifyEmail,
        replyTo: email,
        subject: `New enquiry from ${name}`,
        text: `Name: ${name}\nCompany: ${company || "—"}\nEmail: ${email}\n\n${message}`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Contact route error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

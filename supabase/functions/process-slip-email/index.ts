// Supabase Edge Function — process-slip-email
// Accepts inbound email webhooks from Postmark, extracts image attachments,
// runs GPT-4o vision parsing, and inserts into expense_inbox.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PostmarkAttachment {
  Name: string;
  Content: string; // base64
  ContentType: string;
  ContentLength: number;
}

interface PostmarkInboundPayload {
  From?: string;
  Subject?: string;
  TextBody?: string;
  Attachments?: PostmarkAttachment[];
}

interface AiExtraction {
  vendor_name: string | null;
  date: string | null;
  total_amount: number | null;
  currency: string | null;
  subtotal_excl_vat: number | null;
  vat_amount: number | null;
  line_items: { description: string; amount: number }[] | null;
  suggested_category: string | null;
  vendor_vat_number: string | null;
  payment_method: string | null;
  confidence: number | null;
  notes: string | null;
}

// ─── OpenAI prompt ────────────────────────────────────────────────────────────

const OPENAI_PROMPT = `You are a financial document parser for a South African company. Analyse this receipt/slip/invoice image and extract:
{
  "vendor_name": "string",
  "date": "YYYY-MM-DD",
  "total_amount": number,
  "currency": "ZAR|USD|EUR|GBP",
  "subtotal_excl_vat": number,
  "vat_amount": number,
  "line_items": [{"description": "string", "amount": number}],
  "suggested_category": "string",
  "vendor_vat_number": "string",
  "payment_method": "card|cash|eft|unknown",
  "confidence": 0.0-1.0,
  "notes": "string"
}
Only return valid JSON. If a field cannot be determined, use null.`;

// ─── Helper: generate UUID ─────────────────────────────────────────────────────

function generateUUID(): string {
  return crypto.randomUUID();
}

// ─── Helper: extract file extension ───────────────────────────────────────────

function getExtension(filename: string, contentType: string): string {
  const fromName = filename.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  const mimeMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "application/pdf": "pdf",
  };
  return mimeMap[contentType] ?? "bin";
}

// ─── Helper: is image attachment ──────────────────────────────────────────────

function isImageOrPdf(contentType: string): boolean {
  return (
    contentType.startsWith("image/") ||
    contentType === "application/pdf"
  );
}

// ─── Helper: call OpenAI vision API ───────────────────────────────────────────

async function callOpenAIVision(
  base64Image: string,
  contentType: string,
  apiKey: string
): Promise<AiExtraction> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: OPENAI_PROMPT,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${contentType};base64,${base64Image}`,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${err}`);
  }

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content ?? "{}";

  try {
    return JSON.parse(content) as AiExtraction;
  } catch {
    throw new Error("Failed to parse OpenAI JSON response");
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────
//
// Required Supabase Function secrets:
//   SUPABASE_URL               — auto-injected by Supabase
//   SUPABASE_SERVICE_ROLE_KEY  — auto-injected by Supabase
//   OPENAI_API_KEY             — your OpenAI key for vision parsing
//   POSTMARK_WEBHOOK_TOKEN     — the webhook token from your Postmark inbound server settings
//                                (Settings → Inbound → Webhook → Include HTTP Auth header)
//   RESEND_API_KEY             — for admin notification emails
//   ADMIN_NOTIFY_EMAIL         — email address to notify when a new slip arrives

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Verify Postmark webhook token — set POSTMARK_WEBHOOK_TOKEN in Supabase Function secrets
  const webhookToken = Deno.env.get("POSTMARK_WEBHOOK_TOKEN");
  if (webhookToken) {
    const signature = req.headers.get("X-Postmark-Signature");
    if (signature !== webhookToken) {
      console.error("Webhook signature mismatch — request rejected.");
      return new Response("Forbidden", { status: 403 });
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY") ?? "";

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Parse Postmark inbound payload
  let payload: PostmarkInboundPayload;
  try {
    payload = await req.json();
  } catch {
    console.error("Failed to parse Postmark payload");
    return new Response("Bad Request", { status: 400 });
  }

  const attachments = payload.Attachments ?? [];
  const imageAttachments = attachments.filter((a) => isImageOrPdf(a.ContentType));

  console.log(`Received email from ${payload.From ?? "unknown"}, found ${imageAttachments.length} image/PDF attachment(s).`);

  const results: { filename: string; success: boolean; error?: string }[] = [];

  for (const attachment of imageAttachments) {
    const uuid = generateUUID();
    const ext = getExtension(attachment.Name, attachment.ContentType);
    const storagePath = `inbox/raw/${uuid}.${ext}`;

    try {
      // Decode base64 attachment content
      const binaryStr = atob(attachment.Content);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      // Upload to Supabase Storage
      const { error: storageError } = await supabase.storage
        .from("expenses")
        .upload(storagePath, bytes, {
          contentType: attachment.ContentType,
          upsert: false,
        });

      if (storageError) {
        throw new Error(`Storage upload failed: ${storageError.message}`);
      }

      console.log(`Uploaded attachment to: ${storagePath}`);

      // AI extraction or null fields
      let aiData: AiExtraction;
      let aiNotes: string | null = null;

      if (openaiApiKey) {
        try {
          aiData = await callOpenAIVision(attachment.Content, attachment.ContentType, openaiApiKey);
          console.log(`AI extraction complete, confidence: ${aiData.confidence}`);
        } catch (aiErr) {
          console.error("OpenAI extraction failed:", aiErr);
          aiData = {
            vendor_name: null,
            date: null,
            total_amount: null,
            currency: null,
            subtotal_excl_vat: null,
            vat_amount: null,
            line_items: null,
            suggested_category: null,
            vendor_vat_number: null,
            payment_method: null,
            confidence: null,
            notes: null,
          };
          aiNotes = `AI extraction failed: ${aiErr instanceof Error ? aiErr.message : String(aiErr)}`;
        }
      } else {
        console.log("OpenAI API key not configured — skipping AI extraction.");
        aiData = {
          vendor_name: null,
          date: null,
          total_amount: null,
          currency: null,
          subtotal_excl_vat: null,
          vat_amount: null,
          line_items: null,
          suggested_category: null,
          vendor_vat_number: null,
          payment_method: null,
          confidence: null,
          notes: null,
        };
        aiNotes = "OpenAI API key not configured";
      }

      // Insert into expense_inbox
      const { error: insertError } = await supabase.from("expense_inbox").insert({
        status: "pending",
        raw_image_path: storagePath,
        ai_vendor_name: aiData.vendor_name,
        ai_date: aiData.date,
        ai_total_amount: aiData.total_amount,
        ai_vat_amount: aiData.vat_amount,
        ai_currency: aiData.currency,
        ai_suggested_category: aiData.suggested_category,
        ai_confidence: aiData.confidence,
        ai_notes: aiNotes ?? aiData.notes,
      });

      if (insertError) {
        throw new Error(`DB insert failed: ${insertError.message}`);
      }

      console.log(`Inserted expense_inbox record for: ${attachment.Name}`);

      // Notify admin that a new slip is waiting for review
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      const adminEmail = Deno.env.get("ADMIN_NOTIFY_EMAIL") ?? "contact@staatwright.co.za";
      const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "noreply@staatwright.co.za";
      const appUrl = Deno.env.get("APP_URL") ?? "https://staatwright.co.za";

      if (resendApiKey) {
        const vendorLabel = aiData.vendor_name ?? attachment.Name;
        const amountLabel = aiData.total_amount != null
          ? `${aiData.total_amount} ${aiData.currency ?? "ZAR"}`
          : "Unknown amount";
        const confidenceLabel = aiData.confidence != null
          ? `${Math.round(aiData.confidence * 100)}%`
          : "Unknown";

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: adminEmail,
            subject: `New expense slip received — ${vendorLabel}`,
            text: [
              "A new slip has been received and is waiting in your expense inbox.",
              "",
              `Vendor:     ${vendorLabel}`,
              `Amount:     ${amountLabel}`,
              `Date:       ${aiData.date ?? "Unknown"}`,
              `Category:   ${aiData.suggested_category ?? "Unknown"}`,
              `Confidence: ${confidenceLabel}`,
              "",
              `Review it at: ${appUrl}/admin/expenses`,
            ].join("\n"),
          }),
        });
        console.log(`Admin notification sent to ${adminEmail}`);
      } else {
        console.log("Notification stub: new slip received — RESEND_API_KEY not set.");
      }

      results.push({ filename: attachment.Name, success: true });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`Failed to process attachment ${attachment.Name}:`, errMsg);
      results.push({ filename: attachment.Name, success: false, error: errMsg });
    }
  }

  if (imageAttachments.length === 0) {
    console.log("No image attachments found in email.");
  }

  return new Response(
    JSON.stringify({
      received: true,
      processed: results.length,
      results,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
});

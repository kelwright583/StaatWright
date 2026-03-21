import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

const PROMPT = `You are a financial document parser for a South African business.
Analyse this invoice, bill, or receipt image and extract the following fields as JSON.
Return ONLY valid JSON with no markdown, no code fences, no explanation.

{
  "vendor_name": "string or null",
  "invoice_number": "string or null",
  "issue_date": "YYYY-MM-DD or null",
  "due_date": "YYYY-MM-DD or null",
  "amount_excl_vat": number or null,
  "vat_amount": number or null,
  "total_amount": number or null,
  "currency": "ZAR or USD or EUR or GBP — default ZAR",
  "vendor_vat_number": "string or null",
  "description": "brief one-line description of what the bill/invoice is for, or null",
  "confidence": 0.0 to 1.0
}

Rules:
- All monetary values must be plain numbers (no currency symbols, no commas).
- Dates must be ISO format YYYY-MM-DD.
- If the image is a receipt with no due date, set due_date to null.
- If VAT is not separately shown, infer: if total includes 15% VAT, calculate excl and vat fields.
- If a field cannot be determined, use null.`;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { file_url } = await request.json();
    if (!file_url) {
      return NextResponse.json({ error: "file_url is required" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        vendor_name: null,
        invoice_number: null,
        issue_date: null,
        due_date: null,
        amount_excl_vat: null,
        vat_amount: null,
        total_amount: null,
        currency: "ZAR",
        vendor_vat_number: null,
        description: null,
        confidence: null,
        _note: "OPENAI_API_KEY not configured — manual entry required",
      });
    }

    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: file_url, detail: "high" } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
      max_tokens: 600,
    });

    const raw = response.choices[0]?.message?.content ?? "{}";

    // Strip any accidental markdown code fences
    const cleaned = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "OCR returned unparseable response", raw },
        { status: 422 }
      );
    }

    return NextResponse.json({ ...parsed, _raw: raw });
  } catch (err: unknown) {
    console.error("OCR error:", err);
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

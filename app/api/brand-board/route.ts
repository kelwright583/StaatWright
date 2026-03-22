import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

const PROMPT = `You are a brand identity analyst. Analyse this brand board image and extract as much structured information as possible.

Return ONLY valid JSON with no markdown, no code fences, no explanation.

{
  "name": "brand name if visible, or null",
  "tagline": "brand tagline or slogan if visible, or null",
  "description": "brief brand description if inferrable, or null",
  "one_liner": "a concise one-line summary of the brand, or null",
  "colours": [
    {
      "name": "descriptive colour name (e.g. 'Deep Navy', 'Warm Gold')",
      "hex": "#RRGGBB hex value",
      "role": "primary | secondary | accent | background | text"
    }
  ],
  "heading_font": "heading/display font family name if identifiable, or null",
  "body_font": "body/text font family name if identifiable, or null",
  "style_notes": "any other observations about the brand style, or null"
}

Rules:
- Extract ALL distinct colours you can identify. Assign the most prominent colour as "primary".
- Font names should be the actual typeface name (e.g. "Playfair Display", "Inter", "DM Sans").
- If you cannot confidently identify a font, describe it (e.g. "Modern geometric sans-serif").
- Hex values must be valid 6-character hex codes starting with #.
- If a field cannot be determined, use null.
- The colours array should have at least 2-5 entries if colours are visible.`;

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
      return NextResponse.json(
        { error: "OPENAI_API_KEY not configured — brand board analysis unavailable." },
        { status: 503 }
      );
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
      max_tokens: 1200,
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const cleaned = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "AI returned unparseable response", raw },
        { status: 422 }
      );
    }

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    console.error("Brand board analysis error:", err);
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

"use client";

import Image from "next/image";
import type { BrandCardData } from "@/lib/types";

interface Props {
  brand: BrandCardData;
}

const BRAND_META_FALLBACK: Record<string, { accent: string; bg?: string; bgColor?: string; headingFont: string; bodyFont: string; headingStyle?: "normal" | "italic"; overlay: number; topOverlay?: number }> = {
  "Concierge Styled": {
    accent: "#cc8638", bg: "/brands/concierge-hero.jpg",
    headingFont: "'Playfair Display', Georgia, serif", bodyFont: "var(--font-inter), sans-serif",
    headingStyle: "italic", overlay: 0.82, topOverlay: 0.15,
  },
  "In the Absence of a Soapbox": {
    accent: "#C07B2A", bg: "/brands/soapbox-hero.png",
    headingFont: "'Playfair Display', Georgia, serif", bodyFont: "'DM Sans', sans-serif",
    headingStyle: "italic", overlay: 0.78, topOverlay: 0.2,
  },
  "KZN Youth Choir": {
    accent: "#1E3A8A", bg: "/brands/kznchoir-hero.jpg",
    headingFont: "var(--font-inter), sans-serif", bodyFont: "var(--font-inter), sans-serif",
    overlay: 0.72, topOverlay: 0.3,
  },
  "AirShot Base": {
    accent: "#8E44A3", bg: "/brands/airshot-base.png",
    headingFont: "'Space Grotesk', var(--font-inter), sans-serif", bodyFont: "var(--font-inter), sans-serif",
    overlay: 0.65, topOverlay: 0.1,
  },
  "Refrag": {
    accent: "#C72A00", bgColor: "#1e1f26",
    headingFont: "var(--font-inter), sans-serif", bodyFont: "var(--font-inter), sans-serif",
    overlay: 0,
  },
};

export default function BrandCard({ brand }: Props) {
  const primaryColour = brand.brand_colours?.find((c) => c.role === "primary");
  const fallback = BRAND_META_FALLBACK[brand.name];

  const accent = primaryColour?.hex ?? fallback?.accent ?? "#5C6E81";
  const headingFont = brand.heading_font ?? fallback?.headingFont ?? "var(--font-inter), sans-serif";
  const bodyFont = brand.body_font ?? fallback?.bodyFont ?? "var(--font-montserrat), sans-serif";
  const headingStyle = fallback?.headingStyle ?? "normal";

  const heroImage = brand.hero_image_path ?? fallback?.bg;
  const bgColor = brand.card_bg_color ?? fallback?.bgColor ?? "#1F2A38";
  const overlay = fallback?.overlay ?? (heroImage ? 0.7 : 0);
  const topOverlay = fallback?.topOverlay ?? 0;

  const gradientOverlay = overlay > 0
    ? `linear-gradient(to top, rgba(0,0,0,${overlay}) 0%, rgba(0,0,0,${overlay * 0.4}) 55%, rgba(0,0,0,${topOverlay}) 100%)`
    : undefined;

  const linkUrl = brand.public_show_case_study && brand.public_slug
    ? `/work/${brand.public_slug}`
    : brand.live_url;

  const card = (
    <div className="group relative rounded-2xl overflow-hidden flex flex-col min-h-72 cursor-pointer">
      {heroImage ? (
        <Image
          src={heroImage}
          alt=""
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      ) : (
        <div className="absolute inset-0" style={{ background: bgColor }} />
      )}

      {gradientOverlay && (
        <div className="absolute inset-0 pointer-events-none" style={{ background: gradientOverlay }} />
      )}

      <div
        className="absolute bottom-0 left-0 right-0 h-[3px] transition-opacity duration-300 opacity-0 group-hover:opacity-100"
        style={{ background: accent }}
      />

      <div className="relative z-10 flex flex-col flex-1 p-7">
        <div className="flex justify-end mb-auto">
          {brand.live_url ? (
            <span
              className="text-[10px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-full backdrop-blur-sm"
              style={{
                fontFamily: bodyFont, fontWeight: 500, color: accent,
                background: `${accent}22`, border: `1px solid ${accent}55`,
              }}
            >
              Live
            </span>
          ) : (
            <span
              className="text-[10px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-full"
              style={{
                fontFamily: bodyFont, fontWeight: 500,
                color: "rgba(255,255,255,0.35)",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              Soon
            </span>
          )}
        </div>

        <div className="mt-auto">
          <h3
            style={{
              fontFamily: headingFont, fontStyle: headingStyle,
              fontWeight: 700, fontSize: "1.25rem", lineHeight: 1.2,
              color: "#ffffff", marginBottom: "0.5rem",
            }}
          >
            {brand.name}
          </h3>

          {brand.public_one_liner && (
            <p
              style={{
                fontFamily: bodyFont, fontWeight: 400,
                fontSize: "0.8125rem", lineHeight: 1.55,
                color: "rgba(255,255,255,0.65)",
                marginBottom: linkUrl ? "0.875rem" : 0,
              }}
            >
              {brand.public_one_liner}
            </p>
          )}

          {linkUrl && (
            <p
              style={{
                fontFamily: bodyFont, fontSize: "0.75rem",
                fontWeight: 500, letterSpacing: "0.05em", color: accent,
              }}
            >
              View project →
            </p>
          )}
        </div>
      </div>
    </div>
  );

  if (linkUrl) {
    return (
      <a href={linkUrl} target={brand.live_url ? "_blank" : undefined} rel={brand.live_url ? "noopener noreferrer" : undefined}>
        {card}
      </a>
    );
  }

  return card;
}

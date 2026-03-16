"use client";

import Image from "next/image";
import { Brand } from "@/lib/types";

interface Props { brands: Brand[]; }

// ── Refrag 5-bar watermark (matches actual brand logo from image) ────────────

function RefragWatermark({ size = 200 }: { size?: number }) {
  const SLATE = "#30313A";
  const ACCENT = "#C72A00";
  const NAVY  = "#1F2933";
  const h = size * 0.55;
  const bw = size * 0.13;
  const gap = size * 0.05;
  const barH = h * 0.55;
  const barHTall = h;
  const totalW = bw * 5 + gap * 4;
  const startX = (size - totalW) / 2;

  const bars = [
    { color: SLATE,  height: barH,     y: (h - barH) / 2 },
    { color: SLATE,  height: barH,     y: (h - barH) / 2 },
    { color: ACCENT, height: barHTall, y: 0 },
    { color: ACCENT, height: barH,     y: (h - barH) / 2 },
    { color: NAVY,   height: barH,     y: (h - barH) / 2 },
  ];

  return (
    <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`} fill="none">
      {bars.map((bar, i) => (
        <rect
          key={i}
          x={startX + i * (bw + gap)}
          y={bar.y}
          width={bw}
          height={bar.height}
          rx={bw / 2}
          ry={bw / 2}
          fill={bar.color}
        />
      ))}
    </svg>
  );
}

// ── Brand configuration — each entry makes the card feel like that build ─────

type BrandConfig = {
  accent: string;
  bg?: string;
  bgColor?: string;
  headingFont: string;
  bodyFont: string;
  labelFont: string;
  headingStyle?: "normal" | "italic";
  overlay: number;       // 0-1 gradient darkness from bottom
  topOverlay?: number;   // subtle top overlay
};

const BRAND_META: Record<string, BrandConfig> = {
  "Concierge Styled": {
    accent: "#cc8638",
    bg: "/brands/concierge-hero.jpg",
    headingFont: "var(--font-playfair), Georgia, serif",
    bodyFont: "var(--font-inter), sans-serif",
    labelFont: "var(--font-inter), sans-serif",
    headingStyle: "italic",
    overlay: 0.82,
    topOverlay: 0.15,
  },
  "In the Absence of a Soapbox": {
    accent: "#C07B2A",
    bg: "/brands/soapbox-hero.png",
    headingFont: "var(--font-playfair), Georgia, serif",
    bodyFont: "var(--font-dm-sans), sans-serif",
    labelFont: "var(--font-dm-sans), sans-serif",
    headingStyle: "italic",
    overlay: 0.78,
    topOverlay: 0.2,
  },
  "KZN Youth Choir": {
    accent: "#1E3A8A",
    bg: "/brands/kznchoir-hero.jpg",
    headingFont: "var(--font-inter), sans-serif",
    bodyFont: "var(--font-inter), sans-serif",
    labelFont: "var(--font-inter), sans-serif",
    overlay: 0.72,
    topOverlay: 0.3,
  },
  "AirShot Base": {
    accent: "#8E44A3",
    bg: "/brands/airshot-base.png",
    headingFont: "var(--font-space-grotesk), var(--font-inter), sans-serif",
    bodyFont: "var(--font-inter), sans-serif",
    labelFont: "var(--font-space-grotesk), sans-serif",
    overlay: 0.65,
    topOverlay: 0.1,
  },
  "Refrag": {
    accent: "#C72A00",
    bgColor: "#1e1f26",
    headingFont: "var(--font-inter), sans-serif",
    bodyFont: "var(--font-inter), sans-serif",
    labelFont: "var(--font-inter), sans-serif",
    overlay: 0,
  },
};

const DEFAULT_CONFIG: BrandConfig = {
  accent: "#5C6E81",
  bgColor: "#1F2A38",
  headingFont: "var(--font-inter), sans-serif",
  bodyFont: "var(--font-montserrat), sans-serif",
  labelFont: "var(--font-montserrat), sans-serif",
  overlay: 0.6,
};

// ── Individual card ──────────────────────────────────────────────────────────

function BrandCard({ brand }: { brand: Brand }) {
  const cfg = BRAND_META[brand.name] ?? DEFAULT_CONFIG;
  const isRefrag = brand.name === "Refrag";

  const gradientOverlay = cfg.overlay > 0
    ? `linear-gradient(to top, rgba(0,0,0,${cfg.overlay}) 0%, rgba(0,0,0,${cfg.overlay * 0.4}) 55%, rgba(0,0,0,${cfg.topOverlay ?? 0}) 100%)`
    : undefined;

  const card = (
    <div className="group relative rounded-2xl overflow-hidden flex flex-col min-h-72 cursor-pointer">

      {/* Background layer */}
      {cfg.bg ? (
        <Image
          src={cfg.bg}
          alt=""
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      ) : (
        <div className="absolute inset-0" style={{ background: cfg.bgColor }} />
      )}

      {/* Refrag: large watermark bars */}
      {isRefrag && (
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.07] pointer-events-none">
          <RefragWatermark size={280} />
        </div>
      )}

      {/* Gradient overlay */}
      {gradientOverlay && (
        <div className="absolute inset-0 pointer-events-none" style={{ background: gradientOverlay }} />
      )}

      {/* Brand-colour accent strip at bottom edge on hover */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[3px] transition-opacity duration-300 opacity-0 group-hover:opacity-100"
        style={{ background: cfg.accent }}
      />

      {/* Card content */}
      <div className="relative z-10 flex flex-col flex-1 p-7">

        {/* Status badge — top right */}
        <div className="flex justify-end mb-auto">
          {brand.live_url ? (
            <span
              className="text-[10px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-full backdrop-blur-sm"
              style={{
                fontFamily: cfg.labelFont,
                fontWeight: 500,
                color: cfg.accent,
                background: `${cfg.accent}22`,
                border: `1px solid ${cfg.accent}55`,
              }}
            >
              Live
            </span>
          ) : (
            <span
              className="text-[10px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-full"
              style={{
                fontFamily: cfg.labelFont,
                fontWeight: 500,
                color: "rgba(255,255,255,0.35)",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              Soon
            </span>
          )}
        </div>

        {/* Brand name + one-liner — pinned to bottom */}
        <div className="mt-auto">
          <h3
            style={{
              fontFamily: cfg.headingFont,
              fontStyle: cfg.headingStyle ?? "normal",
              fontWeight: 700,
              fontSize: "1.25rem",
              lineHeight: 1.2,
              color: "#ffffff",
              marginBottom: "0.5rem",
            }}
          >
            {brand.name}
          </h3>

          {brand.public_one_liner && (
            <p
              style={{
                fontFamily: cfg.bodyFont,
                fontWeight: 400,
                fontSize: "0.8125rem",
                lineHeight: 1.55,
                color: "rgba(255,255,255,0.65)",
                marginBottom: brand.live_url ? "0.875rem" : 0,
              }}
            >
              {brand.public_one_liner}
            </p>
          )}

          {brand.live_url && (
            <p
              style={{
                fontFamily: cfg.labelFont,
                fontSize: "0.75rem",
                fontWeight: 500,
                letterSpacing: "0.05em",
                color: cfg.accent,
              }}
            >
              View project →
            </p>
          )}
        </div>
      </div>
    </div>
  );

  if (brand.live_url) {
    return (
      <a href={brand.live_url} target="_blank" rel="noopener noreferrer">
        {card}
      </a>
    );
  }

  return card;
}

// ── Section ──────────────────────────────────────────────────────────────────

export default function PartnersSection({ brands }: Props) {
  return (
    <section id="partners" className="py-24 md:py-32 px-6 md:px-12 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-6 mb-12">
          <p className="label-caps">Partners &amp; Builds</p>
          <div className="flex-1 h-px bg-linen" />
        </div>

        {brands.length === 0 ? (
          <p className="font-montserrat text-sm text-steel">No partners listed yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {brands.map((brand) => (
              <BrandCard key={brand.id} brand={brand} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

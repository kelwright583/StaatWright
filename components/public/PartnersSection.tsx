"use client";

import Image from "next/image";
import { Brand } from "@/lib/types";

interface Props { brands: Brand[]; }

// ── Inline brand marks ──────────────────────────────────────────────────────

function RefragMark() {
  const SLATE = "#30313A";
  const ACCENT = "#C72A00";
  const w = 48, h = 48;
  const bw = 7, gap = 3;
  const barH = 18, barHTall = 26;
  const totalW = bw * 5 + gap * 4;
  const startX = (w - totalW) / 2;

  const bars = [
    { color: SLATE,  height: barH,     y: (h - barH) / 2 },
    { color: SLATE,  height: barH,     y: (h - barH) / 2 },
    { color: SLATE,  height: barHTall, y: (h - barHTall) / 2 },
    { color: ACCENT, height: barH,     y: (h - barH) / 2 },
    { color: ACCENT, height: barH,     y: (h - barH) / 2 },
  ];

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width={w} height={h} rx="4" fill="#F5F2EE"/>
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

function SoapboxMark() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="4" fill="#1b2943"/>
      <text
        x="24" y="30"
        fontFamily="Georgia, serif"
        fontWeight="bold"
        fontSize="13"
        fill="#C07B2A"
        textAnchor="middle"
      >
        ITA
      </text>
    </svg>
  );
}

// ── Brand accent + logo config ──────────────────────────────────────────────

const BRAND_META: Record<string, {
  accent: string;
  logo?: string;
  mark?: React.ReactNode;
}> = {
  "Concierge Styled": {
    accent: "#cc8638",
    logo: "/brands/concierge-icon.svg",
  },
  "In the Absence of a Soapbox": {
    accent: "#C07B2A",
    mark: <SoapboxMark />,
  },
  "Airview": {
    accent: "#8E44A3",
    logo: "/brands/airview-icon.png",
  },
  "KZN Youth Choir": {
    accent: "#1E3A8A",
    logo: "/brands/kznchoir-logo.png",
  },
  "Refrag": {
    accent: "#C72A00",
    mark: <RefragMark />,
  },
};

// ── Sub-components ──────────────────────────────────────────────────────────

function BrandMark({ brand }: { brand: Brand }) {
  const meta = BRAND_META[brand.name];
  if (!meta) return null;

  if (meta.mark) {
    return <span className="block w-12 h-12 flex-shrink-0">{meta.mark}</span>;
  }

  if (meta.logo) {
    return (
      <span className="block w-12 h-12 flex-shrink-0 bg-white border border-linen overflow-hidden rounded-sm">
        <Image
          src={meta.logo}
          alt={brand.name}
          width={48}
          height={48}
          className="w-full h-full object-contain"
        />
      </span>
    );
  }

  return null;
}

// ── Main section ────────────────────────────────────────────────────────────

export default function PartnersSection({ brands }: Props) {
  return (
    <section id="partners" className="py-24 md:py-32 px-6 md:px-12 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-6 mb-16">
          <p className="label-caps">Partners &amp; Builds</p>
          <div className="flex-1 h-px bg-linen" />
        </div>

        {brands.length === 0 ? (
          <p className="font-montserrat text-sm text-steel">No partners listed yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-linen border border-linen">
            {brands.map((brand) => {
              const meta = BRAND_META[brand.name];
              const accent = meta?.accent ?? "#5C6E81";

              const card = (
                <div className="group bg-white flex flex-col h-full transition-colors duration-200 hover:bg-[#fafafa]">
                  {/* Brand-coloured accent strip */}
                  <div className="h-[3px] w-full" style={{ background: accent }} />

                  <div className="p-8 flex flex-col gap-4 flex-1">
                    {/* Logo mark + status badge */}
                    <div className="flex items-start justify-between gap-4">
                      <BrandMark brand={brand} />
                      {brand.live_url ? (
                        <span
                          className="font-montserrat text-[10px] tracking-widest uppercase px-2 py-0.5 flex-shrink-0 mt-1 border"
                          style={{ borderColor: `${accent}50`, color: accent }}
                        >
                          Live
                        </span>
                      ) : (
                        <span className="font-montserrat text-[10px] tracking-widest uppercase border border-linen text-steel/40 px-2 py-0.5 flex-shrink-0 mt-1">
                          Soon
                        </span>
                      )}
                    </div>

                    {/* Brand name */}
                    <h3 className="font-inter font-bold text-navy text-base leading-snug">
                      {brand.name}
                    </h3>

                    {/* One-liner */}
                    {brand.public_one_liner && (
                      <p className="font-montserrat text-sm text-ink/50 leading-relaxed flex-1">
                        {brand.public_one_liner}
                      </p>
                    )}

                    {/* CTA */}
                    {brand.live_url && (
                      <p
                        className="font-montserrat text-xs mt-auto"
                        style={{ color: accent }}
                      >
                        View project →
                      </p>
                    )}
                  </div>
                </div>
              );

              return brand.live_url ? (
                <a
                  key={brand.id}
                  href={brand.live_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {card}
                </a>
              ) : (
                <div key={brand.id}>{card}</div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

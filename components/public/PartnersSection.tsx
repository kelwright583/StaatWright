"use client";

import { useEffect } from "react";
import type { BrandCardData } from "@/lib/types";
import BrandCard from "@/components/shared/BrandCard";

interface Props {
  brands: BrandCardData[];
}

export default function PartnersSection({ brands }: Props) {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=DM+Sans:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);

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

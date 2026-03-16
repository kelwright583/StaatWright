import { Brand } from "@/lib/types";

interface Props { brands: Brand[]; }

export default function PartnersSection({ brands }: Props) {
  return (
    <section id="partners" className="py-24 md:py-32 px-6 md:px-12 bg-cream">
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
              const card = (
                <div className="group bg-cream p-8 flex flex-col gap-3 transition-all duration-200 hover:bg-white h-full">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-inter font-bold text-navy text-lg group-hover:text-steel transition-colors">
                      {brand.name}
                    </h3>
                    {brand.live_url ? (
                      <span className="font-montserrat text-[10px] tracking-widest uppercase border border-steel/30 text-steel px-2 py-0.5 flex-shrink-0 mt-1">Live</span>
                    ) : (
                      <span className="font-montserrat text-[10px] tracking-widest uppercase border border-linen text-steel/40 px-2 py-0.5 flex-shrink-0 mt-1">Soon</span>
                    )}
                  </div>
                  {brand.public_one_liner && (
                    <p className="font-montserrat text-sm text-ink/50 leading-relaxed">{brand.public_one_liner}</p>
                  )}
                  {brand.live_url && (
                    <p className="font-montserrat text-xs text-steel mt-auto">View project →</p>
                  )}
                </div>
              );

              return brand.live_url ? (
                <a key={brand.id} href={brand.live_url} target="_blank" rel="noopener noreferrer">{card}</a>
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

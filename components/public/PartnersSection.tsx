import { Brand } from "@/lib/types";

interface Props {
  brands: Brand[];
}

export default function PartnersSection({ brands }: Props) {
  return (
    <section id="partners" className="bg-white py-24 md:py-32 px-6 md:px-12">
      <div className="max-w-7xl mx-auto">
        <p className="label-caps mb-12">Partners &amp; Builds</p>
        {brands.length === 0 ? (
          <p className="font-montserrat text-sm text-steel">No partners listed yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-linen border border-linen">
            {brands.map((brand) => {
              const card = (
                <div className="bg-white p-8 group transition-all duration-200 hover:-translate-y-0.5 hover:border-navy flex flex-col gap-4 h-full">
                  <div className="h-12 flex items-center">
                    <span className="font-inter font-bold text-navy text-lg group-hover:text-steel transition-colors">
                      {brand.name}
                    </span>
                  </div>
                  {brand.public_one_liner && (
                    <p className="font-montserrat text-sm text-ink/70 leading-relaxed flex-1">
                      {brand.public_one_liner}
                    </p>
                  )}
                  <div className="mt-auto">
                    {brand.live_url ? (
                      <span className="inline-block font-montserrat text-xs text-steel border border-steel px-2 py-0.5">
                        Live
                      </span>
                    ) : (
                      <span className="inline-block font-montserrat text-xs text-steel/60 border border-linen px-2 py-0.5">
                        Coming Soon
                      </span>
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
                  className="block"
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

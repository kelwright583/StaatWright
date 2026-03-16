import { Brand } from "@/lib/types";

interface Props { brands: Brand[]; }

export default function PartnersSection({ brands }: Props) {
  return (
    <section id="partners" className="py-24 md:py-32 px-6 md:px-12" style={{ background: "#111111" }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-6 mb-16">
          <p className="label-caps" style={{ color: "#5C6E81" }}>Partners &amp; Builds</p>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
        </div>

        {brands.length === 0 ? (
          <p className="font-montserrat text-sm" style={{ color: "#5C6E81" }}>No partners listed yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px" style={{ background: "rgba(255,255,255,0.06)" }}>
            {brands.map((brand) => {
              const card = (
                <div
                  className="group p-8 flex flex-col gap-4 transition-all duration-200 hover:-translate-y-0.5"
                  style={{ background: "#111111" }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-inter font-bold text-white text-lg group-hover:text-[#EAE4DC] transition-colors">
                      {brand.name}
                    </h3>
                    {brand.live_url ? (
                      <span className="font-montserrat text-[10px] tracking-widest uppercase border px-2 py-0.5 flex-shrink-0 mt-1" style={{ color: "#5C6E81", borderColor: "rgba(92,110,129,0.3)" }}>
                        Live
                      </span>
                    ) : (
                      <span className="font-montserrat text-[10px] tracking-widest uppercase border px-2 py-0.5 flex-shrink-0 mt-1" style={{ color: "rgba(255,255,255,0.2)", borderColor: "rgba(255,255,255,0.08)" }}>
                        Soon
                      </span>
                    )}
                  </div>
                  {brand.public_one_liner && (
                    <p className="font-montserrat text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {brand.public_one_liner}
                    </p>
                  )}
                  {brand.live_url && (
                    <p className="font-montserrat text-xs mt-auto" style={{ color: "#5C6E81" }}>
                      View project →
                    </p>
                  )}
                </div>
              );

              return brand.live_url ? (
                <a key={brand.id} href={brand.live_url} target="_blank" rel="noopener noreferrer">
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

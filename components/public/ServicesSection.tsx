import { CompanySettings } from "@/lib/types";

const DEFAULTS = [
  { num: "01", title: "Digital Products",       body: "We design and build web apps, PWAs, and platforms from the ground up." },
  { num: "02", title: "Systems & Integrations", body: "We connect the tools your business already uses into coherent, automated systems." },
  { num: "03", title: "Consultancy",            body: "We assess, architect, and advise — without the agency overhead." },
];

interface Props { settings: CompanySettings | null; }

export default function ServicesSection({ settings }: Props) {
  const services = [
    { num: "01", title: settings?.service_1_title || DEFAULTS[0].title, body: settings?.service_1_body || DEFAULTS[0].body },
    { num: "02", title: settings?.service_2_title || DEFAULTS[1].title, body: settings?.service_2_body || DEFAULTS[1].body },
    { num: "03", title: settings?.service_3_title || DEFAULTS[2].title, body: settings?.service_3_body || DEFAULTS[2].body },
  ];

  return (
    <section id="services" className="py-24 md:py-32 px-6 md:px-12" style={{ background: "#0c0c0c" }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-6 mb-16">
          <p className="label-caps" style={{ color: "#5C6E81" }}>What we do</p>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          {services.map((s, i) => (
            <div key={s.num} className={`py-8 md:py-0 ${i > 0 ? "md:pl-10" : ""} ${i < 2 ? "md:pr-10" : ""}`}>
              <span className="font-montserrat text-xs font-medium block mb-5" style={{ color: "#5C6E81" }}>{s.num}</span>
              <h3 className="font-inter font-bold text-white text-xl mb-4">{s.title}</h3>
              <p className="font-montserrat text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

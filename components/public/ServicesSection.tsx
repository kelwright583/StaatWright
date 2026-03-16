import { CompanySettings } from "@/lib/types";

const DEFAULTS = [
  {
    num: "01",
    title: "Digital Products",
    body: "We design and build web apps, PWAs, and platforms from the ground up.",
  },
  {
    num: "02",
    title: "Systems & Integrations",
    body: "We connect the tools your business already uses into coherent, automated systems.",
  },
  {
    num: "03",
    title: "Consultancy",
    body: "We assess, architect, and advise — without the agency overhead.",
  },
];

interface Props {
  settings: CompanySettings | null;
}

export default function ServicesSection({ settings }: Props) {
  const services = [
    {
      num: "01",
      title: settings?.service_1_title || DEFAULTS[0].title,
      body:  settings?.service_1_body  || DEFAULTS[0].body,
    },
    {
      num: "02",
      title: settings?.service_2_title || DEFAULTS[1].title,
      body:  settings?.service_2_body  || DEFAULTS[1].body,
    },
    {
      num: "03",
      title: settings?.service_3_title || DEFAULTS[2].title,
      body:  settings?.service_3_body  || DEFAULTS[2].body,
    },
  ];

  return (
    <section id="services" className="bg-cream py-24 md:py-32 px-6 md:px-12">
      <div className="max-w-7xl mx-auto">
        <p className="label-caps mb-12">What we do</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-linen">
          {services.map((s) => (
            <div key={s.num} className="border-b md:border-b-0 md:border-r border-linen pt-8 pb-10 pr-0 md:pr-12 last:border-r-0">
              <span className="font-montserrat text-sm font-medium text-steel block mb-4">{s.num}</span>
              <h3 className="font-inter font-bold text-navy text-xl mb-3">{s.title}</h3>
              <p className="font-montserrat text-sm text-ink/70 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

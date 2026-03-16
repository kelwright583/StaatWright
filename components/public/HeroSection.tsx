export default function HeroSection() {
  return (
    <section
      className="min-h-screen flex items-center justify-center bg-navy px-6 md:px-12"
      style={{ paddingTop: 64 }}
    >
      <div className="max-w-3xl w-full text-center">
        <p className="label-caps mb-6">Staatwright Solutions</p>
        <h1 className="font-inter text-5xl md:text-7xl font-bold text-cream leading-[1.1] mb-2">
          Complexity, managed.
        </h1>
        <h1 className="font-inter text-5xl md:text-7xl font-light text-cream leading-[1.1] mb-8">
          Simplicity, experienced.
        </h1>
        <p className="font-montserrat text-lg text-steel max-w-xl mx-auto mb-10">
          We build digital platforms, products, and systems for businesses that mean it.
        </p>
        <a
          href="#partners"
          className="inline-block font-inter font-semibold text-navy bg-cream px-8 py-3 text-sm tracking-wide hover:bg-linen transition-colors"
        >
          See our work ↓
        </a>
      </div>
    </section>
  );
}

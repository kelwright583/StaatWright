export default function PublicFooter() {
  return (
    <footer className="bg-[#111111] py-6 px-6 md:px-12">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <p className="font-montserrat text-xs text-steel">
          © 2026 StaatWright Solutions Ltd
        </p>
        <a
          href="#"
          className="font-montserrat text-xs text-steel hover:text-cream transition-colors"
          aria-label="Back to top"
        >
          ↑
        </a>
      </div>
    </footer>
  );
}

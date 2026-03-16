export default function PublicFooter() {
  return (
    <footer className="py-8 px-6 md:px-12" style={{ background: "#0c0c0c", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <p className="font-montserrat text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
          © 2026 StaatWright Solutions Ltd
        </p>
        <a
          href="#"
          className="font-montserrat text-xs transition-colors hover:text-white"
          style={{ color: "rgba(255,255,255,0.2)" }}
          aria-label="Back to top"
        >
          ↑
        </a>
      </div>
    </footer>
  );
}

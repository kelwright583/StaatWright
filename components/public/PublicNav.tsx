"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function PublicNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const links = [
    { href: "#services", label: "Services" },
    { href: "#partners", label: "Partners" },
    { href: "#contact",  label: "Contact" },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          scrolled ? "border-b border-linen" : ""
        }`}
        style={{ background: "#FFFFFF", height: 64 }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-full flex items-center justify-between">
          <Link href="/" className="font-inter font-bold text-navy text-lg tracking-wide">
            StaatWright
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="font-montserrat font-medium text-sm text-steel hover:text-navy transition-colors"
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-cream p-2"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <span className="block w-5 h-px bg-white mb-1.5" />
            <span className="block w-5 h-px bg-white mb-1.5" />
            <span className="block w-5 h-px bg-white" />
          </button>
        </div>
      </nav>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex flex-col px-8 pt-8 bg-navy">
          <div className="flex items-center justify-between mb-12">
            <Link href="/" className="font-inter font-bold text-cream text-lg">StaatWright</Link>
            <button
              className="text-cream text-2xl"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
            >
              ×
            </button>
          </div>
          <nav className="flex flex-col gap-8">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="font-inter font-bold text-cream text-4xl hover:text-steel transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}

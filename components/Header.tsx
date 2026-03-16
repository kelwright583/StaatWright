"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import LogoIcon from "./LogoIcon";
import { FaBars, FaTimes } from "react-icons/fa";

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/work", label: "Work" },
    { href: "/ventures", label: "Ventures" },
    { href: "/thinking", label: "Thinking" },
    { href: "/contact", label: "Contact" },
  ];

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-charcoal/10">
      <nav className="max-w-7xl mx-auto px-6 md:px-8 lg:px-12 py-6 md:py-8 flex items-center justify-between">
        {/* Logo Section */}
        <Link 
          href="/" 
          className="flex items-center gap-4 font-poppins text-2xl text-navy tracking-wide flex-shrink-0"
        >
          <LogoIcon size="sm" />
          <div className="hidden sm:flex flex-col">
            <span>StaatWright</span>
          </div>
          <span className="sm:hidden">StaatWright</span>
        </Link>
        
        {/* Desktop Navigation Links */}
        <ul className="hidden lg:flex items-center gap-6 xl:gap-8">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`font-montserrat text-base whitespace-nowrap ${
                  pathname === link.href 
                    ? "text-charcoal font-medium" 
                    : "text-charcoal/70"
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        
        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden text-slate hover:text-charcoal transition-colors p-2"
          aria-label="Toggle menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
        </button>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 top-[73px] bg-white z-40 lg:hidden">
            <nav className="flex flex-col px-6 py-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`font-montserrat text-xl py-4 border-b border-charcoal/10 ${
                    pathname === link.href 
                      ? "text-charcoal font-medium" 
                      : "text-charcoal/70"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </nav>
    </header>
  );
}


import Link from "next/link";
import LogoIcon from "./LogoIcon";

export default function Footer() {
  const navLinks = [
    { href: "/work", label: "Work" },
    { href: "/ventures", label: "Ventures" },
    { href: "/thinking", label: "Thinking" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <footer className="bg-navy text-offwhite py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-8">
          <div className="text-center md:text-left">
            <Link href="/" className="flex items-center gap-4 font-poppins text-3xl font-bold text-offwhite">
              <LogoIcon size="md" />
              StaatWright
            </Link>
          </div>

          <ul className="flex flex-wrap gap-6 md:gap-8 justify-center">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="font-montserrat text-base text-slate hover:text-offwhite"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-12 pt-8 border-t border-slate/30">
          <div className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-6 text-sm text-slate">
            <span>© {new Date().getFullYear()} StaatWright. All rights reserved.</span>
            <span className="hidden md:inline">•</span>
            <a
              href="/terms-and-conditions.txt"
              download
              className="hover:text-offwhite transition-colors"
            >
              Terms & Conditions
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}


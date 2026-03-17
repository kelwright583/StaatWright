"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="6" height="6" />
      <rect x="9" y="1" width="6" height="6" />
      <rect x="1" y="9" width="6" height="6" />
      <rect x="9" y="9" width="6" height="6" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="5" r="2.5" />
      <path d="M1 14c0-3 2-4.5 5-4.5s5 1.5 5 4.5" />
      <path d="M11 7c1.5 0 3 .8 3 3" />
      <circle cx="11" cy="4" r="2" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 1H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6L9 1z" />
      <path d="M9 1v5h5" />
      <line x1="5" y1="9" x2="11" y2="9" />
      <line x1="5" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="2" width="10" height="13" rx="0" />
      <path d="M6 2V1h4v1" />
      <line x1="5" y1="7" x2="11" y2="7" />
      <line x1="5" y1="10" x2="11" y2="10" />
      <line x1="5" y1="13" x2="8" y2="13" />
    </svg>
  );
}

function MinusCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="7" />
      <line x1="5" y1="8" x2="11" y2="8" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 3a1 1 0 0 1 1-1h4l2 2h6a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3z" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 1v14l2-1.5 2 1.5 2-1.5 2 1.5 2-1.5V1" />
      <line x1="5" y1="5" x2="11" y2="5" />
      <line x1="5" y1="8" x2="11" y2="8" />
      <line x1="5" y1="11" x2="8" y2="11" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="8,1 15,5 8,9 1,5" />
      <polyline points="1,9 8,13 15,9" />
      <polyline points="1,12 8,16 15,12" />
    </svg>
  );
}

function CogIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" />
    </svg>
  );
}

const mainNav: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: <GridIcon /> },
  { label: "Clients", href: "/admin/clients", icon: <UsersIcon /> },
  { label: "Invoices", href: "/admin/invoices", icon: <DocumentIcon /> },
  { label: "Quotes", href: "/admin/quotes", icon: <ClipboardIcon /> },
  { label: "Credit Notes", href: "/admin/credit-notes", icon: <MinusCircleIcon /> },
  { label: "Files", href: "/admin/files", icon: <FolderIcon /> },
  { label: "Expenses", href: "/admin/expenses", icon: <ReceiptIcon /> },
  { label: "Brand Assets", href: "/admin/brands", icon: <LayersIcon /> },
];

const bottomNav: NavItem[] = [
  { label: "Settings", href: "/admin/settings", icon: <CogIcon /> },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/admin/dashboard") return pathname === href;
    return pathname.startsWith(href);
  }

  function itemClass(href: string) {
    const base =
      "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors";
    const active = "bg-white/10 text-cream";
    const inactive = "text-steel hover:text-cream hover:bg-white/5";
    return `${base} ${isActive(href) ? active : inactive}`;
  }

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-60 flex flex-col"
      style={{ backgroundColor: "#1F2A38", width: "240px" }}
    >
      {/* Wordmark */}
      <div className="px-4 pt-6 pb-4 flex items-center gap-2.5">
        <Image
          src="/brands/staatwright-icon.png"
          alt="StaatWright"
          width={26}
          height={26}
          className="shrink-0"
        />
        <span
          className="text-cream font-bold uppercase tracking-widest text-xs"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          StaatWright
        </span>
      </div>

      {/* Divider */}
      <div className="mx-4 mb-2 border-t" style={{ borderColor: "#5C6E81", opacity: 0.4 }} />

      {/* Main nav */}
      <nav className="flex-1 py-2 overflow-y-auto">
        <ul className="space-y-0.5">
          {mainNav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={itemClass(item.href)}
                style={{ fontFamily: "var(--font-montserrat)" }}
              >
                <span className="shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>

        {/* Thin divider */}
        <div className="mx-4 my-3 border-t" style={{ borderColor: "#5C6E81", opacity: 0.3 }} />

        <ul className="space-y-0.5">
          {bottomNav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={itemClass(item.href)}
                style={{ fontFamily: "var(--font-montserrat)" }}
              >
                <span className="shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

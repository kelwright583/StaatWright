import Link from "next/link";

interface AdminTopBarProps {
  title: string;
  user: { email: string } | null;
}

export default function AdminTopBar({ title, user }: AdminTopBarProps) {
  return (
    <header
      className="fixed top-0 right-0 flex items-center justify-between px-8 bg-white border-b border-linen"
      style={{ left: "240px", height: "56px" }}
    >
      {/* Page title */}
      <h2
        className="text-navy font-bold text-lg"
        style={{ fontFamily: "var(--font-inter)" }}
      >
        {title}
      </h2>

      {/* User area */}
      <div className="flex items-center gap-4">
        {user?.email && (
          <span
            className="text-steel text-sm"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            {user.email}
          </span>
        )}
        <Link
          href="/admin/logout"
          className="text-steel hover:text-navy text-sm transition-colors"
          style={{ fontFamily: "var(--font-montserrat)" }}
        >
          Sign out
        </Link>
      </div>
    </header>
  );
}

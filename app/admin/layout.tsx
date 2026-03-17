"use client";

import { usePathname } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAFAF9" }}>
      <AdminSidebar />
      <div style={{ marginLeft: "240px" }}>{children}</div>
    </div>
  );
}

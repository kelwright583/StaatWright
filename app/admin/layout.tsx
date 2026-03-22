"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { createClient } from "@/lib/supabase/client";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (pathname === "/admin/login") {
      setChecked(true);
      return;
    }

    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (!user) {
          router.replace("/admin/login");
        } else {
          setChecked(true);
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (!checked) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAFAF9" }}>
      <AdminSidebar />
      <div style={{ marginLeft: "240px" }}>{children}</div>
    </div>
  );
}

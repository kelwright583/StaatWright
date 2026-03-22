"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { createClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setAuthed(!!session?.user);
      setReady(true);

      if (session) {
        fetch("/api/auth/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          }),
        }).catch(() => {});
      } else if (_event === "SIGNED_OUT") {
        fetch("/api/auth/sync", { method: "DELETE" }).catch(() => {});
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (ready && !authed && pathname !== "/admin/login") {
      router.replace("/admin/login");
    }
  }, [ready, authed, pathname, router]);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (!ready || !authed) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAFAF9" }}>
      <AdminSidebar />
      <div style={{ marginLeft: "240px" }}>{children}</div>
    </div>
  );
}

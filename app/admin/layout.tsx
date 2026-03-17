import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAFAF9" }}>
      <AdminSidebar />
      {/* Main content area offset by sidebar width */}
      <div style={{ marginLeft: "240px" }}>
        {children}
      </div>
    </div>
  );
}

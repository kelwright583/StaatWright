export default function BookkeeperLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAFAF9" }}>
      {children}
    </div>
  );
}

import { NavBar } from "@/components/shared/NavBar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-grid" style={{ background: "var(--dark)" }}>
      <NavBar />
      <main className="container-wide py-8">{children}</main>
    </div>
  );
}

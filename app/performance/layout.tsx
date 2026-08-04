import PerformanceSidebar from "@/components/performance/PerformanceSidebar";

export default function PerformanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-950">
      <PerformanceSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

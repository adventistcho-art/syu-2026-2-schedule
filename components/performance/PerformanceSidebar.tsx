"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  LayoutDashboard,
  Settings,
  FileEdit,
  ChevronRight,
  University,
  Globe,
  Lock,
  CalendarDays,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePerformanceAuth } from "@/components/performance/usePerformanceAuth";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "학사일정 통합",
    href: "/schedule",
    icon: <CalendarDays className="w-4 h-4" />,
  },
  {
    label: "일정 취합 현황",
    href: "/schedule/admin",
    icon: <ClipboardList className="w-4 h-4" />,
    adminOnly: true,
  },
  {
    label: "공개 대시보드",
    href: "/performance/public",
    icon: <Globe className="w-4 h-4" />,
  },
  {
    label: "실적 입력",
    href: "/performance/input",
    icon: <FileEdit className="w-4 h-4" />,
  },
  {
    label: "종합 대시보드",
    href: "/performance/admin",
    icon: <LayoutDashboard className="w-4 h-4" />,
    adminOnly: true,
  },
  {
    label: "지표 마스터 설정",
    href: "/performance/settings",
    icon: <Settings className="w-4 h-4" />,
    adminOnly: true,
  },
];

export default function PerformanceSidebar() {
  const pathname = usePathname();
  const { checked, isAdmin } = usePerformanceAuth();

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className="w-60 min-h-screen bg-slate-900 border-r border-slate-800 flex flex-col">
      <div className="px-5 py-5 border-b border-slate-800">
        <Link
          href="/schedule"
          className="flex items-center gap-2 text-white hover:text-purple-300 transition-colors"
        >
          <University className="w-5 h-5 text-purple-400" />
          <span className="text-sm font-semibold">SYU 포털</span>
        </Link>
      </div>

      <div className="px-5 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2 text-purple-300">
          <BarChart3 className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">
            성과·학사 모듈
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-1">
        {!checked ? (
          <p className="px-3 py-2 text-xs text-slate-600">메뉴 확인 중...</p>
        ) : (
          visibleItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group",
                  isActive
                    ? "bg-purple-600 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <span
                  className={cn(
                    isActive
                      ? "text-white"
                      : "text-slate-500 group-hover:text-purple-400"
                  )}
                >
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {item.adminOnly && (
                  <Lock
                    className={cn(
                      "w-3 h-3",
                      isActive ? "text-purple-200" : "text-slate-600"
                    )}
                  />
                )}
                {isActive && (
                  <ChevronRight className="w-3 h-3 text-purple-200" />
                )}
              </Link>
            );
          })
        )}
      </nav>
    </aside>
  );
}

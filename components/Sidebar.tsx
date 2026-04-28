"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/finances", label: "Finances", icon: "💰" },
  { href: "/projects", label: "Projects", icon: "📁" },
  { href: "/schedule", label: "Schedule", icon: "🗓️" },
  { href: "/leads", label: "Leads", icon: "🎯" },
  { href: "/employees", label: "Employees", icon: "👥" },
  { href: "/analytics", label: "Analytics", icon: "📈" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white md:block">
      <div className="sticky top-0 flex h-screen flex-col">
        <div className="px-5 py-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">C</span>
            <span className="text-base font-semibold">ClimbOn</span>
          </Link>
          <p className="mt-1 text-xs text-slate-500">Business control center</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
                  (active
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900")
                }
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-4 text-xs text-slate-400">Local mode · SQLite</div>
      </div>
    </aside>
  );
}

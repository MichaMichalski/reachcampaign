"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Filter,
  Mail,
  FileText,
  FormInput,
  GitBranch,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const navSections = [
  {
    label: "Main",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Contacts", href: "/contacts", icon: Users },
      { name: "Segments", href: "/segments", icon: Filter },
    ],
  },
  {
    label: "Marketing",
    items: [
      { name: "Emails", href: "/emails", icon: Mail },
      { name: "Pages", href: "/pages", icon: FileText },
      { name: "Forms", href: "/forms", icon: FormInput },
    ],
  },
  {
    label: "Automation",
    items: [{ name: "Campaigns", href: "/campaigns", icon: GitBranch }],
  },
  {
    label: "Analytics",
    items: [{ name: "Reports", href: "/reports", icon: BarChart3 }],
  },
  {
    label: "System",
    items: [{ name: "Settings", href: "/settings", icon: Settings }],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col bg-slate-900 text-white transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-16 items-center border-b border-slate-700 px-4">
        <Link href="/" className="flex items-center gap-2 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white">
            R
          </div>
          {!collapsed && (
            <span className="whitespace-nowrap text-lg font-semibold tracking-tight">
              ReachCampaign
            </span>
          )}
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {navSections.map((section) => (
          <div key={section.label} className="mb-4">
            {!collapsed && (
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {section.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-slate-800 text-white"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white",
                        collapsed && "justify-center px-0"
                      )}
                      title={collapsed ? item.name : undefined}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.name}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex h-12 items-center justify-center border-t border-slate-700 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
      >
        {collapsed ? (
          <ChevronRight className="h-5 w-5" />
        ) : (
          <ChevronLeft className="h-5 w-5" />
        )}
      </button>
    </aside>
  );
}

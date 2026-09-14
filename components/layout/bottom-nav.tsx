"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Shield,
  Users,
  Receipt,
  Settings,
} from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutGrid,
      active: pathname === "/dashboard",
    },
    {
      label: "Records",
      href: "/insurance-records",
      icon: Shield,
      active: pathname.startsWith("/insurance-records"),
    },
    {
      label: "Customers",
      href: "/customers",
      icon: Users,
      active: pathname.startsWith("/customers"),
    },
    {
      label: "Ledger",
      href: "/outstanding-ledger",
      icon: Receipt,
      active: pathname.startsWith("/outstanding-ledger"),
    },
    {
      label: "Settings",
      href: "/settings",
      icon: Settings,
      active: pathname.startsWith("/settings"),
    },
  ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-1 sm:px-2 py-1 pb-[max(0.4rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.active;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-150 min-w-[54px] select-none active:scale-95 cursor-pointer relative ${
                isActive
                  ? "text-blue-600 font-semibold"
                  : "text-slate-500 hover:text-slate-900 font-medium"
              }`}
            >
              <div
                className={`relative flex items-center justify-center w-8 h-8 rounded-xl transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-105"
                    : "text-slate-500 hover:bg-slate-100/70"
                }`}
              >
                <Icon
                  className={`w-[18px] h-[18px] ${
                    isActive ? "stroke-[2.4] text-white" : "stroke-[1.8]"
                  }`}
                />
              </div>
              <span
                className={`text-[10px] mt-1 tracking-tight ${
                  isActive ? "font-bold text-blue-600" : "font-medium text-slate-500"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

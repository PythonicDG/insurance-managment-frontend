"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  Shield,
  Users,
  FileText,
  Receipt,
  BarChart2,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { authService } from "@/lib/api";

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  collapsed: controlledCollapsed,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("insure_sidebar_collapsed") === "true";
      } catch {
        return false;
      }
    }
    return false;
  });

  // Close mobile drawer on route change
  useEffect(() => {
    if (mobileOpen && onCloseMobile) {
      onCloseMobile();
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setInternalCollapsed(nextState);
    if (onToggleCollapse) {
      onToggleCollapse(nextState);
    }
    try {
      localStorage.setItem("insure_sidebar_collapsed", String(nextState));
    } catch {
      // Ignore
    }
  };

  const handleLogout = async () => {
    if (confirm("Are you sure you want to log out?")) {
      await authService.logout();
      router.push("/");
    }
  };

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutGrid,
      active: pathname === "/dashboard",
    },
    {
      label: "Insurance Records",
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
      label: "Documents",
      href: "/documents",
      icon: FileText,
      active: pathname.startsWith("/documents"),
    },
    {
      label: "Outstanding/Ledger",
      href: "/outstanding-ledger",
      icon: Receipt,
      active: pathname.startsWith("/outstanding-ledger"),
    },
    {
      label: "Reports",
      href: "/reports",
      icon: BarChart2,
      active: pathname.startsWith("/reports"),
    },
    {
      label: "Settings",
      href: "/settings",
      icon: Settings,
      active: pathname.startsWith("/settings"),
    },
  ];

  const renderNavLinks = (forMobile = false) => (
    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-none">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.active;

        return (
          <Link
            key={item.label}
            href={item.href}
            onClick={() => {
              if (forMobile && onCloseMobile) {
                onCloseMobile();
              }
            }}
            title={!forMobile && isCollapsed ? item.label : undefined}
            className={`flex items-center gap-3 rounded-xl transition-all duration-150 relative group ${
              !forMobile && isCollapsed
                ? "justify-center p-2.5"
                : "px-3.5 py-2.5"
            } ${
              isActive
                ? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30"
                : "text-slate-300 hover:text-white hover:bg-slate-800/80 font-medium"
            }`}
          >
            <Icon
              className={`w-[18px] h-[18px] shrink-0 ${
                isActive ? "text-white stroke-[2.4]" : "text-slate-400 group-hover:text-white"
              }`}
            />

            {(forMobile || !isCollapsed) && (
              <span className="text-sm truncate leading-none">
                {item.label}
              </span>
            )}

            {/* Floating Tooltip for Desktop Minimized state */}
            {!forMobile && isCollapsed && (
              <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs font-medium rounded-md shadow-lg border border-slate-700/80 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                {item.label}
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );

  return (
    <>
      {/* ================= DESKTOP SIDEBAR ================= */}
      <aside
        className={`hidden lg:flex relative flex-col h-screen bg-[#0b132b] text-white border-r border-slate-800/80 transition-all duration-300 ease-in-out z-30 shrink-0 ${
          isCollapsed ? "w-[74px]" : "w-64"
        }`}
      >
        {/* Brand Header */}
        <div
          className={`h-16 flex items-center px-4 border-b border-slate-800/60 shrink-0 ${
            isCollapsed ? "justify-center" : "justify-between"
          }`}
        >
          <Link
            href="/dashboard"
            className="flex items-center gap-3 overflow-hidden group focus:outline-none"
            title="InsureLedger"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0 group-hover:scale-105 transition-transform">
              <Shield className="w-4 h-4 fill-white/20 text-white stroke-[2.2]" />
            </div>

            {!isCollapsed && (
              <span className="text-base font-bold text-white tracking-tight whitespace-nowrap">
                InsureLedger
              </span>
            )}
          </Link>

          {/* Toggle Collapse Button */}
          {!isCollapsed && (
            <button
              onClick={toggleCollapse}
              type="button"
              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800/80 transition-colors cursor-pointer focus:outline-none"
              title="Minimize sidebar"
              aria-label="Minimize sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* When collapsed, expand button */}
        {isCollapsed && (
          <div className="pt-2 flex justify-center">
            <button
              onClick={toggleCollapse}
              type="button"
              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800/80 transition-colors cursor-pointer focus:outline-none"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Desktop Navigation Links */}
        {renderNavLinks(false)}

        {/* Dotted Divider */}
        <div className="px-4 py-1">
          <div className="border-t border-dotted border-slate-700/70" />
        </div>

        {/* Desktop Logout Button */}
        <div className="p-3 shrink-0">
          <button
            onClick={handleLogout}
            type="button"
            title={isCollapsed ? "Logout" : undefined}
            className={`w-full flex items-center gap-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all font-medium group cursor-pointer relative ${
              isCollapsed ? "justify-center p-2.5" : "px-3.5 py-2.5"
            }`}
          >
            <LogOut className="w-[18px] h-[18px] shrink-0 text-slate-400 group-hover:text-red-400 transition-colors" />

            {!isCollapsed && (
              <span className="text-sm leading-none">Logout</span>
            )}

            {isCollapsed && (
              <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs font-medium rounded-md shadow-lg border border-slate-700/80 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                Logout
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* ================= MOBILE DRAWER ================= */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop Blur Overlay */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            aria-hidden="true"
          />

          {/* Slide-out Panel */}
          <div className="relative flex flex-col w-[280px] max-w-[85vw] h-full bg-[#0b132b] text-white shadow-2xl z-50 animate-in slide-in-from-left duration-250">
            {/* Mobile Brand Header & Close */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80 shrink-0">
              <Link
                href="/dashboard"
                onClick={onCloseMobile}
                className="flex items-center gap-2.5 focus:outline-none"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                  <Shield className="w-4 h-4 fill-white/20 text-white stroke-[2.2]" />
                </div>
                <span className="text-base font-bold text-white tracking-tight">
                  InsureLedger
                </span>
              </Link>

              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Links */}
            {renderNavLinks(true)}

            {/* Dotted Divider */}
            <div className="px-4 py-1">
              <div className="border-t border-dotted border-slate-700/70" />
            </div>

            {/* Mobile Bottom Logout */}
            <div className="p-3 shrink-0 mb-safe pb-4">
              <button
                onClick={() => {
                  onCloseMobile?.();
                  handleLogout();
                }}
                type="button"
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all font-medium cursor-pointer"
              >
                <LogOut className="w-[18px] h-[18px] shrink-0 text-slate-400" />
                <span className="text-sm">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

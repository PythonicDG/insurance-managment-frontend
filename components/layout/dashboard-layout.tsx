"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { useInactivityTimer } from "@/hooks/use-inactivity-timer";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  onSearch?: (query: string) => void;
}

export function DashboardLayout({
  children,
  title = "Dashboard",
  subtitle,
  onSearch,
}: DashboardLayoutProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("insure_sidebar_collapsed") === "true";
    }
    return false;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  // Silent inactivity auto-logout (5 minutes timeout)
  useInactivityTimer({
    enabled: isAuthChecked,
  });

  useEffect(() => {
    // Check authentication: session must exist in sessionStorage (or migrate from localStorage)
    const timer = setTimeout(() => {
      if (typeof window !== "undefined") {
        let token = sessionStorage.getItem("insure_token");
        if (!token) {
          // If legacy token was in localStorage, migrate to sessionStorage
          token = localStorage.getItem("insure_token");
          if (token) {
            sessionStorage.setItem("insure_token", token);
            localStorage.removeItem("insure_token");
            const user = localStorage.getItem("insure_user");
            if (user) {
              sessionStorage.setItem("insure_user", user);
              localStorage.removeItem("insure_user");
            }
          }
        }

        if (!token) {
          router.replace("/");
          return;
        }
        setIsAuthChecked(true);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [router]);

  // Prevent flash before auth check
  if (!isAuthChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans">


      {/* Sidebar: Desktop collapsible & Mobile flyout drawer */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={setCollapsed}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <Header
          title={title}
          subtitle={subtitle}
          onSearch={onSearch}
        />

        {/* Scrollable Page Body with bottom padding for mobile navigation */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-8 pb-24 lg:pb-8 bg-[#f8fafc]">
          <div className="max-w-7xl mx-auto w-full">{children}</div>
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation */}
      <BottomNav />
    </div>
  );
}


"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { authService } from "@/lib/api";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  onSearch?: (query: string) => void;
  showAddRecord?: boolean;
  onAddRecord?: () => void;
}

export function DashboardLayout({
  children,
  title = "Dashboard",
  subtitle,
  onSearch,
  showAddRecord = true,
  onAddRecord,
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cachedUser = sessionStorage.getItem("insure_user");
    let cachedToken = sessionStorage.getItem("insure_token");

    // Restore from localStorage if rememberMe was used and sessionStorage is empty in this tab
    if (!cachedToken && typeof localStorage !== "undefined") {
      const localToken = localStorage.getItem("insure_token");
      if (localToken) {
        cachedToken = localToken;
        sessionStorage.setItem("insure_token", localToken);
      }
    }
    if (!cachedUser && typeof localStorage !== "undefined") {
      const localUser = localStorage.getItem("insure_user");
      if (localUser) {
        cachedUser = localUser;
        sessionStorage.setItem("insure_user", localUser);
      }
    }

    // If no session exists in either storage, redirect to login
    if (!cachedToken && !cachedUser) {
      router.replace("/");
      return;
    }

    // Session exists, allow rendering layout immediately
    setIsAuthChecked(true);

    // Verify active session with backend via HttpOnly cookie or token header
    authService
      .getProfile()
      .then((user) => {
        if (user) {
          sessionStorage.setItem("insure_user", JSON.stringify(user));
        }
        setIsAuthChecked(true);
      })
      .catch((err) => {
        // If unauthenticated or session expired (401), redirect to login
        if (err?.response?.status === 401) {
          sessionStorage.removeItem("insure_token");
          sessionStorage.removeItem("insure_user");
          sessionStorage.removeItem("insure_last_activity");
          localStorage.removeItem("insure_token");
          localStorage.removeItem("insure_user");
          localStorage.removeItem("insure_last_activity");
          router.replace("/?reason=session_expired");
        }
      });
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
          showAddRecord={showAddRecord}
          onAddRecord={onAddRecord}
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


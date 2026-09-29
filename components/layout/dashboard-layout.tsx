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

    let cancelled = false;

    const cachedUser = sessionStorage.getItem("insure_user");
    const cachedToken = sessionStorage.getItem("insure_token");

    // Purge persistent auth data created by older releases. UI preferences may
    // remain in localStorage, but credentials must never survive the tab.
    localStorage.removeItem("insure_token");
    localStorage.removeItem("insure_user");
    localStorage.removeItem("insure_last_activity");
    localStorage.removeItem("insure_remember_user");

    // If no session exists in either storage, redirect to login
    if (!cachedToken && !cachedUser) {
      router.replace("/");
      return;
    }

    // Do not render protected content until the backend confirms that this is
    // still the account's one active device.
    const verifyActiveSession = async () => {
      try {
        const user = await authService.getProfile();
        if (cancelled) return;

        if (user) {
          sessionStorage.setItem("insure_user", JSON.stringify(user));
        }
        setIsAuthChecked(true);
      } catch (err: unknown) {
        if (cancelled) return;

        const status =
          typeof err === "object" &&
          err !== null &&
          "response" in err &&
          typeof err.response === "object" &&
          err.response !== null &&
          "status" in err.response
            ? err.response.status
            : undefined;

        if (status === 401) {
          sessionStorage.removeItem("insure_token");
          sessionStorage.removeItem("insure_user");
          sessionStorage.removeItem("insure_last_activity");
          localStorage.removeItem("insure_token");
          localStorage.removeItem("insure_user");
          localStorage.removeItem("insure_last_activity");
          router.replace("/?reason=session_expired");
        }
      }
    };

    const verifyWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void verifyActiveSession();
      }
    };

    void verifyActiveSession();
    const sessionCheckInterval = window.setInterval(verifyActiveSession, 15_000);
    window.addEventListener("focus", verifyWhenVisible);
    document.addEventListener("visibilitychange", verifyWhenVisible);

    return () => {
      cancelled = true;
      window.clearInterval(sessionCheckInterval);
      window.removeEventListener("focus", verifyWhenVisible);
      document.removeEventListener("visibilitychange", verifyWhenVisible);
    };
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


"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Settings as SettingsIcon,
  KeyRound,
  LogOut,
  ShieldCheck,
  Plus,
} from "lucide-react";
import { authService, UserProfile } from "@/lib/api";
import { ChangePasswordModal } from "@/components/modals/change-password-modal";
import { NotificationPopover } from "@/components/layout/notification-popover";


interface HeaderProps {
  title?: string;
  subtitle?: string;
  onSearch?: (query: string) => void;
  onToggleMobileMenu?: () => void;
  showAddRecord?: boolean;
  onAddRecord?: () => void;
}

export function Header({
  title = "Dashboard",
  subtitle,
  onSearch,
  showAddRecord = true,
  onAddRecord,
}: HeaderProps) {
  const router = useRouter();
  const [currentUser] = useState<UserProfile | null>(() => {
    if (typeof window !== "undefined") {
      return authService.getCurrentUser();
    }
    return null;
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    if (confirm("Are you sure you want to log out?")) {
      await authService.logout();
      router.push("/");
    }
  };

  const displayName =
    currentUser?.first_name || currentUser?.username
      ? `${currentUser?.first_name || ""} ${currentUser?.last_name || ""}`.trim() ||
        currentUser?.username
      : "Arjun Kumar";

  const userRole = "Administrator";

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "AK";

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-20 shrink-0">
      {/* Left: Page Title & Subtitle */}
      <div className="flex flex-col justify-center min-w-0">
        <h1 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[11px] sm:text-xs text-slate-400 font-medium leading-tight mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      {/* Right Controls: Add Record Button, Notification Bell & Profile */}
      <div className="flex items-center gap-2 sm:gap-4 md:gap-5">
        {/* Add Record Button */}
        {showAddRecord &&
          (onAddRecord ? (
            <button
              type="button"
              onClick={onAddRecord}
              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-xs hover:shadow transition-all duration-150 cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
              title="Add New Insurance Record"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
              <span>Add Record</span>
            </button>
          ) : (
            <Link
              href="/insurance-records/new"
              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-xs hover:shadow transition-all duration-150 cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
              title="Add New Insurance Record"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
              <span>Add Record</span>
            </Link>
          ))}

        {/* Notification Bell with Today's Expired Records Popover */}
        <NotificationPopover />


        {/* User Profile Dropdown */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1 sm:p-1.5 rounded-xl hover:bg-slate-100/80 transition-colors focus:outline-none cursor-pointer"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            {/* Avatar Circle matching Figma */}
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
              {initials}
            </div>

            {/* User Details (Desktop/Tablet) */}
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-slate-800 leading-tight">
                {displayName}
              </p>
              <p className="text-[10px] text-slate-500 leading-tight">
                {userRole}
              </p>
            </div>

            {/* Chevron Icon */}
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 hidden sm:block ${
                dropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Profile Header */}
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 leading-tight truncate">
                  {displayName}
                </p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {currentUser?.email || "admin@insureledger.local"}
                </p>
                <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-medium border border-blue-100">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{userRole}</span>
                </div>
              </div>

              {/* Menu Links */}
              <div className="py-1">
                <Link
                  href="/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                >
                  <SettingsIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Settings &amp; Preferences</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    setIsChangePasswordOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors cursor-pointer text-left"
                >
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                  <span>Change Password</span>
                </button>
              </div>

              {/* Divider & Logout */}
              <div className="pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-600 hover:bg-red-50/70 transition-colors cursor-pointer text-left font-medium"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-500" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </header>
  );
}

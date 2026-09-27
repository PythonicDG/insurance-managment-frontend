"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Car,
  Clock,
  MessageCircle,
} from "lucide-react";
import {
  dashboardService,
  NotificationPolicyRecord,
  NotificationsResponse,
} from "@/lib/api";

const READ_STORAGE_KEY = "insure_read_notification_ids";

export function NotificationPopover() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<NotificationPolicyRecord[]>([]);
  const [readIds, setReadIds] = useState<number[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem(READ_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const popoverRef = useRef<HTMLDivElement>(null);

  // Fetch today's expired/expiring records
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data: NotificationsResponse = await dashboardService.getNotifications();
      setRecords(data.records || []);
      setLastFetched(new Date());
    } catch (err) {
      console.warn("Could not fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and periodically every 60 seconds
  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 60000);

    const handleFocus = () => {
      fetchNotifications();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchNotifications]);

  // Handle click outside to close popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Unread records count (records whose ID is not yet marked read)
  const unreadCount = records.filter((r) => !readIds.includes(r.id)).length;
  const totalCount = records.length;

  // Mark all currently visible records as read (clears badge for the session)
  const handleMarkAllAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    const allIds = records.map((r) => r.id);
    const updated = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(updated);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(READ_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Storage failure fallback
      }
    }
  };

  // Navigate to record in insurance records page
  const handleViewRecord = (policyNumber: string) => {
    setIsOpen(false);
    router.push(`/insurance-records?search=${encodeURIComponent(policyNumber)}`);
  };

  return (
    <div className="relative shrink-0" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) {
            fetchNotifications();
          }
        }}
        className={`relative p-2 rounded-xl transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
          isOpen
            ? "bg-blue-50 text-blue-700"
            : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/80"
        }`}
        title={
          unreadCount > 0
            ? `${unreadCount} policies expiring today`
            : "Notifications"
        }
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Today's Expired Records Notifications"
      >
        <Bell className="w-4 h-4" />

        {/* Unread Badge (Pill with Count or Dot) */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white shadow-xs animate-in zoom-in duration-150">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}

        {/* If all read but there are today's records, show a subtle amber indicator */}
        {unreadCount === 0 && totalCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white" />
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-84 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-0 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-slate-900 leading-tight">
                    Today&apos;s Expired Policies
                  </h3>
                  {totalCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      {totalCount}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                  Policies expiring or expired on today&apos;s date
                </p>
              </div>
            </div>

            {/* Quick Actions in Header */}
            {unreadCount > 0 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  title="Mark all as read (clears badge)"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors text-xs inline-flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-medium hidden sm:inline">
                    Read
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Body Content */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {loading && records.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-6 h-6 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500">Checking today&apos;s policies...</p>
              </div>
            ) : totalCount === 0 ? (
              /* Empty State */
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-bold text-slate-800">
                  No Policies Expiring Today
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 max-w-[240px] mx-auto leading-relaxed">
                  All customer policies are active and up to date. No records reach their expiry date today.
                </p>
                <div className="mt-4">
                  <Link
                    href="/insurance-records?status=expiring_soon"
                    onClick={() => setIsOpen(false)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    <span>Check 10-Day Expiring Policies</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ) : (
              /* Records List */
              records.map((rec) => {
                const isUnread = !readIds.includes(rec.id);
                const hasDue = rec.outstanding > 0;
                const cleanPhone = (rec.customer_phone || "").replace(/\D/g, "");

                return (
                  <div
                    key={rec.id}
                    className={`p-3.5 hover:bg-slate-50/80 transition-colors ${
                      isUnread ? "bg-amber-50/30" : ""
                    }`}
                  >
                    {/* Header Row: Customer & Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {rec.customer_name}
                          </h4>
                          {isUnread && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          Policy #{rec.policy_number}
                          {rec.insurance_company && rec.insurance_company !== "N/A"
                            ? ` • ${rec.insurance_company}`
                            : ""}
                        </p>
                      </div>

                      {/* Urgency Badge */}
                      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                        <ShieldAlert className="w-3 h-3" />
                        <span>Expires Today</span>
                      </span>
                    </div>

                    {/* Middle Info Row: Vehicle & Financials */}
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600 bg-slate-100/60 rounded-lg px-2.5 py-1.5">
                      <div className="flex items-center gap-1.5 font-medium truncate">
                        <Car className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-800">
                          {rec.vehicle_number}
                        </span>
                        {rec.vehicle_type && (
                          <span className="text-slate-400 font-normal">
                            ({rec.vehicle_type})
                          </span>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-bold text-slate-800">
                          ₹{rec.total_premium.toLocaleString("en-IN")}
                        </span>
                        {hasDue && (
                          <span className="text-[10px] text-amber-600 font-medium ml-1">
                            (Due: ₹{rec.outstanding.toLocaleString("en-IN")})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="mt-2.5 flex items-center justify-between gap-2 pt-1">
                      {/* Customer WhatsApp Contact Link */}
                      <div className="flex items-center gap-1">
                        {cleanPhone ? (
                          <a
                            href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
                              `Dear ${rec.customer_name}, your vehicle insurance policy #${rec.policy_number} (${rec.vehicle_number}) expires today (${rec.formatted_expiry_date}). Please contact us to renew immediately.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`WhatsApp ${rec.customer_name}`}
                            className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors inline-flex items-center gap-1"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-medium text-emerald-700">
                              WhatsApp
                            </span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">
                            No phone
                          </span>
                        )}
                      </div>

                      {/* Renew / View Record Button */}
                      <button
                        type="button"
                        onClick={() => handleViewRecord(rec.policy_number)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold transition-colors shadow-2xs cursor-pointer"
                      >
                        <span>Renew / View</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Note */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span className="truncate">
              ⚡ Clears automatically once renewed
            </span>
            <Link
              href="/insurance-records"
              onClick={() => setIsOpen(false)}
              className="text-blue-600 hover:text-blue-700 font-semibold hover:underline shrink-0 ml-2"
            >
              All Records
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

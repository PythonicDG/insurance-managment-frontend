"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronDown, Check, X } from "lucide-react";

export type DateFilterPreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "this_month"
  | "last_month"
  | "last_30"
  | "this_year"
  | "all"
  | "custom";

export interface DashboardDateRange {
  preset: DateFilterPreset;
  startDate?: string;
  endDate?: string;
  label: string;
}

interface DashboardDateFilterProps {
  value: DashboardDateRange;
  onChange: (range: DashboardDateRange) => void;
  disabled?: boolean;
}

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(dStr: string): string {
  if (!dStr) return "";
  try {
    const [y, m, d] = dStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dStr;
  }
}

export function computeRangeForPreset(preset: DateFilterPreset): {
  startDate?: string;
  endDate?: string;
  label: string;
} {
  const now = new Date();

  switch (preset) {
    case "today": {
      const todayStr = formatDateISO(now);
      return { startDate: todayStr, endDate: todayStr, label: "Today" };
    }
    case "yesterday": {
      const yest = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const yestStr = formatDateISO(yest);
      return { startDate: yestStr, endDate: yestStr, label: "Yesterday" };
    }
    case "this_week": {
      const day = now.getDay(); // 0 is Sun
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(now.setDate(diff));
      const startStr = formatDateISO(monday);
      const endStr = formatDateISO(new Date());
      return { startDate: startStr, endDate: endStr, label: "This Week" };
    }
    case "this_month": {
      const curYear = now.getFullYear();
      const curMonth = now.getMonth();
      const first = new Date(curYear, curMonth, 1);
      const last = new Date(curYear, curMonth + 1, 0);
      return {
        startDate: formatDateISO(first),
        endDate: formatDateISO(last),
        label: "This Month",
      };
    }
    case "last_month": {
      const curYear = now.getFullYear();
      const curMonth = now.getMonth();
      const first = new Date(curYear, curMonth - 1, 1);
      const last = new Date(curYear, curMonth, 0);
      return {
        startDate: formatDateISO(first),
        endDate: formatDateISO(last),
        label: "Last Month",
      };
    }
    case "last_30": {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return {
        startDate: formatDateISO(past),
        endDate: formatDateISO(now),
        label: "Last 30 Days",
      };
    }
    case "this_year": {
      const curYear = now.getFullYear();
      const first = new Date(curYear, 0, 1);
      const last = new Date(curYear, 11, 31);
      return {
        startDate: formatDateISO(first),
        endDate: formatDateISO(last),
        label: "This Year",
      };
    }
    case "all": {
      return { startDate: undefined, endDate: undefined, label: "All Time" };
    }
    default: {
      const todayStr = formatDateISO(now);
      return { startDate: todayStr, endDate: todayStr, label: "Today" };
    }
  }
}

export function DashboardDateFilter({
  value,
  onChange,
  disabled = false,
}: DashboardDateFilterProps) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [customStart, setCustomStart] = useState(value.startDate || "");
  const [customEnd, setCustomEnd] = useState(value.endDate || "");

  useEffect(() => {
    setCustomStart(value.startDate || "");
    setCustomEnd(value.endDate || "");
  }, [value.startDate, value.endDate]);

  // Close on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  const presets: { key: DateFilterPreset; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "this_week", label: "This Week" },
    { key: "this_month", label: "This Month" },
    { key: "last_month", label: "Last Month" },
    { key: "last_30", label: "Last 30 Days" },
    { key: "this_year", label: "This Year" },
    { key: "all", label: "All Time" },
  ];

  const handleSelectPreset = (preset: DateFilterPreset) => {
    const computed = computeRangeForPreset(preset);
    onChange({
      preset,
      startDate: computed.startDate,
      endDate: computed.endDate,
      label: computed.label,
    });
    setOpen(false);
  };

  const handleApplyCustom = () => {
    if (!customStart && !customEnd) {
      handleSelectPreset("today");
      return;
    }
    const start = customStart || customEnd;
    const end = customEnd || customStart;
    let label = `${formatDisplayDate(start)} – ${formatDisplayDate(end)}`;
    if (start === end) {
      label = formatDisplayDate(start);
    }
    onChange({
      preset: "custom",
      startDate: start,
      endDate: end,
      label,
    });
    setOpen(false);
  };

  const displayLabel = () => {
    if (value.preset === "custom" && value.startDate && value.endDate) {
      if (value.startDate === value.endDate) {
        return formatDisplayDate(value.startDate);
      }
      return `${formatDisplayDate(value.startDate)} – ${formatDisplayDate(value.endDate)}`;
    }
    return value.label || "Today";
  };

  return (
    <div className="relative w-full sm:w-auto" ref={popoverRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="w-full sm:w-auto inline-flex items-center justify-between sm:justify-start gap-2 px-3.5 py-2 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer disabled:opacity-50 min-w-0"
        title="Global date filter for dashboard metrics"
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          <CalendarIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="font-semibold text-slate-800 tracking-tight truncate">
            {displayLabel()}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
            open ? "rotate-180 text-blue-600" : ""
          }`}
        />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 sm:p-0 sm:inset-auto sm:absolute sm:left-0 sm:top-full sm:mt-2 sm:bg-transparent sm:backdrop-blur-none sm:block"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="w-full max-w-sm sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Dashboard Date Filter
                </span>
                <span className="text-[11px] text-slate-400">
                  Filters KPIs & Overview metrics
                </span>
              </div>
              <div className="flex items-center gap-2">
                {value.preset !== "today" && (
                  <button
                    type="button"
                    onClick={() => handleSelectPreset("today")}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="sm:hidden p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

          {/* Quick Presets */}
          <div className="grid grid-cols-2 gap-1.5 mb-3.5">
            {presets.map((p) => {
              const isActive = value.preset === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => handleSelectPreset(p.key)}
                  className={`flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? "bg-blue-50 text-blue-700 font-semibold border border-blue-200/60 shadow-2xs"
                      : "bg-slate-50/80 hover:bg-slate-100/80 text-slate-700 hover:text-slate-900"
                  }`}
                >
                  <span>{p.label}</span>
                  {isActive && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>
              );
            })}
          </div>

          {/* Custom Date Range */}
          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <span className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Custom Date Range
            </span>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCustom}
                disabled={!customStart && !customEnd}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}

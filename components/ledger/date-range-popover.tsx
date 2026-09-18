"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronDown, Check, X } from "lucide-react";

interface DateRangePopoverProps {
  fromDate: string;
  toDate: string;
  onChange: (from: string, to: string) => void;
}

export function DateRangePopover({ fromDate, toDate, onChange }: DateRangePopoverProps) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [tempFrom, setTempFrom] = useState(fromDate);
  const [tempTo, setTempTo] = useState(toDate);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    setTempFrom(fromDate);
    setTempTo(toDate);
  }, [fromDate, toDate]);

  // Format display string
  const formatDisplay = () => {
    if (!fromDate && !toDate) {
      return "All Time";
    }

    const fmt = (dStr: string) => {
      if (!dStr) return "";
      try {
        const [y, m, d] = dStr.split("-").map(Number);
        const date = new Date(y, m - 1, d);
        return date.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      } catch {
        return dStr;
      }
    };

    if (fromDate && toDate) {
      return `${fmt(fromDate)} – ${fmt(toDate)}`;
    }
    if (fromDate) return `From ${fmt(fromDate)}`;
    if (toDate) return `Until ${fmt(toDate)}`;
    return "All Time";
  };

  const applyPreset = (type: "this_month" | "last_month" | "last_30" | "this_year" | "all") => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth(); // 0-indexed

    const pad = (n: number) => String(n).padStart(2, "0");

    if (type === "this_month") {
      const first = `${curYear}-${pad(curMonth + 1)}-01`;
      const lastDay = new Date(curYear, curMonth + 1, 0).getDate();
      const last = `${curYear}-${pad(curMonth + 1)}-${pad(lastDay)}`;
      onChange(first, last);
      setOpen(false);
    } else if (type === "last_month") {
      const prevMonth = curMonth === 0 ? 11 : curMonth - 1;
      const prevYear = curMonth === 0 ? curYear - 1 : curYear;
      const first = `${prevYear}-${pad(prevMonth + 1)}-01`;
      const lastDay = new Date(prevYear, prevMonth + 1, 0).getDate();
      const last = `${prevYear}-${pad(prevMonth + 1)}-${pad(lastDay)}`;
      onChange(first, last);
      setOpen(false);
    } else if (type === "last_30") {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const first = `${past.getFullYear()}-${pad(past.getMonth() + 1)}-${pad(past.getDate())}`;
      const last = `${curYear}-${pad(curMonth + 1)}-${pad(now.getDate())}`;
      onChange(first, last);
      setOpen(false);
    } else if (type === "this_year") {
      const first = `${curYear}-01-01`;
      const last = `${curYear}-12-31`;
      onChange(first, last);
      setOpen(false);
    } else if (type === "all") {
      onChange("", "");
      setOpen(false);
    }
  };

  const handleApplyCustom = () => {
    onChange(tempFrom, tempTo);
    setOpen(false);
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer shadow-2xs min-h-[38px]"
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{formatDisplay()}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 mt-1.5 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-40 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800">Select Date Range</span>
            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={() => {
                  onChange("", "");
                  setTempFrom("");
                  setTempTo("");
                  setOpen(false);
                }}
                className="text-[11px] text-rose-600 hover:underline font-semibold cursor-pointer"
              >
                Clear Range
              </button>
            )}
          </div>

          {/* Presets Grid */}
          <div className="grid grid-cols-2 gap-1.5 mb-3.5">
            <button
              type="button"
              onClick={() => applyPreset("this_month")}
              className="px-2.5 py-1.5 text-left text-xs rounded-lg hover:bg-blue-50 hover:text-blue-700 font-medium text-slate-700 transition-colors cursor-pointer bg-slate-50/80"
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => applyPreset("last_month")}
              className="px-2.5 py-1.5 text-left text-xs rounded-lg hover:bg-blue-50 hover:text-blue-700 font-medium text-slate-700 transition-colors cursor-pointer bg-slate-50/80"
            >
              Last Month
            </button>
            <button
              type="button"
              onClick={() => applyPreset("last_30")}
              className="px-2.5 py-1.5 text-left text-xs rounded-lg hover:bg-blue-50 hover:text-blue-700 font-medium text-slate-700 transition-colors cursor-pointer bg-slate-50/80"
            >
              Last 30 Days
            </button>
            <button
              type="button"
              onClick={() => applyPreset("all")}
              className="px-2.5 py-1.5 text-left text-xs rounded-lg hover:bg-blue-50 hover:text-blue-700 font-medium text-slate-700 transition-colors cursor-pointer bg-slate-50/80"
            >
              All Time
            </button>
          </div>

          {/* Custom Date Inputs */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Custom Range
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">From</label>
                <input
                  type="date"
                  value={tempFrom}
                  onChange={(e) => setTempFrom(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">To</label>
                <input
                  type="date"
                  value={tempTo}
                  onChange={(e) => setTempTo(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
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
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

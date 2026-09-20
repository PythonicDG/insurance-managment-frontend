"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Check,
  Loader2,
  TrendingUp,
  X,
} from "lucide-react";
import { BusinessSummaryItem, dashboardService } from "@/lib/api";
import { formatINR } from "./dashboard-kpi-card";

interface BusinessSummaryChartProps {
  data?: BusinessSummaryItem[];
  loading?: boolean;
  refreshTrigger?: number;
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface YearMonth {
  year: number;
  month: number; // 1 to 12
}

function addMonths(ym: YearMonth, delta: number): YearMonth {
  const totalMonths = ym.year * 12 + (ym.month - 1) + delta;
  const year = Math.floor(totalMonths / 12);
  const month = (((totalMonths % 12) + 12) % 12) + 1;
  return { year, month };
}

function formatMonthKey(ym: YearMonth): string {
  return `${ym.year}-${String(ym.month).padStart(2, "0")}`;
}

function parseMonthKey(key: string): YearMonth {
  const parts = key.split("-").map(Number);
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { year: parts[0], month: parts[1] };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function formatSpanLabel(start: YearMonth, end: YearMonth): string {
  if (start.year === end.year) {
    return `${MONTH_NAMES[start.month - 1]} – ${MONTH_NAMES[end.month - 1]} ${end.year}`;
  }
  return `${MONTH_NAMES[start.month - 1]} ${start.year} – ${MONTH_NAMES[end.month - 1]} ${end.year}`;
}

export function BusinessSummaryChart({
  data = [],
  loading = false,
  refreshTrigger = 0,
}: BusinessSummaryChartProps) {
  const now = new Date();
  const currentYM: YearMonth = {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };

  // Default initial range: latest 6 months ending at current month
  const defaultEnd = currentYM;
  const defaultStart = addMonths(defaultEnd, -5);

  const [activeRange, setActiveRange] = useState<{
    start: YearMonth;
    end: YearMonth;
  }>({
    start: defaultStart,
    end: defaultEnd,
  });

  // Draft range for custom picker inside popover
  const [draftStart, setDraftStart] = useState<YearMonth>(defaultStart);
  const [draftEnd, setDraftEnd] = useState<YearMonth>(defaultEnd);

  const [chartData, setChartData] = useState<BusinessSummaryItem[]>(data);
  const [isFetching, setIsFetching] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [activePreset, setActivePreset] = useState<string>("last_6");

  const popoverRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  // Sync initial data once received from parent
  useEffect(() => {
    if (data && data.length > 0 && !hasInitialized.current) {
      setChartData(data);
      hasInitialized.current = true;
      const first = data[0];
      const last = data[data.length - 1];
      if (first?.month_key && last?.month_key) {
        const s = parseMonthKey(first.month_key);
        const e = parseMonthKey(last.month_key);
        setActiveRange({ start: s, end: e });
        setDraftStart(s);
        setDraftEnd(e);
      }
    }
  }, [data]);

  // Click outside listener for popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsPopoverOpen(false);
      }
    }
    if (isPopoverOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isPopoverOpen]);

  // Fetch Business Summary for a given 6-month window
  const loadBusinessSummary = useCallback(
    async (start: YearMonth, end: YearMonth) => {
      setIsFetching(true);
      try {
        const items = await dashboardService.getBusinessSummary({
          start_month: formatMonthKey(start),
          end_month: formatMonthKey(end),
        });
        setChartData(items);
        setActiveRange({ start, end });
      } catch (err) {
        console.error("Failed to load 6-month business summary:", err);
      } finally {
        setIsFetching(false);
      }
    },
    []
  );

  // Refresh data when parent triggers an explicit refresh (e.g. payment added)
  useEffect(() => {
    if (refreshTrigger > 0) {
      loadBusinessSummary(activeRange.start, activeRange.end);
    }
  }, [refreshTrigger, activeRange.start, activeRange.end, loadBusinessSummary]);

  // Handle stepping 1 month back (shifts 6-month window back by 1 month)
  const handlePrevMonth = () => {
    const newStart = addMonths(activeRange.start, -1);
    const newEnd = addMonths(activeRange.end, -1);
    setActivePreset("custom");
    setDraftStart(newStart);
    setDraftEnd(newEnd);
    loadBusinessSummary(newStart, newEnd);
  };

  // Handle stepping 1 month forward (shifts 6-month window forward by 1 month)
  const handleNextMonth = () => {
    const newStart = addMonths(activeRange.start, 1);
    const newEnd = addMonths(activeRange.end, 1);
    setActivePreset("custom");
    setDraftStart(newStart);
    setDraftEnd(newEnd);
    loadBusinessSummary(newStart, newEnd);
  };

  // Apply Quick Preset
  const handleApplyPreset = (presetKey: string) => {
    setActivePreset(presetKey);
    let s: YearMonth;
    let e: YearMonth;

    if (presetKey === "last_6") {
      e = currentYM;
      s = addMonths(e, -5);
    } else if (presetKey === "prev_6") {
      e = addMonths(currentYM, -6);
      s = addMonths(e, -5);
    } else if (presetKey === "h1_current") {
      s = { year: currentYM.year, month: 1 };
      e = { year: currentYM.year, month: 6 };
    } else if (presetKey === "h2_current") {
      s = { year: currentYM.year, month: 7 };
      e = { year: currentYM.year, month: 12 };
    } else if (presetKey === "h1_prev") {
      s = { year: currentYM.year - 1, month: 1 };
      e = { year: currentYM.year - 1, month: 6 };
    } else if (presetKey === "h2_prev") {
      s = { year: currentYM.year - 1, month: 7 };
      e = { year: currentYM.year - 1, month: 12 };
    } else {
      return;
    }

    setDraftStart(s);
    setDraftEnd(e);
    setIsPopoverOpen(false);
    loadBusinessSummary(s, e);
  };

  // When user changes Draft "From", automatically lock "To" to exactly 6 months later
  const handleDraftStartChange = (year: number, month: number) => {
    const newStart = { year, month };
    const newEnd = addMonths(newStart, 5);
    setDraftStart(newStart);
    setDraftEnd(newEnd);
    setActivePreset("custom");
  };

  // When user changes Draft "To", automatically lock "From" to exactly 6 months earlier
  const handleDraftEndChange = (year: number, month: number) => {
    const newEnd = { year, month };
    const newStart = addMonths(newEnd, -5);
    setDraftStart(newStart);
    setDraftEnd(newEnd);
    setActivePreset("custom");
  };

  // Apply custom 6-month range from popover
  const handleApplyCustom = () => {
    setIsPopoverOpen(false);
    loadBusinessSummary(draftStart, draftEnd);
  };

  // Reset to default latest 6 months
  const handleReset = () => {
    handleApplyPreset("last_6");
  };

  // Available year choices for dropdowns (current year - 4 to current year + 1)
  const availableYears = [
    currentYM.year + 1,
    currentYM.year,
    currentYM.year - 1,
    currentYM.year - 2,
    currentYM.year - 3,
  ];

  if (loading && chartData.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/70 shadow-xs h-[390px] flex flex-col justify-between animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-5 bg-slate-200 rounded w-44"></div>
          <div className="h-4 bg-slate-200 rounded w-52"></div>
        </div>
        <div className="flex-1 bg-slate-100 rounded-xl my-4"></div>
        <div className="flex justify-between">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-3 bg-slate-200 rounded w-8"></div>
          ))}
        </div>
      </div>
    );
  }

  // Calculate max value for scaling bars (minimum ceiling 10,000 to prevent divide-by-zero)
  const maxVal = Math.max(
    ...chartData.flatMap((d) => [d.premium_collected, d.outstanding]),
    10000
  );

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/70 shadow-xs flex flex-col justify-between h-[390px] relative">
      {/* Header Container */}
      <div className="flex flex-col gap-3 shrink-0">
        {/* Top Row: Title + 6-Month Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Business Summary</span>
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
              <TrendingUp className="w-3 h-3" />
              <span>6-Month Span</span>
            </span>
          </div>

          {/* Graph-specific 6-Month Filter Widget */}
          <div className="relative flex items-center gap-1.5" ref={popoverRef}>
            {/* Step 1 Month Back */}
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={isFetching}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors disabled:opacity-40 cursor-pointer"
              title="Shift 1 month backward"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Active Range Selector Button */}
            <button
              type="button"
              onClick={() => setIsPopoverOpen(!isPopoverOpen)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-all shadow-2xs hover:border-slate-300 cursor-pointer"
              title="Click to change 6-month range"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="whitespace-nowrap font-medium text-slate-800">
                {formatSpanLabel(activeRange.start, activeRange.end)}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                  isPopoverOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Step 1 Month Forward */}
            <button
              type="button"
              onClick={handleNextMonth}
              disabled={isFetching}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors disabled:opacity-40 cursor-pointer"
              title="Shift 1 month forward"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Popover Dropdown */}
            {isPopoverOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-3.5 sm:p-0 sm:inset-auto sm:absolute sm:right-0 sm:left-auto sm:top-full sm:mt-2 sm:bg-transparent sm:backdrop-blur-none sm:block"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setIsPopoverOpen(false);
                }}
              >
                <div
                  className="w-full max-w-[340px] sm:w-92 bg-white rounded-2xl shadow-2xl sm:shadow-xl border border-slate-200 p-4 z-50 text-slate-800 animate-in fade-in zoom-in-95 sm:origin-top-right duration-150 max-h-[90vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Select 6-Month Span
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Chart strictly displays a 6-month window
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleReset}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPopoverOpen(false)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-600 sm:hidden cursor-pointer"
                        title="Close"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                {/* Quick 6-Month Presets */}
                <div className="mb-3.5">
                  <div className="text-[11px] font-semibold text-slate-500 mb-1.5">
                    Quick Presets
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset("last_6")}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-left border transition-all cursor-pointer ${
                        activePreset === "last_6"
                          ? "bg-blue-50 border-blue-300 text-blue-700 font-semibold"
                          : "bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      Last 6 Months
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset("prev_6")}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-left border transition-all cursor-pointer ${
                        activePreset === "prev_6"
                          ? "bg-blue-50 border-blue-300 text-blue-700 font-semibold"
                          : "bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      Previous 6 Months
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset("h1_current")}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-left border transition-all cursor-pointer ${
                        activePreset === "h1_current"
                          ? "bg-blue-50 border-blue-300 text-blue-700 font-semibold"
                          : "bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      H1 ({currentYM.year}) Jan–Jun
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset("h2_current")}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-left border transition-all cursor-pointer ${
                        activePreset === "h2_current"
                          ? "bg-blue-50 border-blue-300 text-blue-700 font-semibold"
                          : "bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      H2 ({currentYM.year}) Jul–Dec
                    </button>
                  </div>
                </div>

                {/* Custom Month Span Selector (Locked to 6 months) */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-500 mb-2">
                    Custom 6-Month Range (Choose This to This)
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {/* From Month & Year */}
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                        From Month
                      </label>
                      <div className="grid grid-cols-2 gap-1">
                        <select
                          value={draftStart.month}
                          onChange={(e) =>
                            handleDraftStartChange(
                              draftStart.year,
                              Number(e.target.value)
                            )
                          }
                          className="w-full text-xs font-medium py-1.5 px-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {MONTH_NAMES.map((name, i) => (
                            <option key={i + 1} value={i + 1}>
                              {name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={draftStart.year}
                          onChange={(e) =>
                            handleDraftStartChange(
                              Number(e.target.value),
                              draftStart.month
                            )
                          }
                          className="w-full text-xs font-medium py-1.5 px-1 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {availableYears.map((yr) => (
                            <option key={yr} value={yr}>
                              {yr}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* To Month & Year (Auto-synced to 6 months) */}
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                        To Month
                      </label>
                      <div className="grid grid-cols-2 gap-1">
                        <select
                          value={draftEnd.month}
                          onChange={(e) =>
                            handleDraftEndChange(
                              draftEnd.year,
                              Number(e.target.value)
                            )
                          }
                          className="w-full text-xs font-medium py-1.5 px-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {MONTH_NAMES.map((name, i) => (
                            <option key={i + 1} value={i + 1}>
                              {name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={draftEnd.year}
                          onChange={(e) =>
                            handleDraftEndChange(
                              Number(e.target.value),
                              draftEnd.month
                            )
                          }
                          className="w-full text-xs font-medium py-1.5 px-1 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {availableYears.map((yr) => (
                            <option key={yr} value={yr}>
                              {yr}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Visual confirmation badge */}
                  <div className="mb-3 px-2.5 py-2 rounded-lg bg-emerald-50 border border-emerald-200/80 text-[11px] font-medium text-emerald-800 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                      <span>Span: {formatSpanLabel(draftStart, draftEnd)}</span>
                    </span>
                    <span className="font-bold text-[10px] uppercase bg-emerald-200/70 text-emerald-900 px-1.5 py-0.5 rounded">
                      6 Mos
                    </span>
                  </div>

                  {/* Apply Button */}
                  <button
                    type="button"
                    onClick={handleApplyCustom}
                    className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Apply 6-Month Range</span>
                  </button>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Legend Row */}
        <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-2.5">
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Monthly premium collected vs. outstanding balance
          </span>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-600 ml-auto">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block shrink-0"></span>
              <span>Premium Collected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block shrink-0"></span>
              <span>Outstanding</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="flex-1 flex flex-col justify-end pt-4 pb-2 min-h-0 relative">
        {/* Horizontal reference grid lines */}
        <div className="absolute inset-x-0 inset-y-4 flex flex-col justify-between pointer-events-none opacity-40">
          <div className="border-b border-slate-200/70 w-full"></div>
          <div className="border-b border-slate-200/70 w-full"></div>
          <div className="border-b border-slate-200/70 w-full"></div>
          <div className="border-b border-slate-200/70 w-full"></div>
        </div>

        {/* Loading Overlay */}
        {isFetching && (
          <div className="absolute inset-0 bg-white/75 backdrop-blur-[1px] rounded-xl flex items-center justify-center z-20 transition-opacity">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white shadow-sm border border-slate-200 text-xs font-semibold text-slate-700">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              <span>Updating 6-month data...</span>
            </div>
          </div>
        )}

        {/* Bars Container - strictly 6 months, overflow-visible so tooltip can render cleanly */}
        <div className="flex items-end justify-between gap-2 sm:gap-4 md:gap-6 h-[200px] px-2 sm:px-4 relative z-10 w-full overflow-visible">
          {chartData.map((item, idx) => {
            const collHeightPct =
              maxVal > 0 ? (item.premium_collected / maxVal) * 100 : 0;
            const outHeightPct =
              maxVal > 0 ? (item.outstanding / maxVal) * 100 : 0;
            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={`${item.year}-${item.month}-${idx}`}
                className={`flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative min-w-0 rounded-xl transition-colors py-1 ${
                  isHovered ? "bg-slate-100/60" : "bg-transparent"
                }`}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => setHoveredIdx(hoveredIdx === idx ? null : idx)}
              >
                {/* Tooltip */}
                {isHovered && (
                  <div
                    className={`absolute bottom-[calc(100%+8px)] z-40 bg-slate-900/95 backdrop-blur-xs text-white rounded-xl py-2 px-3 text-xs shadow-2xl pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 ring-1 ring-white/10 ${
                      idx === 0
                        ? "left-0"
                        : idx === chartData.length - 1
                        ? "right-0"
                        : "left-1/2 -translate-x-1/2"
                    }`}
                  >
                    <div className="font-semibold border-b border-slate-700/80 pb-1 mb-1.5 text-[11px] text-slate-300">
                      {item.month} {item.year}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-3 text-emerald-400">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span>Collected:</span>
                        </span>
                        <span className="font-semibold tabular-nums">
                          {formatINR(item.premium_collected)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-rose-400">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                          <span>Outstanding:</span>
                        </span>
                        <span className="font-semibold tabular-nums">
                          {formatINR(item.outstanding)}
                        </span>
                      </div>
                    </div>

                    {/* Tooltip Caret Pointer */}
                    <div
                      className={`absolute -bottom-1 w-2 h-2 bg-slate-900 rotate-45 ${
                        idx === 0
                          ? "left-5"
                          : idx === chartData.length - 1
                          ? "right-5"
                          : "left-1/2 -translate-x-1/2"
                      }`}
                    />
                  </div>
                )}

                {/* Grouped Dual Bars */}
                <div className="w-full flex-1 flex items-end justify-center gap-1 sm:gap-1.5 md:gap-2 min-h-0">
                  {/* Blue Bar: Premium Collected */}
                  <div
                    className="w-3 sm:w-4.5 md:w-5 bg-blue-600 rounded-t-sm sm:rounded-t transition-all duration-300 group-hover:brightness-110 hover:brightness-110 shrink-0"
                    style={{
                      height: `${Math.max(collHeightPct, 4)}%`,
                    }}
                  />

                  {/* Red/Coral Bar: Outstanding */}
                  <div
                    className="w-3 sm:w-4.5 md:w-5 bg-red-600 rounded-t-sm sm:rounded-t transition-all duration-300 group-hover:brightness-110 hover:brightness-110 shrink-0"
                    style={{
                      height: `${Math.max(outHeightPct, 4)}%`,
                    }}
                  />
                </div>

                {/* Month Label */}
                <span
                  className={`mt-2 shrink-0 text-[11px] sm:text-xs font-semibold transition-colors duration-150 truncate max-w-full text-center ${
                    isHovered ? "text-blue-600 font-bold" : "text-slate-500"
                  }`}
                >
                  {item.month}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


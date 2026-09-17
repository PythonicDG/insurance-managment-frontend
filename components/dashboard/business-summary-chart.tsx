"use client";

import React, { useState } from "react";
import { BusinessSummaryItem } from "@/lib/api";
import { formatINR } from "./dashboard-kpi-card";

interface BusinessSummaryChartProps {
  data: BusinessSummaryItem[];
  loading?: boolean;
}

export function BusinessSummaryChart({ data, loading = false }: BusinessSummaryChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/70 shadow-xs h-[380px] flex flex-col justify-between animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-5 bg-slate-200 rounded w-40"></div>
          <div className="h-4 bg-slate-200 rounded w-48"></div>
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

  // Calculate max value for scaling bars
  const maxVal = Math.max(
    ...data.flatMap((d) => [d.premium_collected, d.outstanding]),
    10000
  );

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/70 shadow-xs flex flex-col justify-between h-[380px] relative">
      {/* Header & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <h3 className="text-base font-bold text-slate-900 tracking-tight">
          Business Summary
        </h3>

        {/* Legend matching screenshot */}
        <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
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

      {/* Chart Canvas */}
      <div className="flex-1 flex flex-col justify-end pt-6 pb-2 min-h-0 relative">
        {/* Horizontal reference grid lines */}
        <div className="absolute inset-x-0 inset-y-6 flex flex-col justify-between pointer-events-none opacity-40">
          <div className="border-b border-slate-200/70 w-full"></div>
          <div className="border-b border-slate-200/70 w-full"></div>
          <div className="border-b border-slate-200/70 w-full"></div>
          <div className="border-b border-slate-200/70 w-full"></div>
        </div>

        {/* Bars Container */}
        <div className="flex items-end justify-between gap-2 sm:gap-6 h-[220px] px-2 sm:px-6 relative z-10">
          {data.map((item, idx) => {
            const collHeightPct = maxVal > 0 ? (item.premium_collected / maxVal) * 100 : 0;
            const outHeightPct = maxVal > 0 ? (item.outstanding / maxVal) * 100 : 0;
            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute -top-20 z-30 bg-slate-900 text-white rounded-xl py-2 px-3 text-xs shadow-xl pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
                    <div className="font-semibold border-b border-slate-700 pb-1 mb-1 text-[11px] text-slate-300">
                      {item.month} {item.year}
                    </div>
                    <div className="flex items-center justify-between gap-3 text-emerald-400">
                      <span>Collected:</span>
                      <span className="font-medium">{formatINR(item.premium_collected)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-rose-400">
                      <span>Outstanding:</span>
                      <span className="font-medium">{formatINR(item.outstanding)}</span>
                    </div>
                  </div>
                )}

                {/* Grouped Dual Bars */}
                <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-full">
                  {/* Blue Bar: Premium Collected */}
                  <div
                    className="w-3.5 sm:w-5 md:w-6 bg-blue-600 rounded-t-sm sm:rounded-t transition-all duration-300 hover:brightness-110"
                    style={{
                      height: `${Math.max(collHeightPct, 4)}%`,
                    }}
                  />

                  {/* Red/Coral Bar: Outstanding */}
                  <div
                    className="w-3.5 sm:w-5 md:w-6 bg-red-600 rounded-t-sm sm:rounded-t transition-all duration-300 hover:brightness-110"
                    style={{
                      height: `${Math.max(outHeightPct, 4)}%`,
                    }}
                  />
                </div>

                {/* Month Label */}
                <span
                  className={`mt-2 text-xs font-semibold transition-colors duration-150 ${
                    isHovered ? "text-blue-600" : "text-slate-500"
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

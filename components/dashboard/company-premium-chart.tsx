"use client";

import React, { useState } from "react";
import { Building2, TrendingUp, ShieldCheck } from "lucide-react";
import { CompanyWiseSummaryItem } from "@/lib/api";
import { formatINR } from "./dashboard-kpi-card";

interface CompanyPremiumChartProps {
  data: CompanyWiseSummaryItem[];
  loading?: boolean;
}

export function CompanyPremiumChart({ data, loading = false }: CompanyPremiumChartProps) {
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/70 shadow-xs animate-pulse">
        <div className="flex items-center justify-between mb-6">
          <div className="h-5 bg-slate-200 rounded w-72"></div>
          <div className="h-4 bg-slate-200 rounded w-24"></div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <div className="h-4 bg-slate-200 rounded w-36"></div>
                <div className="h-4 bg-slate-200 rounded w-20"></div>
              </div>
              <div className="h-3 bg-slate-100 rounded-full w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Find top company and highest values
  const totalAllCompanies = data.reduce((acc, c) => acc + c.total_premium, 0);
  const totalCollectedAll = data.reduce((acc, c) => acc + c.premium_collected, 0);
  const overallEfficiency = totalAllCompanies > 0 ? Math.round((totalCollectedAll / totalAllCompanies) * 100) : 0;
  const maxCompanyPremium = Math.max(...data.map((c) => c.total_premium), 1);

  // Palette of subtle, elegant colors for companies
  const companyColors = [
    { bar: "bg-blue-600", light: "bg-blue-50 text-blue-700" },
    { bar: "bg-indigo-600", light: "bg-indigo-50 text-indigo-700" },
    { bar: "bg-teal-600", light: "bg-teal-50 text-teal-700" },
    { bar: "bg-violet-600", light: "bg-violet-50 text-violet-700" },
    { bar: "bg-emerald-600", light: "bg-emerald-50 text-emerald-700" },
    { bar: "bg-cyan-600", light: "bg-cyan-50 text-cyan-700" },
  ];

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/70 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            Insurance Company Wise Premium Collection
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Breakdown of premium booked and collected by insurer
          </p>
        </div>

        {/* Quick Highlights Pill */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200/70 text-xs font-medium text-slate-700">
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            <span>Avg Collection:</span>
            <span className="font-bold text-slate-900">{overallEfficiency}%</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-xs font-semibold text-blue-700">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>{data.length} Insurers</span>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="pt-5 space-y-4">
        {data.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs font-medium">
            No company premium data available yet.
          </div>
        ) : (
          data.slice(0, 6).map((comp, idx) => {
            const color = companyColors[idx % companyColors.length];
            const isHovered = hoveredId === comp.company_id;
            const barWidth = Math.max(8, Math.round((comp.total_premium / maxCompanyPremium) * 100));
            const collPct = comp.total_premium > 0 ? Math.round((comp.premium_collected / comp.total_premium) * 100) : 0;

            return (
              <div
                key={comp.company_id}
                className={`p-3 rounded-xl transition-colors cursor-pointer border ${
                  isHovered ? "bg-slate-50/80 border-slate-200" : "bg-transparent border-transparent"
                }`}
                onMouseEnter={() => setHoveredId(comp.company_id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Top Label Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${color.light}`}>
                      #{idx + 1}
                    </span>
                    <span className="text-xs sm:text-[13px] font-bold text-slate-800 tracking-tight">
                      {comp.company_name}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">
                      ({comp.policy_count} policies)
                    </span>
                  </div>

                  {/* Amount Breakdown */}
                  <div className="flex items-center gap-3 text-xs">
                    <div className="text-right">
                      <span className="text-slate-400 text-[11px] mr-1">Collected:</span>
                      <span className="font-bold text-emerald-600">{formatINR(comp.premium_collected)}</span>
                    </div>
                    <span className="text-slate-300">/</span>
                    <div className="text-right">
                      <span className="text-slate-400 text-[11px] mr-1">Total:</span>
                      <span className="font-semibold text-slate-800">{formatINR(comp.total_premium)}</span>
                    </div>
                  </div>
                </div>

                {/* Dual Progress Bar: Outer is total volume, inner is collected */}
                <div className="relative w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  {/* Total volume bar */}
                  <div
                    className={`h-full rounded-full ${color.bar} opacity-20 absolute left-0 top-0 transition-all duration-500`}
                    style={{ width: `${barWidth}%` }}
                  />
                  {/* Collected amount filled bar */}
                  <div
                    className={`h-full rounded-full ${color.bar} absolute left-0 top-0 transition-all duration-500`}
                    style={{ width: `${(barWidth * collPct) / 100}%` }}
                  />
                </div>

                {/* Bottom Mini Metrics */}
                <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-500">
                  <span>
                    Share: <strong className="text-slate-700">{comp.share_percentage}%</strong> of portfolio
                  </span>
                  <span>
                    Collection Rate:{" "}
                    <strong className={collPct >= 80 ? "text-emerald-600" : "text-amber-600"}>
                      {collPct}%
                    </strong>
                    {comp.outstanding > 0 && (
                      <span className="text-slate-400 ml-1.5">
                        (Bal: {formatINR(comp.outstanding)})
                      </span>
                    )}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { FilePlus2, CheckCircle2, AlertOctagon } from "lucide-react";
import { DashboardKpiMetrics } from "@/lib/api";

export function formatINR(val: number | string | undefined | null): string {
  const num = typeof val === "number" ? val : parseFloat(String(val || 0));
  if (isNaN(num)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

interface DashboardKpiCardsProps {
  kpis: DashboardKpiMetrics;
  loading?: boolean;
  filterLabel?: string;
}

export function DashboardKpiCards({
  kpis,
  loading = false,
  filterLabel = "All Time",
}: DashboardKpiCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/70 shadow-xs animate-pulse"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 bg-slate-200 rounded w-28"></div>
              <div className="w-8 h-8 rounded-lg bg-slate-200"></div>
            </div>
            <div className="h-7 bg-slate-200 rounded w-36 mt-4"></div>
          </div>
        ))}
      </div>
    );
  }

  const isToday = filterLabel?.toLowerCase() === "today";
  const isAllTime = !filterLabel || filterLabel.toLowerCase() === "all time";

  const getCardTitle = (metric: "entries" | "premium" | "received") => {
    if (isToday) {
      if (metric === "entries") return "Today's Entries";
      if (metric === "premium") return "Today's Total Premium";
      return "Today's Received Amount";
    }
    if (isAllTime) {
      if (metric === "entries") return "Total Entries";
      if (metric === "premium") return "Total Premium";
      return "Total Received Amount";
    }
    if (filterLabel && filterLabel.length <= 15) {
      if (metric === "entries") return `${filterLabel}'s Entries`;
      if (metric === "premium") return `${filterLabel}'s Premium`;
      return `${filterLabel}'s Received`;
    }
    if (metric === "entries") return "Entries";
    if (metric === "premium") return "Total Premium";
    return "Received Amount";
  };

  const cards = [
    {
      title: getCardTitle("entries"),
      subtitle: !isToday ? filterLabel : undefined,
      value: kpis.today_entries.toLocaleString("en-IN"),
      valueColor: "text-slate-900",
      iconType: "entries",
      badgeBg: "bg-blue-50 text-blue-600",
    },
    {
      title: getCardTitle("premium"),
      subtitle: !isToday ? filterLabel : undefined,
      value: formatINR(kpis.today_premium),
      valueColor: "text-slate-900",
      iconType: "rupee",
      badgeBg: "bg-blue-50 text-blue-600",
    },
    {
      title: getCardTitle("received"),
      subtitle: !isToday ? filterLabel : undefined,
      value: formatINR(kpis.today_received),
      valueColor: "text-emerald-600",
      iconType: "check",
      badgeBg: "bg-emerald-50 text-emerald-600",
    },
    {
      title: isToday || isAllTime ? "Total Outstanding" : "Outstanding (Period)",
      subtitle: !isToday ? filterLabel : undefined,
      value: formatINR(kpis.total_outstanding),
      valueColor: "text-rose-600",
      iconType: "alert",
      badgeBg: "bg-rose-50 text-rose-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/70 shadow-xs hover:shadow-md transition-shadow duration-200 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-[13px] font-medium text-slate-500 tracking-tight">
              {card.title}
            </span>
            <div
              className={`w-8 h-8 rounded-lg ${card.badgeBg} flex items-center justify-center shrink-0`}
            >
              {card.iconType === "entries" && <FilePlus2 className="w-4 h-4" />}
              {card.iconType === "rupee" && (
                <span className="font-bold text-sm leading-none">₹</span>
              )}
              {card.iconType === "check" && <CheckCircle2 className="w-4 h-4" />}
              {card.iconType === "alert" && <AlertOctagon className="w-4 h-4" />}
            </div>
          </div>

          <div className="mt-3 sm:mt-4">
            <div className={`text-2xl sm:text-[28px] font-bold tracking-tight ${card.valueColor}`}>
              {card.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

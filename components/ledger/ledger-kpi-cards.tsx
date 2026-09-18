"use client";

import React from "react";
import { LedgerSummary } from "@/lib/api";

interface LedgerKpiCardsProps {
  summary: LedgerSummary | null;
  loading?: boolean;
}

export function formatINR(val: number | string | undefined | null): string {
  const num = typeof val === "number" ? val : parseFloat(String(val || 0));
  if (isNaN(num)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

export function LedgerKpiCards({ summary, loading = false }: LedgerKpiCardsProps) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs animate-pulse"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 bg-slate-200 rounded w-28" />
              <div className="w-8 h-1.5 bg-slate-200 rounded-full" />
            </div>
            <div className="h-8 bg-slate-200 rounded w-36 mt-4" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Total Outstanding",
      value: formatINR(summary.total_outstanding),
      valueColor: "text-red-500",
      indicatorColor: "bg-rose-200",
    },
    {
      title: "Total Customers Pending",
      value: summary.total_customers_pending.toLocaleString("en-IN"),
      valueColor: "text-slate-900",
      indicatorColor: "bg-blue-100",
    },
    {
      title: "Total Amount Received",
      value: formatINR(summary.total_received),
      valueColor: "text-emerald-500",
      indicatorColor: "bg-emerald-200",
    },
    {
      title: "Total Premium",
      value: formatINR(summary.total_premium),
      valueColor: "text-slate-900",
      indicatorColor: "bg-blue-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all duration-200 flex flex-col justify-between"
        >
          {/* Top row: Title and Pill Indicator */}
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-[13px] font-medium text-slate-500 tracking-tight">
              {card.title}
            </span>
            <div className={`w-8 h-1.5 rounded-full ${card.indicatorColor} shrink-0`} />
          </div>

          {/* Bottom row: Value */}
          <div className="mt-4 sm:mt-5">
            <div className={`text-2xl sm:text-[28px] font-bold tracking-tight ${card.valueColor}`}>
              {card.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

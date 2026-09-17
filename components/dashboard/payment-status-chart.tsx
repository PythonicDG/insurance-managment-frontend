"use client";

import React, { useState } from "react";
import { PaymentStatusSummary } from "@/lib/api";
import { formatINR } from "./dashboard-kpi-card";

interface PaymentStatusChartProps {
  data: PaymentStatusSummary;
  loading?: boolean;
}

export function PaymentStatusChart({ data, loading = false }: PaymentStatusChartProps) {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/70 shadow-xs h-[380px] flex flex-col justify-between animate-pulse">
        <div className="h-5 bg-slate-200 rounded w-44"></div>
        <div className="flex items-center justify-around my-auto">
          <div className="w-36 h-36 rounded-full bg-slate-100"></div>
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 rounded w-28"></div>
            <div className="h-4 bg-slate-200 rounded w-28"></div>
            <div className="h-4 bg-slate-200 rounded w-28"></div>
          </div>
        </div>
      </div>
    );
  }

  const total = data.total_policies || 0;
  const paidCount = data.paid?.count || 0;
  const partialCount = data.partial?.count || 0;
  const outstandingCount = data.outstanding?.count || 0;

  // SVG Donut calculation
  const radius = 60;
  const strokeWidth = 18;
  const circumference = 2 * Math.PI * radius;

  const paidPct = total > 0 ? paidCount / total : 0;
  const partialPct = total > 0 ? partialCount / total : 0;
  const outstandingPct = total > 0 ? outstandingCount / total : 0;

  const paidStroke = circumference * paidPct;
  const partialStroke = circumference * partialPct;
  const outstandingStroke = circumference * outstandingPct;

  const paidOffset = 0;
  const partialOffset = -paidStroke;
  const outstandingOffset = -(paidStroke + partialStroke);

  const statuses = [
    {
      key: "paid",
      label: "Paid",
      count: paidCount,
      amount: data.paid?.amount || 0,
      pct: data.paid?.percentage || 0,
      dotBg: "bg-emerald-600",
      textColor: "text-emerald-700",
    },
    {
      key: "partial",
      label: "Partial",
      count: partialCount,
      amount: data.partial?.amount || 0,
      pct: data.partial?.percentage || 0,
      dotBg: "bg-amber-600",
      textColor: "text-amber-700",
    },
    {
      key: "outstanding",
      label: "Outstanding",
      count: outstandingCount,
      amount: data.outstanding?.amount || 0,
      pct: data.outstanding?.percentage || 0,
      dotBg: "bg-red-600",
      textColor: "text-red-700",
    },
  ];

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/70 shadow-xs flex flex-col justify-between h-[380px]">
      {/* Header */}
      <div className="shrink-0">
        <h3 className="text-base font-bold text-slate-900 tracking-tight">
          Payment Status Summary
        </h3>
      </div>

      {/* Donut and Legend Body */}
      <div className="flex-1 flex flex-col sm:flex-row items-center justify-center sm:justify-around gap-6 py-2">
        {/* Donut SVG */}
        <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
            {/* Background circle track */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="transparent"
              stroke="#f1f5f9"
              strokeWidth={strokeWidth}
            />

            {total > 0 ? (
              <>
                {/* Paid Segment (Emerald) */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="transparent"
                  stroke="#059669"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${paidStroke} ${circumference}`}
                  strokeDashoffset={paidOffset}
                  className="transition-all duration-300 cursor-pointer hover:opacity-90"
                  onMouseEnter={() => setHoveredSegment("paid")}
                  onMouseLeave={() => setHoveredSegment(null)}
                />

                {/* Partial Segment (Amber) */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="transparent"
                  stroke="#d97706"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${partialStroke} ${circumference}`}
                  strokeDashoffset={partialOffset}
                  className="transition-all duration-300 cursor-pointer hover:opacity-90"
                  onMouseEnter={() => setHoveredSegment("partial")}
                  onMouseLeave={() => setHoveredSegment(null)}
                />

                {/* Outstanding Segment (Red) */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="transparent"
                  stroke="#dc2626"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${outstandingStroke} ${circumference}`}
                  strokeDashoffset={outstandingOffset}
                  className="transition-all duration-300 cursor-pointer hover:opacity-90"
                  onMouseEnter={() => setHoveredSegment("outstanding")}
                  onMouseLeave={() => setHoveredSegment(null)}
                />
              </>
            ) : null}
          </svg>

          {/* Center text matching screenshot */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-2xl font-bold text-slate-900 tracking-tight leading-none">
              {total.toLocaleString("en-IN")}
            </span>
            <span className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-wider">
              Policies
            </span>
          </div>
        </div>

        {/* Breakdown List matching screenshot */}
        <div className="flex flex-col justify-center space-y-3.5 min-w-[140px] shrink-0">
          {statuses.map((item) => {
            const isHovered = hoveredSegment === item.key;
            return (
              <div
                key={item.key}
                className={`flex items-center justify-between gap-6 p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isHovered ? "bg-slate-50" : ""
                }`}
                onMouseEnter={() => setHoveredSegment(item.key)}
                onMouseLeave={() => setHoveredSegment(null)}
                title={`Amount: ${formatINR(item.amount)} (${item.pct}%)`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${item.dotBg} shrink-0`}></span>
                  <span className="text-xs font-semibold text-slate-700">
                    {item.label}
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-900 tabular-nums">
                  {item.count.toLocaleString("en-IN")}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

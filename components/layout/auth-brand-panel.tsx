"use client";

import React from "react";
import { Shield, Check, TrendingUp, FileText } from "lucide-react";

export function AuthBrandPanel() {
  const features = [
    "Centralized record & ledger management",
    "Automatic outstanding balance tracking",
    "Daily, monthly & yearly reports",
    "Secure document storage & retrieval",
  ];

  return (
    <div className="w-full lg:w-[48%] xl:w-[45%] bg-[#f3f7fd] p-8 sm:p-12 lg:p-16 flex flex-col justify-between min-h-full border-r border-slate-200/50">
      {/* Brand Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <Shield className="w-4 h-4 fill-white/20 text-white stroke-[2.2]" />
        </div>
        <span className="text-lg font-bold text-slate-900 tracking-tight">
          InsureLedger
        </span>
      </div>

      {/* Main Content Area */}
      <div className="my-10 lg:my-auto max-w-lg">
        {/* Main Heading */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-[1.18]">
          Insurance Records &amp; Ledger Management
        </h1>

        {/* Subtitle */}
        <p className="text-sm text-slate-600 leading-relaxed mt-4 max-w-md">
          A centralized, secure system to digitize insurance records, track
          payments and outstanding balances, and generate reports.
        </p>

        {/* Features Checklist */}
        <ul className="mt-8 space-y-3.5">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
              <span className="text-sm font-medium text-slate-700">
                {feature}
              </span>
            </li>
          ))}
        </ul>

        {/* 3-Cards Illustration Graphic */}
        <div className="mt-12 pt-2 flex items-center justify-start gap-3.5 sm:gap-4 overflow-visible">
          {/* Card 1: Document card */}
          <div className="bg-white rounded-xl p-3.5 shadow-sm border border-slate-200/80 w-[110px] sm:w-[124px] h-[130px] sm:h-[138px] flex flex-col justify-between transition-transform hover:-translate-y-0.5">
            <div>
              <div className="flex items-center gap-1.5 mb-2.5">
                <FileText className="w-4 h-4 text-blue-600" />
                <div className="h-1.5 w-10 bg-blue-600/40 rounded-full" />
              </div>
              <div className="space-y-1.5">
                <div className="h-1.5 w-full bg-slate-100 rounded-full" />
                <div className="h-1.5 w-4/5 bg-slate-100 rounded-full" />
                <div className="h-1.5 w-3/5 bg-slate-100 rounded-full" />
              </div>
            </div>
            <div className="flex items-center justify-end">
              <div className="w-4 h-4 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
            </div>
          </div>

          {/* Card 2: Secured Record Hero Card (Blue) */}
          <div className="bg-blue-600 text-white rounded-2xl p-4 shadow-xl shadow-blue-500/25 w-[124px] sm:w-[140px] h-[148px] sm:h-[156px] flex flex-col items-center justify-center text-center -my-2 z-10 transition-transform hover:scale-[1.03]">
            <div className="w-9 h-9 rounded-full bg-white/15 border border-white/25 flex items-center justify-center mb-2.5 shadow-inner">
              <Shield className="w-4 h-4 text-white stroke-[2.2]" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold tracking-wider leading-tight text-white uppercase">
              SECURED
              <br />
              RECORD
            </span>
            <span className="text-[9px] sm:text-[10px] text-blue-200 font-mono mt-1.5">
              LEDGER ID: #2094X
            </span>
          </div>

          {/* Card 3: Total Assets Card */}
          <div className="bg-white rounded-xl p-3.5 shadow-sm border border-slate-200/80 w-[110px] sm:w-[124px] h-[130px] sm:h-[138px] flex flex-col justify-between transition-transform hover:-translate-y-0.5">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                TOTAL ASSETS
              </span>
              <div className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
                $1.2M
              </div>
            </div>
            <div className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
              <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>+12.4%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Copyright */}
      <div className="pt-6">
        <p className="text-xs text-slate-400">
          &copy; 2024 InsureLedger. All rights reserved.
        </p>
      </div>
    </div>
  );
}

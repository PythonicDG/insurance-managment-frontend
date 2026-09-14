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
    <>
      {/* ================= MOBILE COMPACT BRAND HEADER (< lg) ================= */}
      <div className="lg:hidden bg-gradient-to-b from-[#0b132b] to-[#122044] text-white px-5 pt-8 pb-7 flex flex-col items-center text-center relative overflow-hidden">
        {/* Subtle decorative background circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-400/10 rounded-full blur-2xl pointer-events-none" />

        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <Shield className="w-5 h-5 fill-white/20 text-white stroke-[2.2]" />
          </div>
          <span className="text-xl font-extrabold text-white tracking-tight">
            InsureLedger
          </span>
        </div>

        <h1 className="text-lg font-bold text-white tracking-tight max-w-sm">
          Insurance Records &amp; Ledger
        </h1>
        <p className="text-xs text-slate-300 mt-1 max-w-xs">
          Secure admin portal for policy records, ledgers &amp; analytics
        </p>

        {/* Micro pill badge */}
        <div className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-[11px] font-medium border border-white/15 backdrop-blur-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Agency Operations Portal</span>
        </div>
      </div>

      {/* ================= DESKTOP SIDE PANEL (>= lg) ================= */}
      <div className="hidden lg:flex w-full lg:w-[48%] xl:w-[45%] h-full bg-[#f3f7fd] px-8 py-8 lg:px-12 lg:py-10 xl:px-16 flex-col border-r border-slate-200/60 overflow-hidden shrink-0">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Shield className="w-4 h-4 fill-white/20 text-white stroke-[2.2]" />
          </div>

          <span className="text-lg font-bold text-slate-900 tracking-tight">
            InsureLedger
          </span>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center min-h-0 py-6 lg:py-4">
          <div className="max-w-lg">
            {/* Heading */}
            <h1 className="text-2xl sm:text-3xl lg:text-[34px] xl:text-4xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Insurance Records &amp; Ledger Management
            </h1>

            {/* Subtitle */}
            <p className="text-sm text-slate-600 leading-relaxed mt-3 max-w-md">
              A centralized, secure system to digitize insurance records, track
              payments and outstanding balances, and generate reports.
            </p>

            {/* Features */}
            <ul className="mt-6 space-y-2.5">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>

                  <span className="text-sm font-medium text-slate-700">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            {/* Illustration */}
            <div className="mt-8 flex items-center justify-start gap-2.5 sm:gap-3.5">
              {/* Document Card */}
              <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200/80 w-[96px] sm:w-[112px] h-[112px] sm:h-[124px] flex flex-col justify-between transition-transform hover:-translate-y-0.5">
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <div className="h-1.5 w-8 bg-blue-600/40 rounded-full" />
                  </div>

                  <div className="space-y-1.5">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full" />
                    <div className="h-1.5 w-4/5 bg-slate-100 rounded-full" />
                    <div className="h-1.5 w-3/5 bg-slate-100 rounded-full" />
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="w-4 h-4 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                </div>
              </div>

              {/* Secured Record Card */}
              <div className="bg-blue-600 text-white rounded-2xl p-3 shadow-xl shadow-blue-500/25 w-[108px] sm:w-[124px] h-[128px] sm:h-[140px] flex flex-col items-center justify-center text-center z-10 transition-transform hover:scale-[1.03]">
                <div className="w-8 h-8 rounded-full bg-white/15 border border-white/25 flex items-center justify-center mb-2 shadow-inner">
                  <Shield className="w-4 h-4 text-white stroke-[2.2]" />
                </div>

                <span className="text-[10px] sm:text-[11px] font-bold tracking-wider leading-tight text-white uppercase">
                  SECURED
                  <br />
                  RECORD
                </span>

                <span className="text-[8px] sm:text-[9px] text-blue-200 font-mono mt-1.5">
                  LEDGER ID: #2094X
                </span>
              </div>

              {/* Assets Card */}
              <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200/80 w-[96px] sm:w-[112px] h-[112px] sm:h-[124px] flex flex-col justify-between transition-transform hover:-translate-y-0.5">
                <div>
                  <span className="text-[9px] font-bold tracking-wider text-slate-400 uppercase">
                    TOTAL ASSETS
                  </span>

                  <div className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
                    $1.2M
                  </div>
                </div>

                <div className="flex items-center gap-1 text-emerald-600 text-[11px] font-semibold">
                  <TrendingUp className="w-3 h-3 stroke-[2.5]" />
                  <span>+12.4%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 shrink-0">
          <p className="text-[11px] text-slate-400">
            &copy; 2024 InsureLedger. All rights reserved.
          </p>
        </div>
      </div>
    </>
  );
}

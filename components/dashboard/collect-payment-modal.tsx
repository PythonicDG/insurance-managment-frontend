"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Search,
  Car,
  AlertCircle,
  CheckCircle2,
  Clock,
  IndianRupee,
  Phone,
  User,
  Shield,
  Loader2,
} from "lucide-react";
import { insuranceRecordService, InsuranceRecordItem } from "@/lib/api";
import { formatINR } from "./dashboard-kpi-card";

interface CollectPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRecord: (record: InsuranceRecordItem) => void;
}

export function CollectPaymentModal({
  isOpen,
  onClose,
  onSelectRecord,
}: CollectPaymentModalProps) {
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<InsuranceRecordItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setHasSearched(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      loadInitialRecords();
    }
  }, [isOpen]);

  // Load initial suggestions (recent records with pending or active status)
  const loadInitialRecords = async () => {
    setLoading(true);
    try {
      const res = await insuranceRecordService.getAll({ page_size: 6 });
      const list = Array.isArray(res) ? res : res.results || [];
      setRecords(list);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search when query changes
  useEffect(() => {
    if (!isOpen) return;
    const trimmed = query.trim();

    if (!trimmed) {
      loadInitialRecords();
      setHasSearched(false);
      return;
    }

    setHasSearched(true);
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await insuranceRecordService.getAll({
          search: trimmed,
          page_size: 15,
        });
        const list = Array.isArray(res) ? res : res.results || [];
        setRecords(list);
      } catch {
        setRecords([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="collect-payment-title"
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <IndianRupee className="w-4 h-4 stroke-[2.5]" />
              </div>
              <h2
                id="collect-payment-title"
                className="text-lg font-bold text-slate-900 tracking-tight"
              >
                Collect Payment
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 pl-10">
              Enter vehicle number to find policy and collect or update payment
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter Vehicle Number (e.g. MH-12-AB-1234)..."
              className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-slate-200/90 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs font-medium uppercase tracking-wider"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-400">
            <span>
              {hasSearched
                ? `Search results for "${query}"`
                : "Recent policies eligible for payment"}
            </span>
            {loading && (
              <span className="flex items-center gap-1 text-blue-600 font-medium">
                <Loader2 className="w-3 h-3 animate-spin" /> Searching...
              </span>
            )}
          </div>
        </div>

        {/* Record Results List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-[220px]">
          {loading && records.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <p className="text-xs">Searching vehicle records...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-center gap-2">
              <Car className="w-10 h-10 text-slate-300 stroke-[1.5]" />
              <p className="text-sm font-semibold text-slate-700">
                {hasSearched
                  ? `No policy found for "${query}"`
                  : "No recent policies found"}
              </p>
              <p className="text-xs text-slate-400 max-w-sm">
                Check the vehicle number and try again, or create a new policy record first.
              </p>
            </div>
          ) : (
            records.map((rec) => {
              const total =
                typeof rec.total_premium === "number"
                  ? rec.total_premium
                  : parseFloat(String(rec.total_premium || 0));
              const paid = rec.paid_amount ?? 0;
              const outstanding = Math.max(
                0,
                rec.balance !== undefined
                  ? rec.balance
                  : Math.max(0, total - paid)
              );
              const isFullyPaid = outstanding <= 0;

              return (
                <div
                  key={rec.id}
                  onClick={() => onSelectRecord(rec)}
                  className="p-4 rounded-xl border border-slate-200/80 bg-white hover:bg-blue-50/40 hover:border-blue-300 transition-all cursor-pointer shadow-2xs hover:shadow-xs group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Vehicle & Customer Info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/70 font-mono text-xs font-bold text-slate-900 uppercase">
                          <Car className="w-3.5 h-3.5 text-slate-500" />
                          {rec.vehicle?.vehicle_number || "N/A"}
                        </span>
                        {rec.vehicle?.vehicle_type && (
                          <span className="text-[11px] text-slate-500 font-medium px-2 py-0.5 rounded-md bg-slate-50 border border-slate-100">
                            {rec.vehicle.vehicle_type}
                          </span>
                        )}
                        <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                          <Shield className="w-3 h-3 text-slate-400" />
                          {rec.insurance_company?.name || "Insurer"}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 pt-1 text-xs text-slate-600">
                        <span className="font-semibold text-slate-800 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {rec.customer?.name || "Customer"}
                        </span>
                        {rec.customer?.phone && (
                          <span className="text-slate-500 flex items-center gap-1 text-[11px]">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{rec.customer.phone}</span>
                            {(rec.alternative_mobile_number || rec.customer?.alternative_mobile_number) && (
                              <span className="text-slate-400">(Alt: {rec.alternative_mobile_number || rec.customer?.alternative_mobile_number})</span>
                            )}
                          </span>
                        )}
                        <span className="text-slate-400 text-[11px]">
                          Policy #{rec.policy_number}
                        </span>
                      </div>
                    </div>

                    {/* Financials & Action */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-right">
                        <div className="text-xs text-slate-500">Outstanding:</div>
                        <div
                          className={`text-sm font-bold ${
                            isFullyPaid ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {isFullyPaid ? "₹0 (Paid)" : formatINR(outstanding)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Total: {formatINR(total)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRecord(rec);
                        }}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer ${
                          isFullyPaid
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                        }`}
                      >
                        <IndianRupee className="w-3.5 h-3.5" />
                        <span>{isFullyPaid ? "View Policy" : "Collect Payment"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Click any record to open the payment form</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

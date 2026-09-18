"use client";

import React from "react";
import {
  X,
  User,
  Car,
  Calendar,
  Building2,
  ExternalLink,
  ShieldAlert,
  Clock,
} from "lucide-react";
import { InsuranceRecordItem } from "@/lib/api";

interface ViewExistingRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: InsuranceRecordItem | null;
}

export function ViewExistingRecordModal({
  isOpen,
  onClose,
  record,
}: ViewExistingRecordModalProps) {
  if (!isOpen || !record) return null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const d =
          parts[0].length === 4
            ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
            : new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        return d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }
      return new Date(dateStr).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (val?: number | string) => {
    if (val === undefined || val === null) return "₹0.00";
    const num = typeof val === "number" ? val : parseFloat(String(val)) || 0;
    return `₹${num.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const status = (record.status || "").toLowerCase();
  const isExpired = status === "expired" || (record.days_left !== undefined && record.days_left < 0);
  const isExpiringSoon = status === "expiring_soon" || status === "expiring soon";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-2xl my-8 overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Existing Policy Record
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-amber-100/80 text-amber-800 border border-amber-200">
                  {record.policy_number}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Full details of the existing record matching this policy number
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[calc(85vh-8rem)] overflow-y-auto">
          {/* Section 1: Policy & Expiry Overview */}
          <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Company
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                    {record.insurance_company?.name || "—"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Record Entry Date
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <p className="text-xs sm:text-sm font-semibold text-slate-700">
                    {formatDate(record.entry_date)}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Start Date
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <p className="text-xs sm:text-sm font-semibold text-slate-700">
                    {formatDate(record.policy_start_date)}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Expiry Date
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <p className="text-xs sm:text-sm font-semibold text-slate-700">
                    {formatDate(record.policy_expiry_date)}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Status
                </p>
                <div className="mt-1">
                  {isExpired ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                      Expired
                    </span>
                  ) : isExpiringSoon ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                      Expiring Soon
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                      Active
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3.5 pt-3 border-t border-slate-200/70 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Total Policy Premium</span>
              <span className="text-sm font-bold text-slate-900">
                {formatCurrency(record.total_premium)}
              </span>
            </div>
          </div>

          {/* Section 2: Customer Details */}
          <div>
            <div className="flex items-center gap-2 mb-2.5 text-slate-900 font-bold text-xs uppercase tracking-wider">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Registered Customer</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-slate-400 font-medium">Customer Name</p>
                <p className="font-bold text-slate-900 mt-0.5">
                  {record.customer?.name || "—"}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Phone Number</p>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {record.customer?.phone || "—"}
                </p>
              </div>
              {record.customer?.email && (
                <div>
                  <p className="text-slate-400 font-medium">Email</p>
                  <p className="text-slate-700 mt-0.5">{record.customer.email}</p>
                </div>
              )}
              {record.customer?.address && (
                <div className={record.customer?.email ? "" : "sm:col-span-2"}>
                  <p className="text-slate-400 font-medium">Address</p>
                  <p className="text-slate-700 mt-0.5">{record.customer.address}</p>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Vehicle Information */}
          <div>
            <div className="flex items-center gap-2 mb-2.5 text-slate-900 font-bold text-xs uppercase tracking-wider">
              <Car className="w-3.5 h-3.5 text-blue-600" />
              <span>Vehicle Information</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-slate-400 font-medium">Vehicle Number</p>
                <p className="font-mono font-bold text-slate-900 mt-0.5 uppercase tracking-wide">
                  {record.vehicle?.vehicle_number || "—"}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Vehicle Type / Model</p>
                <p className="font-medium text-slate-800 mt-0.5">
                  {record.vehicle?.vehicle_type || record.vehicle_class || "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Remarks (if any) */}
          {record.remarks && (
            <div>
              <p className="text-slate-400 font-medium text-xs mb-1">Remarks / Underwriting Notes</p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 leading-relaxed">
                {record.remarks}
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <a
            href={`/insurance-records?view=${record.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            <span>Open in Records Table</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}

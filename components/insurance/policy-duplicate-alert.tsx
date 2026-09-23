"use client";

import React from "react";
import {
  AlertTriangle,
  Eye,
  User,
  Car,
  Calendar,
  Building2,
  ExternalLink,
} from "lucide-react";
import { InsuranceRecordItem } from "@/lib/api";

interface PolicyDuplicateAlertProps {
  policyNumber: string;
  duplicateRecord: InsuranceRecordItem;
  onViewExisting: () => void;
}

export function PolicyDuplicateAlert({
  policyNumber,
  duplicateRecord,
  onViewExisting,
}: PolicyDuplicateAlertProps) {
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

  const status = (duplicateRecord.status || "").toLowerCase();
  const isExpired =
    status === "expired" ||
    (duplicateRecord.days_left !== undefined && duplicateRecord.days_left < 0);
  const isExpiringSoon = status === "expiring_soon" || status === "expiring soon";

  return (
    <div className="mt-2.5 rounded-xl border border-amber-300/90 bg-amber-50/70 p-3.5 sm:p-4 text-xs text-amber-950 shadow-2xs animate-in fade-in slide-in-from-top-1 duration-150">
      {/* Alert Header */}
      <div className="flex items-start gap-2.5">
        <div className="p-1 rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-900 text-xs sm:text-sm">
              Duplicate Policy Number Detected
            </span>
            <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold bg-white border border-amber-200 text-amber-900 shadow-2xs">
              {policyNumber.trim()}
            </span>
          </div>
          <p className="text-slate-600 mt-0.5 text-[11px] sm:text-xs leading-relaxed">
            An insurance policy with this number is already registered in the database. Policy numbers must be unique.
          </p>

          {/* Existing Record Context Summary */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 bg-white/80 border border-amber-200/80 rounded-xl p-2.5">
            {/* Customer Context */}
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3 h-3" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Customer
                </p>
                <p className="font-semibold text-slate-900 truncate">
                  {duplicateRecord.customer?.name || "Unnamed"}
                </p>
                {duplicateRecord.customer?.phone && (
                  <p className="text-[11px] text-slate-500 truncate">
                    {duplicateRecord.customer.phone}
                    {(duplicateRecord.alternative_mobile_number || duplicateRecord.customer?.alternative_mobile_number) && (
                      <span className="text-slate-400"> (Alt: {duplicateRecord.alternative_mobile_number || duplicateRecord.customer?.alternative_mobile_number})</span>
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Vehicle Context */}
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                <Car className="w-3 h-3" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Vehicle
                </p>
                <p className="font-mono font-bold text-slate-900 uppercase truncate">
                  {duplicateRecord.vehicle?.vehicle_number || "—"}
                </p>
                {duplicateRecord.vehicle?.vehicle_type && (
                  <p className="text-[11px] text-slate-500 truncate">
                    {duplicateRecord.vehicle.vehicle_type}
                  </p>
                )}
              </div>
            </div>

            {/* Expiry Context & Status */}
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                <Calendar className="w-3 h-3" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Expiry &amp; Status
                </p>
                <p className="font-semibold text-slate-900">
                  {formatDate(duplicateRecord.policy_expiry_date)}
                </p>
                <div className="mt-0.5">
                  {isExpired ? (
                    <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-100 text-red-700">
                      Expired
                    </span>
                  ) : isExpiringSoon ? (
                    <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                      Expiring Soon
                    </span>
                  ) : (
                    <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                      Active
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onViewExisting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer shadow-2xs"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View Existing Record</span>
            </button>

            <a
              href={`/insurance-records?view=${duplicateRecord.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-amber-100/60 rounded-lg transition-colors"
            >
              <span>Open in new tab</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            {duplicateRecord.insurance_company?.name && (
              <span className="text-[11px] text-slate-500 ml-auto hidden sm:inline-flex items-center gap-1">
                <Building2 className="w-3 h-3 text-slate-400" />
                <span>Insurer: {duplicateRecord.insurance_company.name}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

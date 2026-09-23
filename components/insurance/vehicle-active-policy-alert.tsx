"use client";

import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Pencil,
  RefreshCw,
  Eye,
  Car,
  User,
  Calendar,
  Building2,
  Clock,
  History,
} from "lucide-react";
import { InsuranceRecordItem, VehicleCheckResponse } from "@/lib/api";
import { formatDisplayDate } from "@/lib/date-utils";

interface VehicleActivePolicyAlertProps {
  vehicleNumber: string;
  vehicleCheck: VehicleCheckResponse | null;
  onUpdatePolicy: (record: InsuranceRecordItem) => void;
  onRenewPolicy: (record: InsuranceRecordItem) => void;
  onViewDetails: (record: InsuranceRecordItem) => void;
}

export function VehicleActivePolicyAlert({
  vehicleNumber,
  vehicleCheck,
  onUpdatePolicy,
  onRenewPolicy,
  onViewDetails,
}: VehicleActivePolicyAlertProps) {
  if (!vehicleCheck) return null;

  const formatDate = (dateStr?: string) => {
    return formatDisplayDate(dateStr);
  };

  const formatCurrency = (val?: number | string) => {
    if (val === undefined || val === null) return "₹0.00";
    const num = typeof val === "number" ? val : parseFloat(String(val)) || 0;
    return `₹${num.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Case 1: Active policy already exists
  if (vehicleCheck.has_active_policy && vehicleCheck.active_record) {
    const active = vehicleCheck.active_record;
    const daysLeft = active.days_left ?? 0;

    return (
      <div className="mt-3 rounded-2xl border border-amber-300 bg-amber-50/80 p-4 sm:p-5 text-xs text-amber-950 shadow-sm animate-in fade-in slide-in-from-top-2 duration-150">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-900 text-sm sm:text-base">
                  Active Policy Already Exists
                </span>
                <span className="px-2.5 py-0.5 rounded-lg font-mono text-xs font-bold bg-white border border-amber-300 text-amber-900 shadow-2xs">
                  {vehicleNumber.trim()}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Active in Force
                </span>
              </div>
              <p className="text-slate-600 mt-1 text-xs leading-relaxed">
                This vehicle already has an active policy in force. You cannot create a duplicate active record.
                You can <strong className="text-slate-800">Update</strong> the existing policy or{" "}
                <strong className="text-slate-800">Renew</strong> it for the next term.
              </p>
            </div>

            {/* Active Policy Summary Context */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-white/90 border border-amber-200 rounded-xl p-3">
              {/* Customer */}
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Customer
                  </p>
                  <p className="font-bold text-slate-900 truncate">
                    {active.customer?.name || "Unnamed"}
                  </p>
                  {active.customer?.phone && (
                    <p className="text-[11px] text-slate-500 truncate">
                      {active.customer.phone}
                      {(active.alternative_mobile_number || active.customer?.alternative_mobile_number) && (
                        <span className="text-slate-400"> (Alt: {active.alternative_mobile_number || active.customer?.alternative_mobile_number})</span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* Policy & Insurer */}
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Policy Number
                  </p>
                  <p className="font-mono font-bold text-slate-900 truncate">
                    {active.policy_number}
                  </p>
                  {active.insurance_company?.name && (
                    <p className="text-[11px] text-slate-500 truncate">
                      {active.insurance_company.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Expiry & Days Left */}
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Expiry Date
                  </p>
                  <p className="font-bold text-slate-900">
                    {formatDate(active.policy_expiry_date)}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {daysLeft > 0 ? `${daysLeft} days remaining` : "Expires today"}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons: Renew, Update, View */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => onRenewPolicy(active)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Renew Policy</span>
              </button>

              <button
                type="button"
                onClick={() => onUpdatePolicy(active)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-semibold text-xs transition-colors cursor-pointer shadow-2xs"
              >
                <Pencil className="w-3.5 h-3.5 text-slate-500" />
                <span>Update Existing Policy</span>
              </button>

              <button
                type="button"
                onClick={() => onViewDetails(active)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-amber-100/50 rounded-xl font-medium text-xs transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                <span>View Details</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Previous policy is expired (Allow new record, keep old as history)
  if (vehicleCheck.has_expired_policy && vehicleCheck.latest_expired_record) {
    const expired = vehicleCheck.latest_expired_record;

    return (
      <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-950 shadow-2xs animate-in fade-in slide-in-from-top-2 duration-150">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-blue-100 text-blue-700 shrink-0 mt-0.5">
            <History className="w-4 h-4" />
          </div>

          <div className="flex-1 min-w-0 space-y-2.5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-900 text-xs sm:text-sm">
                  Previous Insurance Expired
                </span>
                <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold bg-white border border-blue-200 text-blue-900 shadow-2xs">
                  {vehicleNumber.trim()}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  {vehicleCheck.history_count} Historical Record{vehicleCheck.history_count > 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-slate-600 mt-1 text-xs leading-relaxed">
                Previous policy{" "}
                <span className="font-mono font-semibold text-slate-800">
                  #{expired.policy_number}
                </span>{" "}
                expired on {formatDate(expired.policy_expiry_date)}. Creating a new insurance record
                is allowed, and previous policy records will be preserved in history.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onViewDetails(expired)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-medium text-xs transition-colors cursor-pointer shadow-2xs"
              >
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                <span>View Previous Policy (#{expired.policy_number})</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

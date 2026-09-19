"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  RefreshCw,
  Calendar as CalendarIcon,
  Building2,
  Car,
  User,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import {
  InsuranceCompany,
  InsuranceRecordItem,
  insuranceRecordService,
  companyService,
  extractApiError,
} from "@/lib/api";
import {
  getTodayDateString,
  getNextYearDateString,
  formatDisplayDate,
} from "@/lib/date-utils";

interface RenewPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: InsuranceRecordItem | null;
  companies?: InsuranceCompany[];
  onRenewSuccess: (newRecord: InsuranceRecordItem) => void;
}

export function RenewPolicyModal({
  isOpen,
  onClose,
  record,
  companies: initialCompanies,
  onRenewSuccess,
}: RenewPolicyModalProps) {
  const [companies, setCompanies] = useState<InsuranceCompany[]>(
    initialCompanies || []
  );
  const [policyNumber, setPolicyNumber] = useState("");
  const [companyId, setCompanyId] = useState<number | string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalPremium, setTotalPremium] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (initialCompanies && initialCompanies.length > 0) {
      setCompanies(initialCompanies);
    } else if (isOpen) {
      companyService
        .getAll()
        .then((data) => {
          if (data && data.length > 0) setCompanies(data);
        })
        .catch(() => {});
    }
  }, [initialCompanies, isOpen]);

  useEffect(() => {
    if (!isOpen || !record) return;

    // Auto-generate new policy number suggestion
    setPolicyNumber(
      `POL-${Math.floor(10000 + Math.random() * 90000)}-${Math.floor(
        100 + Math.random() * 900
      )}R`
    );

    // Default company
    setCompanyId(record.insurance_company?.id || (companies[0]?.id ?? 1));

    // Calculate start date: if old expiry date exists, use the day after expiry, or today if past
    const todayStr = getTodayDateString();
    let initialStart = todayStr;
    if (record.policy_expiry_date) {
      try {
        const expDate = new Date(record.policy_expiry_date);
        const todayDate = new Date(todayStr);
        if (expDate >= todayDate) {
          // Add 1 day
          const nextDay = new Date(expDate);
          nextDay.setDate(nextDay.getDate() + 1);
          initialStart = nextDay.toISOString().split("T")[0];
        }
      } catch {
        initialStart = todayStr;
      }
    }
    setStartDate(initialStart);
    setEndDate(getNextYearDateString(initialStart));

    // Default premium
    setTotalPremium(
      record.total_premium ? String(record.total_premium) : ""
    );
    setPaidAmount("");
    setRemarks(`Renewed from policy #${record.policy_number}`);
    setErrorMsg("");
  }, [isOpen, record, companies]);

  if (!isOpen || !record) return null;

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (val) {
      setEndDate(getNextYearDateString(val));
    } else {
      setEndDate("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const numPremium = parseFloat(totalPremium);
    if (isNaN(numPremium) || numPremium <= 0) {
      setErrorMsg("Please enter a valid total premium amount.");
      return;
    }

    const numPaid = parseFloat(paidAmount) || 0;
    if (numPaid > numPremium) {
      setErrorMsg("Paid amount cannot exceed total premium.");
      return;
    }

    if (!startDate || !endDate) {
      setErrorMsg("Please select valid policy start and end dates.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await insuranceRecordService.renewPolicy(record.id, {
        policy_number: policyNumber.trim(),
        insurance_company_id: Number(companyId) || (companies[0]?.id ?? 1),
        policy_start_date: startDate,
        policy_expiry_date: endDate,
        total_premium: numPremium,
        initial_payment: numPaid > 0 ? numPaid : undefined,
        paid_amount: numPaid > 0 ? numPaid : undefined,
        remarks: remarks.trim() || undefined,
      });

      onRenewSuccess(res.data);
      onClose();
    } catch (err: unknown) {
      const info = extractApiError(err, "Failed to renew policy. Please try again.");
      setErrorMsg(info.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-xl my-8 overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Renew Insurance Policy
                </h2>
                <span className="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-white border border-blue-200 text-blue-800 shadow-2xs">
                  {record.vehicle?.vehicle_number}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Renewing will archive the existing policy to history and create a new active policy.
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

        {/* Existing Policy Summary Notice */}
        <div className="mx-6 mt-4 p-3 bg-amber-50/80 border border-amber-200/90 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Current Policy #{record.policy_number}</span> (
            {record.insurance_company?.name || "Insurer"}, expires{" "}
            {formatDisplayDate(record.policy_expiry_date)}) will be preserved in history.
            The new policy below will become the active policy for{" "}
            <strong>{record.vehicle?.vehicle_number}</strong>.
          </div>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(85vh-12rem)] overflow-y-auto">
          {/* Customer & Vehicle Info (read-only context) */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs">
            <div>
              <p className="text-slate-400 font-medium">Customer</p>
              <p className="font-bold text-slate-800 mt-0.5 truncate">
                {record.customer?.name || record.customer?.phone}
              </p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">Vehicle</p>
              <p className="font-mono font-bold text-slate-800 mt-0.5 uppercase truncate">
                {record.vehicle?.vehicle_number} ({record.vehicle?.vehicle_type || "Vehicle"})
              </p>
            </div>
          </div>

          {/* New Policy Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Policy Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={policyNumber}
              onChange={(e) => setPolicyNumber(e.target.value)}
              placeholder="e.g. POL-99283-772R"
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Insurance Company */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Insurance Company <span className="text-red-500">*</span>
            </label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Policy Start Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full pl-3.5 pr-9 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                />
                <CalendarIcon className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Policy Expiry Date <span className="text-red-500">*</span>
                </label>
                {startDate && (
                  <span className="text-[10px] text-emerald-600 font-medium">+1 Year Auto</span>
                )}
              </div>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-3.5 pr-9 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                />
                <CalendarIcon className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Premium & Payment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Renewal Total Premium (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
                  ₹
                </span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={totalPremium}
                  onChange={(e) => setTotalPremium(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3.5 py-2 text-xs sm:text-sm font-semibold bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Initial Paid Amount (₹) <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
                  ₹
                </span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3.5 py-2 text-xs sm:text-sm font-semibold bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Renewal Remarks / Notes
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Underwriting remarks for this renewal..."
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 min-w-[140px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Renewing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Confirm Renewal</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

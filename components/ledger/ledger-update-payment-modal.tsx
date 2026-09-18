"use client";

import React, { useState, useEffect } from "react";
import { X, Calendar as CalendarIcon, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { LedgerRecord, paymentService } from "@/lib/api";

interface LedgerUpdatePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: LedgerRecord | null;
  onPaymentSuccess: () => void;
}

export function LedgerUpdatePaymentModal({
  isOpen,
  onClose,
  record,
  onPaymentSuccess,
}: LedgerUpdatePaymentModalProps) {
  if (!isOpen || !record) return null;

  const totalPremium =
    typeof record.total_premium === "number"
      ? record.total_premium
      : parseFloat(String(record.total_premium || 0));

  const paidAmount =
    typeof record.paid_amount === "number"
      ? record.paid_amount
      : parseFloat(String(record.paid_amount || 0));

  const outstanding =
    typeof record.outstanding === "number"
      ? record.outstanding
      : parseFloat(String(record.outstanding || 0));

  const isFullyPaid = outstanding <= 0;

  const [paymentType, setPaymentType] = useState<"full" | "partial">(
    outstanding > 0 ? "partial" : "full"
  );
  const [amount, setAmount] = useState<number | string>(() =>
    outstanding > 0 ? Math.min(outstanding, Math.round(outstanding * 0.5)) : 0
  );
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [paymentDate, setPaymentDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset or initialize when modal opens or record changes
  useEffect(() => {
    if (record) {
      const out =
        typeof record.outstanding === "number"
          ? record.outstanding
          : parseFloat(String(record.outstanding || 0));
      if (out > 0) {
        setPaymentType("partial");
        setAmount(out);
      } else {
        setPaymentType("full");
        setAmount(0);
      }
      setPaymentMode("UPI");
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setRemarks("");
      setError("");
      setSubmitting(false);
    }
  }, [record]);

  const numAmount = parseFloat(String(amount)) || 0;
  const remainingAfterPayment = Math.max(0, outstanding - numAmount);

  const handleTypeChange = (type: "full" | "partial") => {
    if (isFullyPaid) return;
    setPaymentType(type);
    if (type === "full") {
      setAmount(outstanding);
      setError("");
    }
  };

  const handleAmountChange = (val: string) => {
    setAmount(val);
    const parsed = parseFloat(val) || 0;
    if (parsed > outstanding) {
      setError(`Amount cannot exceed outstanding balance of ₹${outstanding.toLocaleString("en-IN")}`);
    } else {
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFullyPaid || outstanding <= 0) {
      setError("This policy is fully paid. No further payments are required.");
      return;
    }
    if (numAmount <= 0) {
      setError("Please enter a valid payment amount greater than zero.");
      return;
    }
    if (numAmount > outstanding) {
      setError(`Amount cannot exceed outstanding balance of ₹${outstanding.toLocaleString("en-IN")}`);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await paymentService.create({
        recordId: record.id,
        amount: numAmount,
        payment_mode: paymentMode,
        payment_method: paymentMode,
        payment_date: paymentDate,
        notes: remarks.trim() || `Payment via ${paymentMode}`,
        remark: remarks.trim() || `Payment via ${paymentMode}`,
      });

      onPaymentSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Failed to record payment. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Update Payment
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Policy #{record.policy_number} • {record.vehicle_number}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Customer & Policy Overview Card */}
          <div className="bg-slate-50 rounded-xl p-3.5 sm:p-4 border border-slate-200/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-800">
                {record.customer_name}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {record.customer_phone}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mb-3">
              Insurance Company:{" "}
              <span className="font-semibold text-slate-700">
                {record.insurance_company_name}
              </span>
            </div>

            {/* Balances Grid */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 text-center">
              <div className="bg-white p-2 rounded-lg border border-slate-100">
                <span className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  Total
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  ₹{totalPremium.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-100">
                <span className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  Paid
                </span>
                <span className="text-xs sm:text-sm font-bold text-emerald-600">
                  ₹{paidAmount.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-100">
                <span className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  Outstanding
                </span>
                <span className="text-xs sm:text-sm font-bold text-red-500">
                  ₹{outstanding.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Type Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Payment Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isFullyPaid}
                onClick={() => handleTypeChange("partial")}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  paymentType === "partial"
                    ? "bg-blue-50 border-blue-500 text-blue-700 shadow-2xs"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                } ${isFullyPaid ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                Partial Payment
              </button>
              <button
                type="button"
                disabled={isFullyPaid}
                onClick={() => handleTypeChange("full")}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  paymentType === "full"
                    ? "bg-blue-50 border-blue-500 text-blue-700 shadow-2xs"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                } ${isFullyPaid ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                Full Payment (₹{outstanding.toLocaleString("en-IN")})
              </button>
            </div>
          </div>

          {/* Payment Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Amount to Pay (₹) <span className="text-red-500">*</span>
              </label>
              {paymentType === "partial" && outstanding > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAmount(outstanding);
                    setError("");
                  }}
                  className="text-[11px] text-blue-600 hover:underline font-medium cursor-pointer"
                >
                  Pay Max (₹{outstanding.toLocaleString("en-IN")})
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                ₹
              </span>
              <input
                type="number"
                min="1"
                max={outstanding}
                step="any"
                value={amount}
                disabled={isFullyPaid || paymentType === "full"}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.00"
                className={`w-full pl-8 pr-4 py-2 text-sm font-semibold bg-white border rounded-xl focus:outline-none transition-all ${
                  error
                    ? "border-red-400 focus:ring-2 focus:ring-red-200"
                    : "border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                } ${paymentType === "full" ? "bg-slate-50 text-slate-700 cursor-not-allowed" : ""}`}
              />
            </div>
            {error ? (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </p>
            ) : (
              <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1">
                <span>Remaining balance after payment:</span>
                <span className={`font-semibold ${remainingAfterPayment === 0 ? "text-emerald-600" : "text-red-500"}`}>
                  ₹{remainingAfterPayment.toLocaleString("en-IN")}
                </span>
              </div>
            )}
          </div>

          {/* Payment Mode / Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              <option value="UPI">UPI / Google Pay / PhonePe / Paytm</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer (IMPS / NEFT / RTGS)</option>
              <option value="Cheque">Cheque</option>
              <option value="Card">Credit / Debit Card</option>
              <option value="Net Banking">Net Banking</option>
            </select>
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full pl-3 pr-9 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              />
              <CalendarIcon className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Remarks / Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes / Transaction ID (Optional)
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. UTR number, receipt #, paid by customer via UPI..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || isFullyPaid || numAmount <= 0}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save Payment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

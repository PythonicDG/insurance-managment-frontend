"use client";

import React, { useState } from "react";
import { X, Calendar as CalendarIcon, CheckCircle2 } from "lucide-react";
import { InsuranceRecordItem, extractApiError } from "@/lib/api";
import { getTodayDateString } from "@/lib/date-utils";

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: InsuranceRecordItem | null;
  onSavePayment: (paymentData: {
    recordId: number;
    paymentType: "full" | "partial";
    amount: number;
    discount?: number;
    paymentMode: string;
    paymentDate: string;
    remark: string;
  }) => void | Promise<void>;
}

interface DialogProps {
  record: InsuranceRecordItem;
  onClose: () => void;
  onSavePayment: RecordPaymentModalProps["onSavePayment"];
}

function RecordPaymentDialog({ record, onClose, onSavePayment }: DialogProps) {

  const total =
    typeof record.total_premium === "number"
      ? record.total_premium
      : parseFloat(String(record.total_premium || 0)) || 0;
  const paid =
    typeof record.paid_amount === "number"
      ? record.paid_amount
      : parseFloat(String(record.paid_amount ?? record.total_paid ?? 0)) || 0;
  const rawBalance =
    record.balance !== undefined && record.balance !== null
      ? parseFloat(String(record.balance))
      : record.outstanding !== undefined && record.outstanding !== null
      ? parseFloat(String(record.outstanding))
      : Math.max(0, total - paid);
  const outstandingBalance = Math.max(0, isNaN(rawBalance) ? 0 : rawBalance);
  const isFullyPaid = outstandingBalance <= 0;

  const [paymentType, setPaymentType] = useState<"full" | "partial">("full");
  const [discount, setDiscount] = useState<number | string>(0);
  const [amount, setAmount] = useState<number | string>(() =>
    outstandingBalance > 0 ? outstandingBalance : 0
  );
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [paymentDate, setPaymentDate] = useState(() => {
    return getTodayDateString();
  });
  const [remark, setRemark] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const numDiscount = parseFloat(String(discount)) || 0;
  const numAmount = parseFloat(String(amount)) || 0;
  const maxPayable = Math.max(0, outstandingBalance - numDiscount);
  const remainingBalance = Math.max(0, outstandingBalance - numDiscount - numAmount);

  const handleTypeChange = (type: "full" | "partial") => {
    if (isFullyPaid) return;
    setPaymentType(type);
    if (type === "full") {
      setAmount(maxPayable);
      setError("");
    } else {
      if (Number(amount) >= maxPayable && maxPayable > 0) {
        setAmount(Math.round(maxPayable * 0.5) || 1);
        setError("");
      }
    }
  };

  const handleDiscountChange = (val: string) => {
    setDiscount(val);
    const disc = parseFloat(val) || 0;
    if (disc < 0) {
      setError("Discount cannot be negative.");
    } else if (disc > outstandingBalance) {
      setError(`Discount cannot exceed outstanding balance of ₹${outstandingBalance.toLocaleString("en-IN")}`);
    } else {
      setError("");
      const newMaxPayable = Math.max(0, outstandingBalance - disc);
      if (paymentType === "full") {
        setAmount(newMaxPayable);
      } else if (Number(amount) > newMaxPayable) {
        setAmount(newMaxPayable);
      }
    }
  };

  const handleAmountChange = (val: string) => {
    setAmount(val);
    const parsed = parseFloat(val) || 0;
    if (parsed > maxPayable) {
      setError(
        `Amount cannot exceed payable balance of ₹${maxPayable.toLocaleString("en-IN")}`
      );
    } else {
      setError("");
      if (parsed < maxPayable && paymentType === "full") {
        setPaymentType("partial");
      } else if (parsed === maxPayable && paymentType === "partial" && parsed > 0) {
        setPaymentType("full");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFullyPaid || outstandingBalance <= 0) {
      setError("This policy is fully paid. No further payments can be added.");
      return;
    }
    if (numDiscount > 0 && numDiscount > outstandingBalance) {
      setError(`Discount cannot exceed outstanding balance of ₹${outstandingBalance.toLocaleString("en-IN")}`);
      return;
    }
    const maxPayable = Math.max(0, outstandingBalance - numDiscount);
    if (numAmount < 0) {
      setError("Please enter a valid payment amount.");
      return;
    }
    if (numAmount > maxPayable) {
      setError(
        `Amount cannot exceed payable balance of ₹${maxPayable.toLocaleString("en-IN")}`
      );
      return;
    }
    if (numAmount === 0 && numDiscount <= 0) {
      setError("Please enter a valid payment amount greater than zero.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await onSavePayment({
        recordId: record.id,
        paymentType,
        amount: numAmount,
        discount: numDiscount,
        paymentMode,
        paymentDate,
        remark,
      });
      onClose();
    } catch (err: unknown) {
      const errInfo = extractApiError(err, "Failed to record payment.");
      setError(errInfo.message);
    } finally {
      setSubmitting(false);
    }
  };

  const customerName = record.customer?.name || "Customer";
  const vehicleNumber = record.vehicle?.vehicle_number || "MH-12-AB-1234";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-[440px] flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[88vh] overflow-hidden animate-in zoom-in-95 duration-150 my-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-payment-title"
      >
        {/* Modal Header */}
        <div className="px-5 sm:px-6 pt-4 sm:pt-5 pb-3 flex items-center justify-between shrink-0">
          <h2
            id="record-payment-title"
            className="text-base sm:text-lg font-bold text-slate-900 tracking-tight"
          >
            Record Payment
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Record Overview Sub-header */}
        <div className="px-5 sm:px-6 py-2.5 bg-slate-50/70 border-y border-slate-100 flex items-center justify-between text-xs shrink-0">
          <span className="font-semibold text-slate-700 truncate mr-2">
            {customerName} • {vehicleNumber}
          </span>
          {isFullyPaid ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 font-bold whitespace-nowrap">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
              Outstanding: ₹0 (Fully Paid)
            </span>
          ) : (
            <span className="text-red-600 font-bold whitespace-nowrap">
              Outstanding: ₹{outstandingBalance.toLocaleString("en-IN")}
            </span>
          )}
        </div>

        {/* Form Body or Fully Paid Message */}
        {isFullyPaid ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Policy Fully Paid</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                All dues for this policy have been cleared. Outstanding balance is ₹0. No further payments can be added for this record.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-3.5 flex-1 overflow-y-auto">
            {/* Payment Type Segmented Switch */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Payment Type
              </label>
              <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleTypeChange("full")}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    paymentType === "full"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Full Payment
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange("partial")}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    paymentType === "partial"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Partial Payment
                </button>
              </div>
            </div>

            {/* Discount Field (Editable on all payments) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Discount (₹)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 text-sm font-semibold">
                  ₹
                </div>
                <input
                  type="number"
                  step="any"
                  min="0"
                  max={outstandingBalance}
                  value={discount}
                  onChange={(e) => handleDiscountChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3.5 py-2 text-sm font-semibold rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Upfront discount in ₹ deducted from payable balance.
              </p>
            </div>

            {/* Amount Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Amount to Collect <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 text-sm font-semibold">
                  ₹
                </div>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  max={outstandingBalance}
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0"
                  className={`w-full pl-8 pr-3.5 py-2.5 text-sm font-semibold bg-white border rounded-xl text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 transition-all ${
                    error
                      ? "border-red-400 focus:ring-red-500/20 focus:border-red-500"
                      : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"
                  }`}
                />
              </div>
              {error ? (
                <p className="text-[11px] text-red-500 mt-1.5 font-medium">{error}</p>
              ) : (
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Remaining balance after this payment:{" "}
                  <span
                    className={`font-semibold ${
                      remainingBalance === 0 ? "text-emerald-600" : "text-slate-700"
                    }`}
                  >
                    ₹{remainingBalance.toLocaleString("en-IN")}
                  </span>
                </p>
              )}
            </div>

            {/* Payment Mode Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Payment Mode <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer appearance-none pr-9"
                >
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Credit Card (Visa)">Credit Card (Visa)</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Net Banking">Net Banking</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Auto-Debit (ECS)">Auto-Debit (ECS)</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Payment Date Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                />
                <CalendarIcon className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Remark Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Remark
              </label>
              <textarea
                rows={2}
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Optional note about this payment..."
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  submitting ||
                  isFullyPaid ||
                  numAmount <= 0 ||
                  numAmount > maxPayable
                }
                className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center min-w-[110px]"
              >
                {submitting ? "Saving..." : "Save Payment"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  record,
  onSavePayment,
}: RecordPaymentModalProps) {
  if (!isOpen || !record) return null;

  return (
    <RecordPaymentDialog
      key={`${record.id}-${record.balance ?? record.outstanding ?? 0}`}
      record={record}
      onClose={onClose}
      onSavePayment={onSavePayment}
    />
  );
}

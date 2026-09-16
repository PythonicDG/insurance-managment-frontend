"use client";

import React from "react";
import {
  ArrowLeft,
  Pencil,
  Car,
  User,
  ExternalLink,
  PlusCircle,
  CheckCircle2,
} from "lucide-react";
import { InsuranceRecordItem } from "@/lib/api";

interface InsuranceRecordDetailProps {
  record: InsuranceRecordItem;
  onBack: () => void;
  onEdit: (record: InsuranceRecordItem) => void;
  onMakePayment: (record: InsuranceRecordItem) => void;
}

export function InsuranceRecordDetail({
  record,
  onBack,
  onEdit,
  onMakePayment,
}: InsuranceRecordDetailProps) {
  // Format Date Helper
  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // Format Currency
  const formatCurrency = (val: number | string | undefined) => {
    if (val === undefined || val === null) return "₹0.00";
    const num = typeof val === "number" ? val : parseFloat(String(val)) || 0;
    return `₹${num.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const totalPremium =
    typeof record.total_premium === "number"
      ? record.total_premium
      : parseFloat(String(record.total_premium || 0));

  const paidAmount = record.paid_amount ?? 0;
  const balance =
    record.balance !== undefined
      ? record.balance
      : Math.max(0, totalPremium - paidAmount);

  const transactions = record.transactions || [];
  const remarksText = record.remarks || "No underwriting remarks or notes recorded for this policy.";

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Page Header */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 mb-2 cursor-pointer group transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Records</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Insurance Record Details
          </h2>

          <div className="flex items-center gap-2.5">
            {balance > 0 ? (
              <button
                type="button"
                onClick={() => onMakePayment(record)}
                className="px-4 py-2 border border-amber-400 text-amber-600 hover:bg-amber-50 rounded-xl text-xs font-bold tracking-wider uppercase transition-colors cursor-pointer"
              >
                MAKE PAYMENT
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold tracking-wider uppercase select-none">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                FULLY PAID
              </span>
            )}

            <button
              type="button"
              onClick={() => onEdit(record)}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 bg-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5 text-slate-500" />
              <span>Edit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Card 1: Insurance Details */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-4">
          Insurance Details
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Policy Number
            </p>
            <p className="text-xs sm:text-sm font-bold text-blue-600 truncate">
              {record.policy_number}
            </p>
          </div>

          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Insurance Company
            </p>
            <p className="text-xs sm:text-sm font-semibold text-slate-800">
              {record.insurance_company?.name || "—"}
            </p>
          </div>

          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Insurance Start Date
            </p>
            <p className="text-xs sm:text-sm font-semibold text-slate-800">
              {formatDate(record.policy_start_date)}
            </p>
          </div>

          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Insurance Expiry Date
            </p>
            <p className="text-xs sm:text-sm font-semibold text-slate-800">
              {formatDate(record.policy_expiry_date)}
            </p>
          </div>

          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Vehicle Class Type
            </p>
            <p className="text-xs sm:text-sm font-semibold text-slate-800">
              {record.vehicle_class || record.vehicle?.vehicle_type || "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Row 2: Vehicle Information & Customer Details Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left Card: Vehicle Information */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                Vehicle Information
              </h3>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Car className="w-4 h-4" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Vehicle Type
                </p>
                <p className="text-xs sm:text-sm font-semibold text-slate-800">
                  {record.vehicle?.vehicle_type || "—"}
                </p>
              </div>

              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Vehicle Number
                </p>
                <p className="text-xs sm:text-sm font-semibold text-slate-800">
                  {record.vehicle?.vehicle_number || "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Customer Details */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                Customer Details
              </h3>
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center font-bold text-xs">
                {record.customer?.name ? record.customer.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Customer Name
                  </p>
                  <p className="text-xs sm:text-sm font-semibold text-slate-800">
                    {record.customer?.name || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Phone Number
                  </p>
                  <p className="text-xs sm:text-sm font-semibold text-slate-800">
                    {record.customer?.phone || "—"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Residential Address
                </p>
                <p className="text-xs sm:text-sm text-slate-600">
                  {record.customer?.address || "No address provided"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <a
              href="#customer"
              onClick={(e) => e.preventDefault()}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              <span>View Customer Profile</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Card 4: Payment Summary */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3">
            Payment Summary
          </h3>

          {/* 3 Metrics Boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4">
              <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Premium
              </p>
              <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
                {formatCurrency(totalPremium)}
              </p>
            </div>

            <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4">
              <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Paid
              </p>
              <p className="text-lg sm:text-xl font-extrabold text-emerald-600 mt-1">
                {formatCurrency(paidAmount)}
              </p>
            </div>

            <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4">
              <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Outstanding Balance
              </p>
              <p
                className={`text-lg sm:text-xl font-extrabold mt-1 ${
                  balance <= 0 ? "text-emerald-600" : "text-red-500"
                }`}
              >
                {formatCurrency(balance)}
              </p>
            </div>
          </div>
        </div>

        {/* Transaction History Sub-table */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-xs font-bold text-slate-800">
              Transaction History
            </h4>
            {balance > 0 && (
              <button
                type="button"
                onClick={() => onMakePayment(record)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Transaction</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            {transactions.length === 0 ? (
              <div className="py-8 text-center px-4 bg-slate-50/50">
                <p className="text-xs font-medium text-slate-500">
                  No payment transactions recorded yet.
                </p>
                {balance > 0 && (
                  <button
                    type="button"
                    onClick={() => onMakePayment(record)}
                    className="mt-2 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                  >
                    Record first payment →
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-400 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-4 uppercase tracking-wider">Date</th>
                    <th className="py-2.5 px-4 uppercase tracking-wider">Payment Mode</th>
                    <th className="py-2.5 px-4 uppercase tracking-wider">Amount</th>
                    <th className="py-2.5 px-4 uppercase tracking-wider">Note / Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {formatDate(tx.date)}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{tx.payment_mode}</td>
                      <td
                        className={`py-3 px-4 font-bold ${
                          tx.is_outstanding ? "text-red-500" : "text-slate-900"
                        }`}
                      >
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          {tx.note}
                          {tx.is_outstanding && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Card 5: Underwriting Remarks & Notes */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3">
          Underwriting Remarks &amp; Notes
        </h3>

        <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4 space-y-3">
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {remarksText}
          </p>

          <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
            POLICY RECORD • {formatDate(record.entry_date || record.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
}

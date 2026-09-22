"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Car,
  User,
  ExternalLink,
  PlusCircle,
  CheckCircle2,
  RefreshCw,
  History,
  ShieldCheck,
  Printer,
  Loader2,
} from "lucide-react";
import {
  InsuranceRecordItem,
  PaymentTransaction,
  BusinessSettings,
  paymentService,
  insuranceRecordService,
  settingsService,
} from "@/lib/api";
import { formatDisplayDate } from "@/lib/date-utils";
import {
  printTransactionStatement,
  printSinglePaymentReceipt,
  printVehicleHistorySummary,
} from "@/lib/print-transaction-receipt";

interface InsuranceRecordDetailProps {
  record: InsuranceRecordItem;
  onBack: () => void;
  onEdit: (record: InsuranceRecordItem) => void;
  onMakePayment: (record: InsuranceRecordItem) => void;
  onRenew?: (record: InsuranceRecordItem) => void;
  onSelectRecord?: (record: InsuranceRecordItem) => void;
}

export function InsuranceRecordDetail({
  record,
  onBack,
  onEdit,
  onMakePayment,
  onRenew,
  onSelectRecord,
}: InsuranceRecordDetailProps) {
  // Format Date Helper (avoids UTC date shifts)
  const formatDate = (dateString?: string) => {
    return formatDisplayDate(dateString);
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

  const [transactions, setTransactions] = useState<PaymentTransaction[]>(
    () => record.payments || record.transactions || []
  );

  const [vehicleHistory, setVehicleHistory] = useState<InsuranceRecordItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [paidAmount, setPaidAmount] = useState<number>(() => {
    if (typeof record.total_paid !== "undefined" && record.total_paid !== null) {
      return parseFloat(String(record.total_paid));
    }
    return typeof record.paid_amount === "number"
      ? record.paid_amount
      : parseFloat(String(record.paid_amount || 0));
  });

  const [balance, setBalance] = useState<number>(() => {
    if (typeof record.outstanding !== "undefined" && record.outstanding !== null) {
      return parseFloat(String(record.outstanding));
    }
    if (typeof record.balance === "number") {
      return record.balance;
    }
    const initialPaid =
      typeof record.total_paid !== "undefined" && record.total_paid !== null
        ? parseFloat(String(record.total_paid))
        : typeof record.paid_amount === "number"
        ? record.paid_amount
        : parseFloat(String(record.paid_amount || 0));
    return Math.max(0, totalPremium - initialPaid);
  });

  const [agencySettings, setAgencySettings] = useState<BusinessSettings | null>(null);
  const [printingRecordId, setPrintingRecordId] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    settingsService
      .get()
      .then((settings) => {
        if (mounted) setAgencySettings(settings);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    // Sync with record prop
    const propTxs = record.payments || record.transactions || [];
    if (propTxs.length > 0) {
      setTransactions(propTxs);
    }
    const propPaid =
      typeof record.total_paid !== "undefined" && record.total_paid !== null
        ? parseFloat(String(record.total_paid))
        : typeof record.paid_amount === "number"
        ? record.paid_amount
        : parseFloat(String(record.paid_amount || 0));
    setPaidAmount(propPaid);

    const propBal =
      typeof record.outstanding !== "undefined" && record.outstanding !== null
        ? parseFloat(String(record.outstanding))
        : typeof record.balance === "number"
        ? record.balance
        : Math.max(0, totalPremium - propPaid);
    setBalance(propBal);

    // Fetch authoritative payment history directly from the backend
    if (record.id) {
      paymentService
        .getHistory(record.id)
        .then((history) => {
          if (!active || !history) return;
          const freshTxs = history.payments || history.transactions || [];
          setTransactions(freshTxs);
          if (typeof history.total_paid !== "undefined" && history.total_paid !== null) {
            setPaidAmount(parseFloat(String(history.total_paid)) || 0);
          }
          if (typeof history.outstanding !== "undefined" && history.outstanding !== null) {
            setBalance(parseFloat(String(history.outstanding)) || 0);
          }
        })
        .catch(() => {
          // Keep current prop values
        });

      // Fetch vehicle insurance history
      setIsLoadingHistory(true);
      insuranceRecordService
        .getVehicleHistory(record.id)
        .then((data) => {
          if (!active || !data) return;
          setVehicleHistory(data.records || []);
        })
        .catch(() => {
          // Keep empty if fails
        })
        .finally(() => {
          if (active) setIsLoadingHistory(false);
        });
    }

    return () => {
      active = false;
    };
  }, [record.id, record, totalPremium]);

  const currentRecord: InsuranceRecordItem = {
    ...record,
    total_paid: paidAmount,
    paid_amount: paidAmount,
    outstanding: balance,
    balance: balance,
    payments: transactions,
    transactions: transactions,
  };

  const remarksText = record.remarks || "No underwriting remarks or notes recorded for this policy.";

  // Handlers for printing transactions
  const handlePrintCurrentTransactions = () => {
    printTransactionStatement({
      record: currentRecord,
      transactions,
      settings: agencySettings,
      totalPaid: paidAmount,
      balance: balance,
    });
  };

  const handlePrintRecordTransactions = async (item: InsuranceRecordItem) => {
    if (item.id === record.id) {
      handlePrintCurrentTransactions();
      return;
    }

    setPrintingRecordId(item.id);
    try {
      const history = await paymentService.getHistory(item.id);
      const freshTxs =
        history?.payments ||
        history?.transactions ||
        item.payments ||
        item.transactions ||
        [];
      const paid =
        typeof history?.total_paid !== "undefined" && history?.total_paid !== null
          ? parseFloat(String(history.total_paid)) || 0
          : typeof item.total_paid !== "undefined" && item.total_paid !== null
          ? parseFloat(String(item.total_paid)) || 0
          : typeof item.paid_amount === "number"
          ? item.paid_amount
          : 0;
      const bal =
        typeof history?.outstanding !== "undefined" && history?.outstanding !== null
          ? parseFloat(String(history.outstanding)) || 0
          : typeof item.outstanding !== "undefined" && item.outstanding !== null
          ? parseFloat(String(item.outstanding)) || 0
          : typeof item.balance === "number"
          ? item.balance
          : 0;

      printTransactionStatement({
        record: item,
        transactions: freshTxs,
        settings: agencySettings,
        totalPaid: paid,
        balance: bal,
      });
    } catch {
      printTransactionStatement({
        record: item,
        transactions: item.payments || item.transactions || [],
        settings: agencySettings,
      });
    } finally {
      setPrintingRecordId(null);
    }
  };

  const handlePrintSingleTransaction = (tx: PaymentTransaction) => {
    printSinglePaymentReceipt({
      record: currentRecord,
      transaction: tx,
      settings: agencySettings,
    });
  };

  const handlePrintVehicleHistorySummary = () => {
    printVehicleHistorySummary({
      vehicleNumber: record.vehicle?.vehicle_number || "Vehicle",
      vehicleType: record.vehicle?.vehicle_type,
      customerName: record.customer?.name,
      historyRecords: vehicleHistory.length > 0 ? vehicleHistory : [record],
      settings: agencySettings,
    });
  };

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
            {onRenew && (
              <button
                type="button"
                onClick={() => onRenew(record)}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-emerald-300 text-emerald-700 hover:bg-emerald-50 bg-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                <span>Renew Policy</span>
              </button>
            )}

            {balance > 0 ? (
              <button
                type="button"
                onClick={() => onMakePayment(currentRecord)}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4 sm:gap-6">
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
              Status
            </p>
            <div>
              {record.is_active ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  Expired / Inactive
                </span>
              )}
            </div>
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
              Record Entry Date
            </p>
            <p className="text-xs sm:text-sm font-semibold text-slate-800">
              {formatDate(record.entry_date)}
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
            {record.customer?.id ? (
              <Link
                href={`/customers/${record.customer.id}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                <span>View Customer Profile</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            ) : (
              <span className="text-xs text-slate-400">Customer profile not available</span>
            )}
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
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <h4 className="text-xs font-bold text-slate-800">
              Transaction History
            </h4>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrintCurrentTransactions}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
                title="Print official transaction statement & receipt"
              >
                <Printer className="w-3.5 h-3.5 text-blue-600" />
                <span>Print Statement</span>
              </button>

              {balance > 0 && (
                <button
                  type="button"
                  onClick={() => onMakePayment(currentRecord)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200/80 rounded-xl transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Transaction</span>
                </button>
              )}
            </div>
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
                    onClick={() => onMakePayment(currentRecord)}
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
                    <th className="py-2.5 px-4 uppercase tracking-wider text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {formatDate(tx.date || tx.payment_date)}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {tx.payment_mode || tx.payment_method || "Cash"}
                      </td>
                      <td
                        className={`py-3 px-4 font-bold ${
                          tx.is_outstanding ? "text-red-500" : "text-slate-900"
                        }`}
                      >
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          {tx.note || tx.notes || "—"}
                          {tx.is_outstanding && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handlePrintSingleTransaction(tx)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-blue-700 bg-slate-50 hover:bg-blue-50 border border-slate-200/80 hover:border-blue-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          title="Print individual payment voucher receipt"
                        >
                          <Printer className="w-3 h-3 text-blue-600" />
                          <span>Receipt</span>
                        </button>
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

      {/* Card 6: Vehicle Insurance History */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">
              Vehicle Insurance History ({record.vehicle?.vehicle_number || "Vehicle"})
            </h3>
          </div>
          <div className="flex items-center gap-2.5">
            {vehicleHistory.length > 0 && (
              <>
                <span className="text-xs text-slate-500 font-medium">
                  {vehicleHistory.length} total record{vehicleHistory.length === 1 ? "" : "s"}
                </span>
                <button
                  type="button"
                  onClick={handlePrintVehicleHistorySummary}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
                  title="Print summary of all policies recorded under this vehicle"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-600" />
                  <span>Print History Summary</span>
                </button>
              </>
            )}
          </div>
        </div>

        {isLoadingHistory ? (
          <div className="py-6 text-center text-xs text-slate-400">Loading history...</div>
        ) : vehicleHistory.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No other policy records found for this vehicle.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-400 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4 uppercase tracking-wider">Policy #</th>
                  <th className="py-2.5 px-4 uppercase tracking-wider">Company</th>
                  <th className="py-2.5 px-4 uppercase tracking-wider">Insurance Period</th>
                  <th className="py-2.5 px-4 uppercase tracking-wider">Premium</th>
                  <th className="py-2.5 px-4 uppercase tracking-wider">Status</th>
                  <th className="py-2.5 px-4 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {vehicleHistory.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/50 transition-colors ${
                      item.id === record.id ? "bg-blue-50/40 font-medium" : ""
                    }`}
                  >
                    <td className="py-3 px-4 text-slate-900">
                      <span className="font-semibold">{item.policy_number}</span>
                      {item.id === record.id && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                          Viewing
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {item.insurance_company?.name || "—"}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {formatDate(item.policy_start_date)} – {formatDate(item.policy_expiry_date)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {formatCurrency(item.total_premium)}
                    </td>
                    <td className="py-3 px-4">
                      {item.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          Expired / Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={printingRecordId === item.id}
                          onClick={() => handlePrintRecordTransactions(item)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50/80 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                          title={`Print transaction history statement for Policy #${item.policy_number}`}
                        >
                          {printingRecordId === item.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                          ) : (
                            <Printer className="w-3.5 h-3.5 text-blue-600" />
                          )}
                          <span>Print Transactions</span>
                        </button>

                        {item.id !== record.id && onSelectRecord && (
                          <button
                            type="button"
                            onClick={() => onSelectRecord(item)}
                            className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-lg transition-colors cursor-pointer"
                            title="View details of this policy"
                          >
                            View
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

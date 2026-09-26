"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Car,
  Calendar,
  Building2,
  Receipt,
  PlusCircle,
  Loader2,
  Clock,
  ArrowDownRight,
  Printer,
  MessageSquare,
} from "lucide-react";
import {
  LedgerRecord,
  PaymentTransaction,
  InsuranceRecordItem,
  BusinessSettings,
  ledgerService,
  paymentService,
  settingsService,
  whatsAppService,
} from "@/lib/api";

import { printTransactionStatement } from "@/lib/print-transaction-receipt";

interface LedgerRecordDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: LedgerRecord | null;
  onOpenUpdatePayment: (record: LedgerRecord) => void;
}

export function LedgerRecordDetailModal({
  isOpen,
  onClose,
  record,
  onOpenUpdatePayment,
}: LedgerRecordDetailModalProps) {
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [agencySettings, setAgencySettings] = useState<BusinessSettings | null>(null);

  useEffect(() => {
    if (isOpen) {
      settingsService
        .get()
        .then((data) => setAgencySettings(data))
        .catch(() => setAgencySettings(null));
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && record) {
      setLoadingPayments(true);
      ledgerService
        .getRecordDetail(record.id)
        .then((detail) => {
          setPayments(detail.payments || detail.transactions || []);
        })
        .catch(() => {
          // Fallback to record's embedded payments or paymentService
          if (record.payments && record.payments.length > 0) {
            setPayments(record.payments);
          } else {
            paymentService
              .getByRecordId(record.id)
              .then((txs) => setPayments(txs || []))
              .catch(() => setPayments([]));
          }
        })
        .finally(() => setLoadingPayments(false));
    }
  }, [isOpen, record]);

  const [sendingPaymentId, setSendingPaymentId] = useState<number | string | null>(null);

  const [waNotice, setWaNotice] = useState<string | null>(null);

  const handleSendWhatsAppPayment = async (tx: PaymentTransaction) => {
    setSendingPaymentId(tx.id);
    setWaNotice(null);
    try {
      const res = await whatsAppService.sendPaymentWhatsApp(tx.id);
      if (res.success) {
        setWaNotice(`WhatsApp receipt sent for Payment #${tx.id}!`);
      } else {
        setWaNotice(`Failed to send WhatsApp: ${res.message}`);
      }
    } catch {
      setWaNotice("Error connecting to WhatsApp API.");
    } finally {
      setSendingPaymentId(null);
      setTimeout(() => setWaNotice(null), 5000);
    }
  };

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

  const getStatusBadge = () => {
    if (outstanding <= 0 || record.status === "Paid" || record.payment_status === "PAID") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
          Paid
        </span>
      );
    }
    if (paidAmount > 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200">
          Partial
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200">
        Outstanding
      </span>
    );
  };

  const handlePrintStatement = () => {
    if (!record) return;
    const recordItem: InsuranceRecordItem = {
      id: record.id,
      policy_number: record.policy_number,
      total_premium: totalPremium,
      paid_amount: paidAmount,
      total_paid: paidAmount,
      outstanding: outstanding,
      balance: outstanding,
      entry_date: record.entry_date,
      policy_start_date: record.policy_start_date,
      policy_expiry_date: record.policy_expiry_date,
      customer: {
        id: record.customer_id,
        name: record.customer_name,
        phone: record.customer_phone,
        alternative_mobile_number: record.customer_alternative_mobile_number || record.alternative_mobile_number,
        address: "",
      },
      vehicle: {
        id: record.vehicle_id,
        vehicle_number: record.vehicle_number,
        vehicle_type: record.vehicle_type,
      },
      insurance_company: {
        id: record.insurance_company_id,
        name: record.insurance_company_name,
      },
      is_active: true,
      payments: payments,
      transactions: payments,
    } as unknown as InsuranceRecordItem;

    printTransactionStatement({
      record: recordItem,
      transactions: payments,
      settings: agencySettings,
      totalPaid: paidAmount,
      balance: outstanding,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-3 min-w-0">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                  Policy #{record.policy_number}
                </h2>
                {getStatusBadge()}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Ledger Transaction Record &amp; Payment History
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintStatement}
              className="p-1.5 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Print or Save Statement as PDF"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Customer & Vehicle Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Customer Box */}
            <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/80">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-2">
                <User className="w-4 h-4 text-blue-600" />
                <span>Customer Information</span>
              </div>
              <p className="text-sm font-bold text-slate-900">{record.customer_name}</p>
              <p className="text-xs text-slate-600 mt-0.5">{record.customer_phone}</p>
              {(record.alternative_mobile_number || record.customer_alternative_mobile_number) && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Alt: {record.alternative_mobile_number || record.customer_alternative_mobile_number}
                </p>
              )}
              {record.customer_email && (
                <p className="text-xs text-slate-400 mt-0.5 truncate">{record.customer_email}</p>
              )}
            </div>

            {/* Vehicle & Company Box */}
            <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/80">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-2">
                <Car className="w-4 h-4 text-blue-600" />
                <span>Vehicle &amp; Insurance</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">{record.vehicle_number}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{record.vehicle_type || "Vehicle"}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-800 bg-white px-2 py-1 rounded-lg border border-slate-200">
                    {record.insurance_company_name}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3 Financial Metrics Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs text-center">
              <span className="block text-[10px] sm:text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                Total Premium
              </span>
              <span className="text-sm sm:text-lg font-bold text-slate-900">
                ₹{totalPremium.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs text-center">
              <span className="block text-[10px] sm:text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                Amount Received
              </span>
              <span className="text-sm sm:text-lg font-bold text-emerald-600">
                ₹{paidAmount.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs text-center">
              <span className="block text-[10px] sm:text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                Outstanding Balance
              </span>
              <span className="text-sm sm:text-lg font-bold text-red-500">
                ₹{outstanding.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Payment Transactions Ledger Table */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-slate-500" />
                <span>Payment Transactions ({payments.length})</span>
              </h3>
              {outstanding > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenUpdatePayment(record);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Update Payment</span>
                </button>
              )}
            </div>

            {loadingPayments ? (
              <div className="py-8 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-2" />
                <span className="text-xs">Loading transaction history...</span>
              </div>
            ) : payments.length === 0 ? (
              <div className="bg-slate-50 rounded-xl p-6 text-center border border-dashed border-slate-200">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">No Payments Recorded</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  No payment receipts have been entered for this policy yet.
                </p>
                {outstanding > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenUpdatePayment(record);
                    }}
                    className="mt-3 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Record Initial Payment
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {waNotice && (
                  <div className="mb-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
                    <span>{waNotice}</span>
                    <button type="button" onClick={() => setWaNotice(null)} className="opacity-70 hover:opacity-100">✕</button>
                  </div>
                )}
                <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">

                  <thead className="bg-slate-50/80 text-[11px] text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-200/80">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Notes / Ref</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((tx, idx) => {
                      const amt =
                        typeof tx.amount === "number"
                          ? tx.amount
                          : parseFloat(String(tx.amount || 0));
                      const dateDisplay = formatDate(tx.payment_date || tx.date);
                      const method = tx.payment_method || tx.payment_mode || "Cash";
                      const noteText = tx.notes || tx.note || "—";

                      return (
                        <tr key={tx.id || idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 font-medium text-slate-700 whitespace-nowrap">
                            {dateDisplay}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                              {method}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-emerald-600 whitespace-nowrap">
                            ₹{amt.toLocaleString("en-IN")}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 max-w-[180px] truncate" title={noteText}>
                            {noteText}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleSendWhatsAppPayment(tx)}
                              disabled={sendingPaymentId === tx.id}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                              title="Send WhatsApp payment receipt"
                            >
                              {sendingPaymentId === tx.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <MessageSquare className="w-3 h-3 text-emerald-600" />
                              )}
                              <span>WhatsApp</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="text-xs text-slate-500">
            Entry Date: <span className="font-medium text-slate-700">{formatDate(record.entry_date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintStatement}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
              title="Print or Save Statement as PDF"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>Print Statement</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
            {outstanding > 0 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenUpdatePayment(record);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>Update Payment</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

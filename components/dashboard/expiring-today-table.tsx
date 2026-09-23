"use client";

import React from "react";
import Link from "next/link";
import { Plus, ArrowRight, AlertTriangle, Calendar, CheckCircle2, Clock } from "lucide-react";
import { DashboardExpiringTodayRecord } from "@/lib/api";
import { formatINR } from "./dashboard-kpi-card";

interface ExpiringTodayTableProps {
  records: DashboardExpiringTodayRecord[];
  onAddNewRecord?: () => void;
  loading?: boolean;
}

export function ExpiringTodayTable({
  records,
  onAddNewRecord,
  loading = false,
}: ExpiringTodayTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/70 shadow-xs animate-pulse">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <div className="h-6 bg-slate-200 rounded w-52"></div>
            <div className="h-4 bg-slate-100 rounded w-40"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 bg-slate-200 rounded w-36"></div>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-slate-100 rounded-xl w-full"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/70 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/70 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Expiring Today Records
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
                  {records.length} {records.length === 1 ? "Policy" : "Policies"}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Policies that reach expiration date today and require immediate attention or renewal
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Link
            href="/insurance-records?status=expiring_soon"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100/80 text-amber-800 text-xs font-semibold transition-all duration-150 cursor-pointer shadow-2xs"
            title="Filter all policies expiring within the next 10 days"
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Expiring Soon (10 Days)</span>
          </Link>

          <Link
            href="/insurance-records/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-xs hover:shadow transition-all duration-150 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Record</span>
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-5 sm:-mx-6">
        <div className="inline-block min-w-full align-middle px-5 sm:px-6">
          <table className="min-w-full divide-y divide-slate-100">
            <thead>
              <tr className="border-b border-slate-200/80">
                <th
                  scope="col"
                  className="py-3.5 pr-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                >
                  Expiry Date
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                >
                  Customer
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                >
                  Vehicle No.
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                >
                  Company & Policy
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                >
                  Premium
                </th>
                <th
                  scope="col"
                  className="pl-3 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider"
                >
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center">
                    <div className="max-w-md mx-auto flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-3">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-semibold text-slate-800">
                        No Policies Expiring Today
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 mb-4">
                        All active policies are valid today. You can monitor upcoming renewals in the next 10 days.
                      </p>
                      <Link
                        href="/insurance-records?status=expiring_soon"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                      >
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>View Policies Expiring in Next 10 Days</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((rec) => {
                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-amber-50/40 transition-colors group cursor-pointer"
                    >
                      {/* Expiry Date */}
                      <td className="whitespace-nowrap py-3.5 pr-3 text-xs sm:text-sm text-slate-700 font-medium">
                        <Link
                          href={`/insurance-records?view=${rec.id}`}
                          className="block w-full"
                        >
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            Expires Today
                          </span>
                          <span className="block text-[11px] text-slate-500 mt-0.5">
                            {rec.formatted_expiry_date || rec.policy_expiry_date}
                          </span>
                        </Link>
                      </td>

                      {/* Customer */}
                      <td className="whitespace-nowrap px-3 py-3.5 text-xs sm:text-sm font-bold text-slate-900">
                        <Link
                          href={`/insurance-records?view=${rec.id}`}
                          className="block w-full hover:text-blue-600 transition-colors"
                        >
                          <div>{rec.customer_name}</div>
                          {rec.customer_phone && (
                            <div className="text-[11px] font-normal text-slate-500 font-mono">
                              {rec.customer_phone}
                            </div>
                          )}
                        </Link>
                      </td>

                      {/* Vehicle Number */}
                      <td className="whitespace-nowrap px-3 py-3.5 text-xs sm:text-sm font-medium text-slate-700 font-mono">
                        <Link
                          href={`/insurance-records?view=${rec.id}`}
                          className="block w-full"
                        >
                          <div className="font-semibold text-slate-900">{rec.vehicle_number}</div>
                          {rec.vehicle_type && (
                            <div className="text-[11px] text-slate-500 font-sans">
                              {rec.vehicle_type}
                            </div>
                          )}
                        </Link>
                      </td>

                      {/* Company & Policy */}
                      <td className="whitespace-nowrap px-3 py-3.5 text-xs sm:text-sm text-slate-700">
                        <Link
                          href={`/insurance-records?view=${rec.id}`}
                          className="block w-full"
                        >
                          <div className="font-medium text-slate-900 truncate max-w-[160px]">
                            {rec.insurance_company || "N/A"}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {rec.policy_number}
                          </div>
                        </Link>
                      </td>

                      {/* Premium */}
                      <td className="whitespace-nowrap px-3 py-3.5 text-xs sm:text-sm font-bold text-slate-900">
                        <Link
                          href={`/insurance-records?view=${rec.id}`}
                          className="block w-full"
                        >
                          <div>{formatINR(rec.total_premium)}</div>
                          {rec.outstanding > 0 ? (
                            <div className="text-[11px] font-semibold text-rose-600">
                              Due: {formatINR(rec.outstanding)}
                            </div>
                          ) : (
                            <div className="text-[11px] font-medium text-emerald-600">
                              Paid
                            </div>
                          )}
                        </Link>
                      </td>

                      {/* Action */}
                      <td className="whitespace-nowrap pl-3 py-3.5 text-right text-xs">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            href={`/insurance-records?view=${rec.id}&renew=true`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                          >
                            Renew
                          </Link>
                          <Link
                            href={`/insurance-records?view=${rec.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          >
                            <span>View</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      {records.length > 0 && (
        <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {records.length} {records.length === 1 ? "policy" : "policies"} expiring today
          </span>
          <Link
            href="/insurance-records?status=expiring_soon"
            className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            <span>View All Expiring Soon (10 Days)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { Plus, ArrowRight } from "lucide-react";
import { DashboardRecentRecord } from "@/lib/api";
import { formatINR } from "./dashboard-kpi-card";

interface RecentRecordsTableProps {
  records: DashboardRecentRecord[];
  onAddNewRecord?: () => void;
  loading?: boolean;
}

export function RecentRecordsTable({
  records,
  onAddNewRecord,
  loading = false,
}: RecentRecordsTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/70 shadow-xs animate-pulse">
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 bg-slate-200 rounded w-52"></div>
          <div className="h-9 bg-slate-200 rounded w-36"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-slate-100 rounded-xl w-full"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/70 shadow-xs">
      {/* Header matching screenshot */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Recent Insurance Records
          </h3>
        </div>

        <Link
          href="/insurance-records/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-xs hover:shadow transition-all duration-150 cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Record</span>
        </Link>
      </div>

      {/* Table matching screenshot */}
      <div className="overflow-x-auto -mx-5 sm:-mx-6">
        <div className="inline-block min-w-full align-middle px-5 sm:px-6">
          <table className="min-w-full divide-y divide-slate-100">
            <thead>
              <tr className="border-b border-slate-200/80">
                <th
                  scope="col"
                  className="py-3.5 pr-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                >
                  Date
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
                  Premium
                </th>
                <th
                  scope="col"
                  className="pl-3 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider"
                >
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                    No insurance records found. Click &quot;Add New Record&quot; to create your first policy.
                  </td>
                </tr>
              ) : (
                records.map((rec) => {
                  const status = rec.status || "Outstanding";
                  let badgeClass = "bg-rose-50 text-rose-700 border border-rose-200/60";
                  if (status.toLowerCase() === "paid") {
                    badgeClass = "bg-emerald-50 text-emerald-700 border border-emerald-200/60";
                  } else if (status.toLowerCase() === "partial") {
                    badgeClass = "bg-amber-50 text-amber-700 border border-amber-200/60";
                  }

                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                    >
                      {/* Date */}
                      <td className="whitespace-nowrap py-3.5 pr-3 text-xs sm:text-sm text-slate-600">
                        <Link
                          href={`/insurance-records?view=${rec.id}`}
                          className="block w-full"
                        >
                          {rec.formatted_date || rec.entry_date}
                        </Link>
                      </td>

                      {/* Customer */}
                      <td className="whitespace-nowrap px-3 py-3.5 text-xs sm:text-sm font-bold text-slate-900">
                        <Link
                          href={`/insurance-records?view=${rec.id}`}
                          className="block w-full hover:text-blue-600 transition-colors"
                        >
                          {rec.customer_name}
                        </Link>
                      </td>

                      {/* Vehicle Number */}
                      <td className="whitespace-nowrap px-3 py-3.5 text-xs sm:text-sm font-medium text-slate-600 font-mono">
                        <Link
                          href={`/insurance-records?view=${rec.id}`}
                          className="block w-full"
                        >
                          {rec.vehicle_number}
                        </Link>
                      </td>

                      {/* Premium */}
                      <td className="whitespace-nowrap px-3 py-3.5 text-xs sm:text-sm font-bold text-slate-900">
                        <Link
                          href={`/insurance-records?view=${rec.id}`}
                          className="block w-full"
                        >
                          {formatINR(rec.total_premium)}
                        </Link>
                      </td>

                      {/* Status Badge */}
                      <td className="whitespace-nowrap pl-3 py-3.5 text-right text-xs">
                        <Link
                          href={`/insurance-records?view=${rec.id}`}
                          className="inline-block"
                        >
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClass}`}
                          >
                            {status}
                          </span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View All Footer */}
      {records.length > 0 && (
        <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Showing latest {records.length} records</span>
          <Link
            href="/insurance-records"
            className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            <span>View All Records</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}

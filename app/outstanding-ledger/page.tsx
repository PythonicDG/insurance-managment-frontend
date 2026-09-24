"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import {
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Loader2,
  FileSpreadsheet,
  FileText,
  Printer,
  AlertCircle,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  LedgerRecord,
  LedgerSummary,
  InsuranceCompany,
  BusinessSettings,
  companyService,
  ledgerService,
  settingsService,
} from "@/lib/api";
import { LedgerKpiCards, formatINR } from "@/components/ledger/ledger-kpi-cards";
import { DateRangePopover } from "@/components/ledger/date-range-popover";
import { LedgerUpdatePaymentModal } from "@/components/ledger/ledger-update-payment-modal";
import { LedgerRecordDetailModal } from "@/components/ledger/ledger-record-detail-modal";
import { Toast, ToastType } from "@/components/ui/toast";
import { formatLocalDateISO } from "@/lib/date-utils";
import { printOutstandingLedgerReport } from "@/lib/print-transaction-receipt";

export default function OutstandingLedgerPage() {
  // Data states
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [records, setRecords] = useState<LedgerRecord[]>([]);
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters state
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("all");
  // Default to 'outstanding_partial' matching Figma screenshot
  const [selectedStatus, setSelectedStatus] = useState("outstanding_partial");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<LedgerRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [selectedRecordForPayment, setSelectedRecordForPayment] = useState<LedgerRecord | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Agency settings for PDF / print branding
  const [agencySettings, setAgencySettings] = useState<BusinessSettings | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState<{
    open: boolean;
    type: ToastType;
    title: string;
    message?: string;
  }>({
    open: false,
    type: "success",
    title: "",
    message: "",
  });

  const showToast = (type: ToastType, title: string, message?: string) => {
    setToast({ open: true, type, title, message });
  };

  // Fetch active companies & agency settings on mount
  useEffect(() => {
    companyService
      .getAll({ is_active: true })
      .then((data) => setCompanies(data || []))
      .catch(() => setCompanies([]));

    settingsService
      .get()
      .then((data) => setAgencySettings(data))
      .catch(() => setAgencySettings(null));
  }, []);

  // Fetch ledger records & summary
  const fetchLedger = useCallback(
    async (pageToLoad = currentPage) => {
      setLoading(true);
      try {
        const res = await ledgerService.getLedger({
          search: searchQuery.trim() || undefined,
          insurance_company_id: selectedCompany !== "all" ? selectedCompany : undefined,
          payment_status: selectedStatus,
          date_from: fromDate || undefined,
          date_to: toDate || undefined,
          page: pageToLoad,
          page_size: pageSize,
        });

        startTransition(() => {
          setSummary(res.summary);
          setRecords(res.results || []);
          setTotalCount(res.count || 0);
          setTotalPages(res.total_pages || 1);
          setCurrentPage(res.page || 1);
        });
      } catch (err) {
        console.error("Failed to load ledger data", err);
        showToast("error", "Failed to Load", "Could not load outstanding ledger records.");
      } finally {
        setLoading(false);
      }
    },
    [searchQuery, selectedCompany, selectedStatus, fromDate, toDate, pageSize]
  );

  // Load when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLedger(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchLedger]);

  // Format currency
  const formatCurrency = (val: number | string | undefined | null) => {
    const num = typeof val === "number" ? val : parseFloat(String(val || 0));
    if (isNaN(num)) return "₹0";
    return `₹${num.toLocaleString("en-IN")}`;
  };

  // Format phone display (+91 format if valid 10-digit number)
  const formatPhone = (phone?: string) => {
    if (!phone) return "—";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith("91")) {
      return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
    }
    return phone;
  };

  const handleOpenDetail = (record: LedgerRecord) => {
    setSelectedRecordForDetail(record);
    setIsDetailModalOpen(true);
  };

  const handleOpenPayment = (record: LedgerRecord) => {
    setSelectedRecordForPayment(record);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    showToast("success", "Payment Updated", "Payment recorded successfully and ledger recalculated.");
    fetchLedger(currentPage);
  };

  const handleResetFilters = () => {
    setFromDate("");
    setToDate("");
    setSelectedCompany("all");
    setSelectedStatus("outstanding_partial");
    setSearchQuery("");
  };

  // Export CSV helper
  const handleExportCSV = async () => {
    if (records.length === 0) {
      showToast("info", "No records", "There are no records to export.");
      return;
    }

    let recordsToExport = records;

    if (totalCount > records.length) {
      try {
        showToast("info", "Preparing Export", "Loading all records for CSV export...");
        const params: Record<string, string | number | boolean> = {
          paginate: "false",
        };
        if (searchQuery.trim()) params.search = searchQuery.trim();
        if (selectedCompany !== "all") params.insurance_company_id = selectedCompany;
        if (selectedStatus !== "all") params.payment_status = selectedStatus;
        if (fromDate.trim()) params.date_from = fromDate.trim();
        if (toDate.trim()) params.date_to = toDate.trim();

        const res = await ledgerService.getLedger(params);
        if (res && Array.isArray(res.results)) {
          recordsToExport = res.results;
        }
      } catch (err) {
        console.error("Failed to load all records for CSV, exporting current page", err);
      }
    }

    const headers = [
      "Customer Name",
      "Phone",
      "Vehicle Number",
      "Insurance Company",
      "Policy Number",
      "Total Premium",
      "Paid Amount",
      "Outstanding",
      "Status",
    ];

    const rows = recordsToExport.map((r) => [
      `"${r.customer_name || ""}"`,
      `"${r.customer_phone || ""}"`,
      `"${r.vehicle_number || ""}"`,
      `"${r.insurance_company_name || ""}"`,
      `"${r.policy_number || ""}"`,
      r.total_premium,
      r.paid_amount,
      r.outstanding,
      r.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `outstanding_ledger_${formatLocalDateISO(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("success", "Export Ready", `Exported ${recordsToExport.length} outstanding records as CSV.`);
  };

  // Save as PDF / Print All Handler
  const handlePrint = async () => {
    if (records.length === 0) {
      showToast("info", "No records", "There are no records to print.");
      return;
    }

    let recordsToPrint = records;

    // If total records exceed current page, fetch all matching records for the complete PDF
    if (totalCount > records.length) {
      try {
        setIsPrinting(true);
        showToast("info", "Preparing Report", "Loading all filtered records for PDF...");
        const params: Record<string, string | number | boolean> = {
          paginate: "false",
        };
        if (searchQuery.trim()) params.search = searchQuery.trim();
        if (selectedCompany !== "all") {
          params.insurance_company_id = selectedCompany;
        }
        if (selectedStatus !== "all") {
          params.payment_status = selectedStatus;
        }
        if (fromDate.trim()) params.date_from = fromDate.trim();
        if (toDate.trim()) params.date_to = toDate.trim();

        const res = await ledgerService.getLedger(params);
        if (res && Array.isArray(res.results)) {
          recordsToPrint = res.results;
        }
      } catch (err) {
        console.error("Failed to load all records for PDF, falling back to current page", err);
        showToast("error", "Notice", "Could not fetch all records, printing current page.");
      } finally {
        setIsPrinting(false);
      }
    }

    const companyObj = companies.find((c) => String(c.id) === String(selectedCompany));
    const companyName = companyObj ? companyObj.name : selectedCompany !== "all" ? selectedCompany : undefined;

    printOutstandingLedgerReport({
      records: recordsToPrint,
      settings: agencySettings,
      filters: {
        company: companyName,
        status: selectedStatus,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        search: searchQuery.trim() || undefined,
      },
      summary: summary,
    });
  };

  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalCount);

  return (
    <DashboardLayout title="Outstanding / Ledger" subtitle="Finance / Outstanding">
      <div className="space-y-5 sm:space-y-6">
        {/* Top 4 KPI Summary Cards matching Figma */}
        <LedgerKpiCards summary={summary} loading={loading && !summary} />

        {/* Filters Card matching Figma */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Date Range Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Date Range
              </label>
              <DateRangePopover
                fromDate={fromDate}
                toDate={toDate}
                onChange={(from, to) => {
                  setFromDate(from);
                  setToDate(to);
                }}
              />
            </div>

            {/* 2. Insurance Company Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Insurance Company
              </label>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-2xs min-h-[38px]"
              >
                <option value="all">All companies</option>
                {companies.map((co) => (
                  <option key={co.id} value={co.id}>
                    {co.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Payment Status Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Payment Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-2xs min-h-[38px]"
              >
                <option value="outstanding_partial">Outstanding &amp; Partial</option>
                <option value="outstanding">Outstanding Only</option>
                <option value="partial">Partial Only</option>
                <option value="paid">Paid</option>
                <option value="all">All Statuses</option>
              </select>
            </div>

            {/* 4. Search Customer/Vehicle */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Search Customer/Vehicle
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name or vehicle number"
                  className="w-full pl-3 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs min-h-[38px]"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar matching Insurance Records tab */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <p className="text-xs text-slate-500 font-normal">
            Outstanding = Total Premium − Paid Amount, auto-calculated.
          </p>

          <div className="flex items-center flex-wrap gap-2">
            {(fromDate || toDate || selectedCompany !== "all" || selectedStatus !== "outstanding_partial" || searchQuery) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1 mr-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-blue-600 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
              title="Export filtered records as CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-blue-600 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              title="Save filtered records as professional PDF"
            >
              {isPrinting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-blue-600" />
              )}
              <span>Save as PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-blue-600 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              title="Print All filtered records"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>Print All</span>
            </button>
          </div>
        </div>

        {/* Main Table Card: Outstanding Records */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Card Header */}
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Outstanding Records
            </h2>
            <div className="text-xs text-slate-500 font-medium">
              {totalCount > 0 ? (
                <span>
                  Total Pending Policies: <strong className="text-slate-900">{totalCount}</strong>
                </span>
              ) : null}
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[900px]">
              <thead className="bg-white border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">CUSTOMER NAME</th>
                  <th className="py-3.5 px-4">PHONE</th>
                  <th className="py-3.5 px-4">VEHICLE NUMBER</th>
                  <th className="py-3.5 px-4">INSURANCE COMPANY</th>
                  <th className="py-3.5 px-4">TOTAL PREMIUM</th>
                  <th className="py-3.5 px-4">PAID AMOUNT</th>
                  <th className="py-3.5 px-4">OUTSTANDING</th>
                  <th className="py-3.5 px-4">STATUS</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && records.length === 0 ? (
                  // Skeleton loader rows
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-4 px-4 sm:px-6">
                        <div className="h-3.5 bg-slate-200 rounded w-28" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-3 bg-slate-100 rounded w-24" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-3.5 bg-slate-200 rounded w-24" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-3 bg-slate-100 rounded w-24" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-3.5 bg-slate-200 rounded w-16" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-3.5 bg-slate-200 rounded w-14" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-3.5 bg-slate-200 rounded w-16" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-4 bg-slate-200 rounded-full w-14" />
                      </td>
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="h-3.5 bg-slate-200 rounded w-20 ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-700">No Records Found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        No outstanding or ledger entries match your filter criteria.
                      </p>
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="mt-3 px-3.5 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
                      >
                        Reset All Filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  records.map((r) => {
                    const outstandingNum =
                      typeof r.outstanding === "number"
                        ? r.outstanding
                        : parseFloat(String(r.outstanding || 0));

                    const isPartial = r.status === "Partial";
                    const isOutstanding = r.status === "Outstanding" || outstandingNum > 0 && !isPartial;
                    const isPaid = r.status === "Paid" || outstandingNum <= 0;

                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        {/* 1. Customer Name */}
                        <td className="py-3.5 px-4 sm:px-6 font-bold text-slate-900 whitespace-nowrap">
                          {r.customer_name || "—"}
                        </td>

                        {/* 2. Phone */}
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          {formatPhone(r.customer_phone)}
                        </td>

                        {/* 3. Vehicle Number */}
                        <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                          {r.vehicle_number || "—"}
                        </td>

                        {/* 4. Insurance Company */}
                        <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                          {r.insurance_company_name || "—"}
                        </td>

                        {/* 5. Total Premium */}
                        <td className="py-3.5 px-4 font-medium text-slate-900 whitespace-nowrap">
                          {formatCurrency(r.total_premium)}
                        </td>

                        {/* 6. Paid Amount */}
                        <td className="py-3.5 px-4 font-medium text-slate-900 whitespace-nowrap">
                          {formatCurrency(r.paid_amount)}
                        </td>

                        {/* 7. Outstanding */}
                        <td className="py-3.5 px-4 font-bold text-red-500 whitespace-nowrap">
                          {formatCurrency(r.outstanding)}
                        </td>

                        {/* 8. Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isPaid ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                              Paid
                            </span>
                          ) : isPartial ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-600 border border-amber-200">
                              Partial
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-200">
                              Outstanding
                            </span>
                          )}
                        </td>

                        {/* 9. Actions */}
                        <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-3 sm:gap-4">
                            {/* View Action with Eye Icon */}
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(r)}
                              className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 font-semibold text-xs transition-colors cursor-pointer"
                              title="View Ledger & Transactions"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>

                            {/* Update Payment Action */}
                            <button
                              type="button"
                              onClick={() => handleOpenPayment(r)}
                              className="text-blue-600 hover:text-blue-700 font-semibold text-xs transition-colors cursor-pointer"
                              title="Record or Update Payment"
                            >
                              Update Payment
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar matching Figma */}
          {totalCount > 0 && (
            <div className="px-5 sm:px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/40">
              <div className="text-xs text-slate-500 font-medium">
                Showing <strong className="text-slate-800">{startRecord}</strong> to{" "}
                <strong className="text-slate-800">{endRecord}</strong> of{" "}
                <strong className="text-slate-800">{totalCount}</strong> records
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5 select-none">
                  {/* Previous Button */}
                  <button
                    type="button"
                    disabled={currentPage <= 1 || loading}
                    onClick={() => fetchLedger(currentPage - 1)}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5) {
                      if (currentPage > 3) {
                        pageNum = currentPage - 2 + i;
                      }
                      if (pageNum > totalPages) {
                        pageNum = totalPages - (4 - i);
                      }
                    }

                    const isActive = pageNum === currentPage;

                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => fetchLedger(pageNum)}
                        disabled={loading}
                        className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs flex items-center justify-center ${
                          isActive
                            ? "bg-blue-600 text-white"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  {/* Next Button */}
                  <button
                    type="button"
                    disabled={currentPage >= totalPages || loading}
                    onClick={() => fetchLedger(currentPage + 1)}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                    title="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Update Payment Modal */}
      <LedgerUpdatePaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        record={selectedRecordForPayment}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Record Detail & Ledger History Modal */}
      <LedgerRecordDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        record={selectedRecordForDetail}
        onOpenUpdatePayment={(rec) => {
          setSelectedRecordForPayment(rec);
          setIsPaymentModalOpen(true);
        }}
      />

      {/* Toast Feedback */}
      <Toast
        open={toast.open}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </DashboardLayout>
  );
}

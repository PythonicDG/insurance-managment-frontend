"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import { createPortal } from "react-dom";
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
  MoreVertical,
  CreditCard,
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
import { LedgerKpiCards } from "@/components/ledger/ledger-kpi-cards";
import {
  DashboardDateFilter,
  DashboardDateRange,
} from "@/components/dashboard/dashboard-date-filter";
import { LedgerUpdatePaymentModal } from "@/components/ledger/ledger-update-payment-modal";
import { LedgerRecordDetailModal } from "@/components/ledger/ledger-record-detail-modal";
import { Toast, ToastType } from "@/components/ui/toast";
import { formatLocalDateISO } from "@/lib/date-utils";
import { printOutstandingLedgerReport } from "@/lib/print-transaction-receipt";
import { ExportPinModal } from "@/components/modals/export-pin-modal";

export default function OutstandingLedgerPage() {
  // Data states
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [records, setRecords] = useState<LedgerRecord[]>([]);
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters state
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dateFilter, setDateFilter] = useState<DashboardDateRange>({
    preset: "all",
    label: "All Time",
  });
  const [selectedCompany, setSelectedCompany] = useState("all");
  // Default to 'outstanding_partial' matching Figma screenshot
  const [selectedStatus, setSelectedStatus] = useState("outstanding_partial");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<LedgerRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [selectedRecordForPayment, setSelectedRecordForPayment] = useState<LedgerRecord | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const [actionMenu, setActionMenu] = useState<{
    record: LedgerRecord;
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    if (!actionMenu) return;

    const closeMenu = () => setActionMenu(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [actionMenu]);

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
    async (pageToLoad: number) => {
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

  const handleDateFilterChange = (range: DashboardDateRange) => {
    setDateFilter(range);
    setFromDate(range.startDate || "");
    setToDate(range.endDate || "");
  };

  const handleToggleActionMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
    record: LedgerRecord
  ) => {
    event.stopPropagation();

    if (actionMenu?.record.id === record.id) {
      setActionMenu(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 192;
    const menuHeight = 94;
    const spaceBelow = window.innerHeight - rect.bottom;

    setActionMenu({
      record,
      top:
        spaceBelow >= menuHeight + 8
          ? rect.bottom + 6
          : Math.max(8, rect.top - menuHeight - 6),
      left: Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8)),
    });
  };

  const handlePaymentSuccess = () => {
    showToast("success", "Payment Updated", "Payment recorded successfully and ledger recalculated.");
    fetchLedger(currentPage);
  };

  const handleResetFilters = () => {
    setFromDate("");
    setToDate("");
    setDateFilter({ preset: "all", label: "All Time" });
    setSelectedCompany("all");
    setSelectedStatus("outstanding_partial");
    setSearchQuery("");
  };

  // Export PIN Security state
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "export_csv" | "save_pdf" | "print_all" | null
  >(null);

  const requestProtectedAction = async (action: "export_csv" | "save_pdf" | "print_all") => {
    if (records.length === 0) {
      showToast("info", "No records", "There are no records to export or print.");
      return;
    }

    try {
      const settings = await settingsService.get();
      if (!settings.is_export_pin_set) {
        // PIN is not configured yet - directly execute without asking for PIN
        if (action === "export_csv") {
          executeExportCSV();
        } else if (action === "save_pdf") {
          executePrint("save_pdf");
        } else if (action === "print_all") {
          executePrint("print_all");
        }
        return;
      }
    } catch (err) {
      console.warn("Could not check PIN configuration:", err);
    }

    setPendingAction(action);
    setIsPinModalOpen(true);
  };

  const handlePinSuccess = () => {
    const action = pendingAction;
    setIsPinModalOpen(false);
    setPendingAction(null);
    if (action === "export_csv") {
      executeExportCSV();
    } else if (action === "save_pdf") {
      executePrint("save_pdf");
    } else if (action === "print_all") {
      executePrint("print_all");
    }
  };

  // Export CSV helper
  const executeExportCSV = async () => {
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
      "Discount",
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
      r.discount || 0,
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

    // Notify Business Email of the data download
    settingsService.notifyExport({
      action_type: "export_csv",
      source_module: "outstanding_ledger",
      record_count: recordsToExport.length,
      filters: {
        search: searchQuery.trim() || undefined,
        company: selectedCompany !== "all" ? selectedCompany : undefined,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
        date_from: fromDate.trim() || undefined,
        date_to: toDate.trim() || undefined,
      },
    });
  };

  // Save as PDF / Print All Handler
  const executePrint = async (actionType: "save_pdf" | "print_all" = "save_pdf") => {
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

    // Notify Business Email of the PDF save / print action
    settingsService.notifyExport({
      action_type: actionType,
      source_module: "outstanding_ledger",
      record_count: recordsToPrint.length,
      filters: {
        search: searchQuery.trim() || undefined,
        company: companyName,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
        date_from: fromDate.trim() || undefined,
        date_to: toDate.trim() || undefined,
      },
    });
  };

  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalCount);

  return (
    <DashboardLayout title="Outstanding / Ledger" subtitle="Finance / Outstanding">
      <div className="space-y-5 sm:space-y-6">
        {/* Dashboard-style filters */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-3 sm:gap-4 items-end">
            {/* Month, Year and custom period filter shared with Dashboard */}
            <div className="sm:col-span-2 xl:col-span-3">
              <label className="block text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Date / Period
              </label>
              <DashboardDateFilter
                value={dateFilter}
                onChange={handleDateFilterChange}
                disabled={loading && !summary}
              />
            </div>

            <div className="xl:col-span-1">
              <label className="block text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Company
              </label>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-2xs min-h-[34px] truncate"
              >
                <option value="all">All companies</option>
                {companies.map((co) => (
                  <option key={co.id} value={co.id}>
                    {co.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="xl:col-span-1">
              <label className="block text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-2xs min-h-[34px] truncate"
              >
                <option value="outstanding_partial">Outstanding &amp; Partial</option>
                <option value="outstanding">Outstanding Only</option>
                <option value="partial">Partial Only</option>
                <option value="paid">Paid</option>
                <option value="all">All Statuses</option>
              </select>
            </div>

            <div className="xl:col-span-2">
              <label className="block text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Search Records
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name or vehicle number"
                  className="w-full pl-3 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs min-h-[34px]"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Summary cards stay driven by the existing ledger calculations */}
        <LedgerKpiCards summary={summary} loading={loading && !summary} />

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
              onClick={() => requestProtectedAction("export_csv")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-blue-600 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
              title="Export filtered records as CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => requestProtectedAction("save_pdf")}
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
              onClick={() => requestProtectedAction("print_all")}
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
            <table className="w-full min-w-[960px] table-fixed text-left text-xs border-collapse">
              <thead className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="w-[136px] py-3 pl-4 pr-2.5">CUSTOMER</th>
                  <th className="w-[122px] py-3 px-2.5">PHONE</th>
                  <th className="w-[112px] py-3 px-2.5">VEHICLE</th>
                  <th className="w-[136px] py-3 px-2.5">COMPANY</th>
                  <th className="w-[94px] py-3 px-2.5">PREMIUM</th>
                  <th className="w-[78px] py-3 px-2.5">DISCOUNT</th>
                  <th className="w-[86px] py-3 px-2.5">PAID</th>
                  <th className="w-[104px] py-3 px-2.5">OUTSTANDING</th>
                  <th className="w-[94px] py-3 px-2.5">STATUS</th>
                  <th className="sticky right-0 z-10 w-[64px] py-3 px-2.5 text-center bg-slate-50 shadow-[-6px_0_10px_-10px_rgba(15,23,42,0.5)]">
                    ACTIONS
                  </th>
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
                    <td colSpan={10} className="py-12 text-center text-slate-400">
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
                    const isPaid = r.status === "Paid" || outstandingNum <= 0;

                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        {/* 1. Customer Name */}
                        <td
                          className="py-3 pl-4 pr-2.5 font-bold text-slate-900 whitespace-nowrap"
                          title={r.customer_name || undefined}
                        >
                          <div className="truncate">{r.customer_name || "—"}</div>
                        </td>

                        {/* 2. Phone */}
                        <td
                          className="py-3 px-2.5 text-slate-600 whitespace-nowrap"
                          title={formatPhone(r.customer_phone)}
                        >
                          <div className="truncate">{formatPhone(r.customer_phone)}</div>
                        </td>

                        {/* 3. Vehicle Number */}
                        <td
                          className="py-3 px-2.5 font-semibold text-slate-900 whitespace-nowrap"
                          title={r.vehicle_number || undefined}
                        >
                          <div className="truncate font-mono text-[11px]">
                            {r.vehicle_number || "—"}
                          </div>
                        </td>

                        {/* 4. Insurance Company */}
                        <td
                          className="py-3 px-2.5 text-slate-700 whitespace-nowrap"
                          title={r.insurance_company_name || undefined}
                        >
                          <div className="truncate">{r.insurance_company_name || "—"}</div>
                        </td>

                        {/* 5. Total Premium */}
                        <td className="py-3 px-2.5 font-medium text-slate-900 whitespace-nowrap">
                          {formatCurrency(r.total_premium)}
                        </td>

                        {/* 6. Discount */}
                        <td className="py-3 px-2.5 font-medium text-amber-700 whitespace-nowrap">
                          {Number(r.discount || 0) > 0 ? formatCurrency(r.discount) : "—"}
                        </td>

                        {/* 7. Paid Amount */}
                        <td className="py-3 px-2.5 font-medium text-slate-900 whitespace-nowrap">
                          {formatCurrency(r.paid_amount)}
                        </td>

                        {/* 8. Outstanding */}
                        <td className="py-3 px-2.5 font-bold text-red-500 whitespace-nowrap">
                          {formatCurrency(r.outstanding)}
                        </td>

                        {/* 9. Status */}
                        <td className="py-3 px-2.5 whitespace-nowrap">
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

                        {/* 10. Compact action menu */}
                        <td className="sticky right-0 z-[1] bg-white py-3 px-2.5 whitespace-nowrap text-center shadow-[-6px_0_10px_-10px_rgba(15,23,42,0.5)] transition-colors group-hover:bg-slate-50">
                          <button
                            type="button"
                            onClick={(event) => handleToggleActionMenu(event, r)}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                              actionMenu?.record.id === r.id
                                ? "border-blue-200 bg-blue-50 text-blue-600"
                                : "border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-800"
                            }`}
                            title="Ledger actions"
                            aria-label={`Actions for ${r.customer_name || "ledger record"}`}
                            aria-haspopup="menu"
                            aria-expanded={actionMenu?.record.id === r.id}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
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

      {actionMenu &&
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 cursor-default"
              onClick={(event) => {
                event.stopPropagation();
                setActionMenu(null);
              }}
              aria-label="Close actions menu"
            />
            <div
              role="menu"
              aria-label="Ledger record actions"
              className="fixed z-50 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
              style={{ top: actionMenu.top, left: actionMenu.left }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  const record = actionMenu.record;
                  setActionMenu(null);
                  handleOpenDetail(record);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-blue-600 cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
                View Ledger
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  const record = actionMenu.record;
                  setActionMenu(null);
                  handleOpenPayment(record);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-600 cursor-pointer"
              >
                <CreditCard className="h-3.5 w-3.5" />
                Update Payment
              </button>
            </div>
          </>,
          document.body
        )}

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

      {/* Export Security PIN Modal */}
      {isPinModalOpen && (
        <ExportPinModal
          isOpen
          onClose={() => {
            setIsPinModalOpen(false);
            setPendingAction(null);
          }}
          onSuccess={handlePinSuccess}
          requireConfirmation={pendingAction === "save_pdf" || pendingAction === "print_all"}
          confirmationLabel={pendingAction === "save_pdf" ? "Open Save as PDF" : "Open Print All"}
          title="Export Authorization"
          description={
            pendingAction === "export_csv"
              ? "Enter your Export Security PIN to download Outstanding Ledger records as CSV."
              : pendingAction === "save_pdf"
              ? "Enter your Export Security PIN to save Outstanding Ledger records as PDF."
              : "Enter your Export Security PIN to print all Outstanding Ledger records."
          }
        />
      )}

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

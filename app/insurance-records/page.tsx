"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import {
  Search,
  Plus,
  Calendar as CalendarIcon,
  FileSpreadsheet,
  FileText,
  Printer,
  Pencil,
  Trash2,
  ArrowUpDown,
  Loader2,
  ShieldCheck,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  X,
  Check,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Toast, ToastType } from "@/components/ui/toast";
import {
  companyService,
  insuranceRecordService,
  paymentService,
  InsuranceCompany,
  InsuranceRecordItem,
  PaymentTransaction,
} from "@/lib/api";
import { RecordPaymentModal } from "@/components/insurance/record-payment-modal";
import { RenewPolicyModal } from "@/components/insurance/renew-policy-modal";
import { InsuranceRecordDetail } from "@/components/insurance/insurance-record-detail";
import {
  MobileFiltersModal,
  FilterCategory,
} from "@/components/insurance/mobile-filters-modal";
import { formatLocalDateISO } from "@/lib/date-utils";

// Attach payments and calculate real paid/balance for a record
function augmentRecordWithPayments(rec: InsuranceRecordItem): InsuranceRecordItem {
  const total =
    typeof rec.total_premium === "number"
      ? rec.total_premium
      : parseFloat(String(rec.total_premium || 0));

  const allTxs = rec.payments || rec.transactions || [];

  const backendPaid =
    typeof rec.total_paid !== "undefined" && rec.total_paid !== null
      ? parseFloat(String(rec.total_paid))
      : typeof rec.paid_amount === "number"
      ? rec.paid_amount
      : typeof rec.paid_amount === "string"
      ? parseFloat(rec.paid_amount)
      : null;

  const paidAmount =
    backendPaid !== null && !isNaN(backendPaid)
      ? backendPaid
      : allTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const balance =
    typeof rec.outstanding !== "undefined" && rec.outstanding !== null
      ? parseFloat(String(rec.outstanding))
      : Math.max(0, total - paidAmount);

  return {
    ...rec,
    paid_amount: paidAmount,
    balance: balance,
    payments: allTxs,
    transactions: allTxs,
  };
}

function InsuranceRecordsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewId = searchParams.get("view");

  // Data state
  const [records, setRecords] = useState<InsuranceRecordItem[]>([]);
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Summary Metrics State (across entire database)
  const [activePoliciesCount, setActivePoliciesCount] = useState(0);
  const [outstandingCount, setOutstandingCount] = useState(0);

  // Filters state (defaults are empty so backend data isn't restricted)
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("All Companies");
  const [selectedStatus, setSelectedStatus] = useState("All Statuses");
  const [searchQuery, setSearchQuery] = useState("");

  // Sorting state
  const [sortField, setSortField] = useState<string>("entry_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Navigation / Detail view
  const [selectedRecordForDetail, setSelectedRecordForDetail] =
    useState<InsuranceRecordItem | null>(null);

  // Modals state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [recordForPayment, setRecordForPayment] = useState<InsuranceRecordItem | null>(null);

  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [recordToRenew, setRecordToRenew] = useState<InsuranceRecordItem | null>(null);

  const handleOpenRenewModal = (record: InsuranceRecordItem) => {
    setRecordToRenew(record);
    setIsRenewModalOpen(true);
  };

  const handleRenewSuccess = (newRecord: InsuranceRecordItem) => {
    setIsRenewModalOpen(false);
    setRecordToRenew(null);
    showToast(
      "success",
      "Policy Renewed",
      `Policy ${newRecord.policy_number} has been created as the active policy.`
    );
    fetchRecords(currentPage);
    fetchSummaryCounts();
    if (selectedRecordForDetail) {
      handleViewRecord(newRecord);
    }
  };

  // Mobile Filters Modal State
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [mobileFilterCategory, setMobileFilterCategory] = useState<FilterCategory>("company");

  const openMobileFilters = (category: FilterCategory = "company") => {
    setMobileFilterCategory(category);
    setIsMobileFiltersOpen(true);
  };

  const handleApplyMobileFilters = (filters: {
    fromDate: string;
    toDate: string;
    selectedCompany: string;
    selectedStatus: string;
    searchQuery: string;
    sortField: string;
    sortDirection: "asc" | "desc";
  }) => {
    setFromDate(filters.fromDate);
    setToDate(filters.toDate);
    setSelectedCompany(filters.selectedCompany);
    setSelectedStatus(filters.selectedStatus);
    setSearchQuery(filters.searchQuery);
    setSortField(filters.sortField);
    setSortDirection(filters.sortDirection);
    setCurrentPage(1);
  };

  const handleClearAllFilters = () => {
    setFromDate("");
    setToDate("");
    setSelectedCompany("All Companies");
    setSelectedStatus("All Statuses");
    setSearchQuery("");
    setSortField("entry_date");
    setSortDirection("desc");
    setCurrentPage(1);
  };

  // Active filter count for mobile badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCompany && selectedCompany !== "All Companies") count++;
    if (selectedStatus && selectedStatus !== "All Statuses") count++;
    if (fromDate) count++;
    if (toDate) count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [selectedCompany, selectedStatus, fromDate, toDate, searchQuery]);

  // Toast
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

  // Convert Date DD-MM-YYYY to YYYY-MM-DD for backend
  const normalizeDateToBackend = (val: string) => {
    if (!val) return "";
    const parts = val.split("-");
    if (parts.length === 3) {
      if (parts[0].length === 4) return val; // YYYY-MM-DD
      return `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-YYYY -> YYYY-MM-DD
    }
    return val;
  };

  // Fetch summary counts across all database records
  const fetchSummaryCounts = useCallback(async () => {
    try {
      const res = await insuranceRecordService.getAll({ paginate: "false" });
      const all: InsuranceRecordItem[] = Array.isArray(res)
        ? res
        : (res as { results?: InsuranceRecordItem[] })?.results || [];

      const augmented = all.map(augmentRecordWithPayments);
      const active = augmented.filter((r) => (r.status || "").toLowerCase() === "active").length;
      const outstanding = augmented.filter((r) => (r.balance ?? 0) > 0).length;

      setActivePoliciesCount(active);
      setOutstandingCount(outstanding);
    } catch {
      setActivePoliciesCount(0);
      setOutstandingCount(0);
    }
  }, []);

  // Fetch paginated records from backend API
  const fetchRecords = useCallback(
    async (pageToFetch = 1) => {
      setLoading(true);
      try {
        const params: Record<string, string | number> = {
          page: pageToFetch,
          page_size: pageSize,
        };

        if (searchQuery.trim()) {
          params.search = searchQuery.trim();
        }

        if (selectedCompany !== "All Companies") {
          const matched = companies.find((c) => c.name === selectedCompany);
          if (matched) {
            params.insurance_company_id = matched.id;
          }
        }

        if (selectedStatus !== "All Statuses") {
          params.status = selectedStatus.toLowerCase().replace(" ", "_");
        }

        if (fromDate.trim()) {
          const normalizedFrom = normalizeDateToBackend(fromDate.trim());
          if (normalizedFrom) params.entry_date_from = normalizedFrom;
        }

        if (toDate.trim()) {
          const normalizedTo = normalizeDateToBackend(toDate.trim());
          if (normalizedTo) params.entry_date_to = normalizedTo;
        }

        if (sortField) {
          params.ordering = sortDirection === "desc" ? `-${sortField}` : sortField;
        }

        const res = await insuranceRecordService.getAll(params);

        if (Array.isArray(res)) {
          const augmented = res.map(augmentRecordWithPayments);
          setRecords(augmented);
          setTotalCount(res.length);
        } else if (res && typeof res === "object") {
          const count = res.count ?? 0;
          const items = (res.results ?? []).map(augmentRecordWithPayments);
          setTotalCount(count);
          setRecords(items);
        } else {
          setRecords([]);
          setTotalCount(0);
        }
      } catch {
        setRecords([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    },
    [
      pageSize,
      searchQuery,
      selectedCompany,
      selectedStatus,
      fromDate,
      toDate,
      sortField,
      sortDirection,
      companies,
    ]
  );

  // Initial load: Fetch companies & initial records
  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const comps = await companyService.getAll();
        if (active && comps && comps.length > 0) {
          setCompanies(comps);
        }
      } catch {
        // Companies error handled gracefully
      }
    };
    init();
    return () => {
      active = false;
    };
  }, []);

  // Whenever filters, sort, or page change, query backend
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) {
        fetchRecords(currentPage);
        fetchSummaryCounts();
      }
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [fetchRecords, fetchSummaryCounts, currentPage]);

  // When ?view=<id> query param is present, load that record into detail view
  useEffect(() => {
    if (!viewId) {
      setSelectedRecordForDetail(null);
      return;
    }
    let active = true;
    const loadRecordForView = async () => {
      try {
        const rec = await insuranceRecordService.getById(Number(viewId));
        if (active && rec) {
          const augmented = augmentRecordWithPayments(rec);
          setSelectedRecordForDetail(augmented);
        }
      } catch {
        // Handled gracefully
      }
    };
    loadRecordForView();
    return () => {
      active = false;
    };
  }, [viewId]);

  // Handle header or input search
  const handleSearch = (q: string) => {
    setSearchQuery(q);
    setCurrentPage(1);
  };

  // Sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  // Total pages calculation
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Generate dynamic pagination buttons list
  const paginationPages = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
      return [1, 2, 3, "...", totalPages];
    }
    if (currentPage >= totalPages - 2) {
      return [1, "...", totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", currentPage, "...", totalPages];
  }, [totalPages, currentPage]);

  // Date Formatter: "2026-09-15" -> "15 Sep 2026"
  const formatDisplayDate = (dateStr?: string) => {
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

  // Format Currency: 78 -> "₹78"
  const formatCurrency = (val?: number | string) => {
    if (val === undefined || val === null) return "₹0";
    const num = typeof val === "number" ? val : parseFloat(String(val)) || 0;
    return `₹${Math.round(num).toLocaleString("en-IN")}`;
  };

  // Status Badge Helper
  const renderStatusBadge = (status?: string) => {
    const s = (status || "").toLowerCase();
    if (s === "active") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600">
          Active
        </span>
      );
    }
    if (s === "expiring_soon" || s === "expiring soon") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600">
          Expiring Soon
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">
        Expired
      </span>
    );
  };

  // Payment Recording
  const handleOpenPaymentModal = (record: InsuranceRecordItem) => {
    const total =
      typeof record.total_premium === "number"
        ? record.total_premium
        : parseFloat(String(record.total_premium || 0));
    const paid = record.paid_amount ?? 0;
    const outstanding =
      record.balance !== undefined ? record.balance : Math.max(0, total - paid);

    if (outstanding <= 0) {
      showToast(
        "info",
        "Fully Paid",
        `Policy ${record.policy_number} is already fully paid. Outstanding balance is ₹0.`
      );
      return;
    }

    setRecordForPayment(record);
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = async (paymentData: {
    recordId: number;
    paymentType: "full" | "partial";
    amount: number;
    paymentMode: string;
    paymentDate: string;
    remark: string;
  }) => {
    const currentRec =
      records.find((r) => r.id === paymentData.recordId) || selectedRecordForDetail;
    const currentBalance = currentRec ? (currentRec.balance ?? 0) : 0;

    if (currentBalance <= 0) {
      showToast(
        "error",
        "Payment Disallowed",
        "This policy is already fully paid. No further payments can be added."
      );
      return;
    }

    const payAmount = Math.min(paymentData.amount, currentBalance);
    if (payAmount <= 0) {
      showToast("error", "Invalid Amount", "Payment amount must be greater than zero.");
      return;
    }

    try {
      await paymentService.create({
        recordId: paymentData.recordId,
        amount: payAmount,
        payment_mode: paymentData.paymentMode,
        payment_date: paymentData.paymentDate,
        notes: paymentData.remark || "Payment recorded",
      });

      // Clear legacy localStorage cache for this record if any exists
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(`insure_payments_${paymentData.recordId}`);
        } catch {
          // ignore
        }
      }

      // Refresh records from backend
      await fetchRecords(currentPage);
      if (selectedRecordForDetail && selectedRecordForDetail.id === paymentData.recordId) {
        try {
          const freshDetail = await insuranceRecordService.getById(paymentData.recordId);
          setSelectedRecordForDetail(augmentRecordWithPayments(freshDetail));
        } catch {
          // ignore
        }
      }

      fetchSummaryCounts();

      showToast(
        "success",
        "Payment Recorded",
        `Payment of ₹${payAmount.toLocaleString("en-IN")} recorded successfully.`
      );
    } catch {
      showToast("error", "Payment Failed", "Could not record payment. Please try again.");
    }
  };

  // View Record Details Handler
  const handleViewRecord = async (record: InsuranceRecordItem) => {
    setSelectedRecordForDetail(augmentRecordWithPayments(record));
    router.push(`/insurance-records?view=${record.id}`);
    try {
      const fullDetail = await insuranceRecordService.getById(record.id);
      if (fullDetail) {
        setSelectedRecordForDetail(augmentRecordWithPayments(fullDetail));
      }
    } catch {
      // Keep initial record if request fails
    }
  };

  // Add / Edit Record Navigation Handlers
  const handleOpenAddModal = () => {
    router.push("/insurance-records/new");
  };

  const handleOpenEditModal = (record: InsuranceRecordItem) => {
    router.push(`/insurance-records/new?id=${record.id}`);
  };

  // Delete Record
  const handleDeleteRecord = async (record: InsuranceRecordItem) => {
    if (
      !confirm(
        `Are you sure you want to delete policy ${record.policy_number} for ${record.customer?.name || "this customer"}?`
      )
    ) {
      return;
    }

    try {
      await insuranceRecordService.delete(record.id);
      showToast("success", "Record Deleted", `Policy ${record.policy_number} has been removed.`);
      fetchRecords(currentPage);
      fetchSummaryCounts();
      if (selectedRecordForDetail?.id === record.id) {
        setSelectedRecordForDetail(null);
      }
    } catch {
      showToast("error", "Delete Failed", "Could not delete this insurance record.");
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (records.length === 0) {
      showToast("info", "No records", "There are no records to export.");
      return;
    }

    const headers = [
      "Insurance Start Date",
      "Customer Name",
      "Phone",
      "Vehicle Number",
      "Insurance Company",
      "Total Premium",
      "Paid Amount",
      "Balance",
      "Status",
    ];

    const escapeCsv = (val: string | number | undefined | null) => {
      if (val === undefined || val === null) return '""';
      return `"${String(val).replace(/"/g, '""')}"`;
    };

    const rows = records.map((r) => {
      const rawDate = r.policy_start_date || "";
      const formattedDate = rawDate ? formatDisplayDate(rawDate) : "";
      // Prepend ="..." so spreadsheet applications like Excel treat the date as text
      // and do not auto-convert it to a date serial that displays as ###### due to cell width
      const startDateCell = formattedDate ? `="${formattedDate}"` : '""';
      const phoneCell = r.customer?.phone ? `="${r.customer.phone}"` : '""';

      return [
        startDateCell,
        escapeCsv(r.customer?.name),
        phoneCell,
        escapeCsv(r.vehicle?.vehicle_number),
        escapeCsv(r.insurance_company?.name),
        typeof r.total_premium === "number"
          ? r.total_premium
          : parseFloat(String(r.total_premium || 0)) || 0,
        typeof r.paid_amount === "number"
          ? r.paid_amount
          : parseFloat(String(r.paid_amount || 0)) || 0,
        typeof r.balance === "number"
          ? r.balance
          : parseFloat(String(r.balance || 0)) || 0,
        escapeCsv(r.status),
      ];
    });

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Insurance_Records_${formatLocalDateISO(new Date())}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("success", "Export Ready", "CSV file generated from current records.");
  };

  // Print / Save as PDF Helper
  const printRecordsReport = (
    recordsToPrint: InsuranceRecordItem[],
    filters: {
      company: string;
      status: string;
      fromDate: string;
      toDate: string;
      search: string;
    }
  ) => {
    const totalPremium = recordsToPrint.reduce((sum, r) => {
      const val =
        typeof r.total_premium === "number"
          ? r.total_premium
          : parseFloat(String(r.total_premium || 0)) || 0;
      return sum + val;
    }, 0);

    const formatCurrency = (val: number) =>
      `₹${val.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

    const generatedDate = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const filterBadges: string[] = [];
    if (filters.company && filters.company !== "All Companies") {
      filterBadges.push(`Company: ${filters.company}`);
    }
    if (filters.status && filters.status !== "All Statuses") {
      filterBadges.push(`Status: ${filters.status}`);
    }
    if (filters.fromDate || filters.toDate) {
      const fDate = filters.fromDate ? formatDisplayDate(filters.fromDate) : "Any";
      const tDate = filters.toDate ? formatDisplayDate(filters.toDate) : "Present";
      filterBadges.push(`Date: ${fDate} to ${tDate}`);
    }
    if (filters.search) {
      filterBadges.push(`Search: "${filters.search}"`);
    }

    const rowsHtml = recordsToPrint
      .map((r, idx) => {
        const rawDate = r.policy_start_date || "";
        const displayDate = rawDate ? formatDisplayDate(rawDate) : "—";
        const customerName = r.customer?.name?.trim() || "—";
        const address = r.customer?.address?.trim() || "—";
        const phone = r.customer?.phone?.trim() || "—";
        const vehicleNum = r.vehicle?.vehicle_number?.trim() || "—";
        const companyName = r.insurance_company?.name?.trim() || "—";
        const prem =
          typeof r.total_premium === "number"
            ? r.total_premium
            : parseFloat(String(r.total_premium || 0)) || 0;

        return `
          <tr>
            <td class="col-idx">${idx + 1}</td>
            <td class="col-date">${displayDate}</td>
            <td class="col-name">${customerName}</td>
            <td class="col-addr">${address}</td>
            <td class="col-phone">${phone}</td>
            <td class="col-veh">${vehicleNum}</td>
            <td class="col-comp">${companyName}</td>
            <td class="col-prem">${formatCurrency(prem)}</td>
          </tr>
        `;
      })
      .join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Insurance Records Report</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 10mm 12mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              font-size: 11px;
              color: #0f172a;
              margin: 0;
              padding: 0;
              background: #fff;
              line-height: 1.4;
            }
            .report-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              border-bottom: 2.5px solid #2563eb;
              padding-bottom: 10px;
              margin-bottom: 12px;
            }
            .report-title {
              font-size: 19px;
              font-weight: 800;
              color: #0f172a;
              margin: 0 0 3px 0;
              letter-spacing: -0.5px;
            }
            .report-subtitle {
              font-size: 11px;
              color: #64748b;
              margin: 0;
            }
            .report-meta {
              text-align: right;
              font-size: 10px;
              color: #64748b;
              line-height: 1.5;
            }
            .report-meta strong {
              color: #0f172a;
            }
            .filter-chips {
              margin-bottom: 12px;
              display: flex;
              flex-wrap: wrap;
              gap: 6px;
            }
            .chip {
              display: inline-block;
              background: #f1f5f9;
              color: #475569;
              font-size: 10px;
              font-weight: 600;
              padding: 2px 8px;
              border-radius: 4px;
              border: 1px solid #e2e8f0;
            }
            .table-container {
              width: 100%;
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              overflow: hidden;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }
            thead {
              display: table-header-group;
            }
            thead th {
              background-color: #f1f5f9;
              color: #334155;
              font-weight: 700;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              padding: 9px 8px;
              text-align: left;
              border-bottom: 2px solid #94a3b8;
              border-right: 1px solid #cbd5e1;
            }
            thead th:last-child {
              border-right: none;
            }
            tbody tr {
              break-inside: avoid;
              page-break-inside: avoid;
            }
            tbody tr:nth-child(even) {
              background-color: #f8fafc;
            }
            tbody td {
              padding: 8px 8px;
              vertical-align: middle;
              border-bottom: 1px solid #e2e8f0;
              border-right: 1px solid #e2e8f0;
              word-wrap: break-word;
              font-size: 11px;
            }
            tbody td:last-child {
              border-right: none;
            }
            tbody tr:last-child td {
              border-bottom: none;
            }
            .col-idx {
              width: 32px;
              text-align: center;
              color: #64748b;
              font-weight: 600;
              font-size: 10px;
            }
            .col-date {
              width: 88px;
              white-space: nowrap;
              font-weight: 600;
              color: #334155;
            }
            .col-name {
              width: 135px;
              font-weight: 700;
              color: #0f172a;
              font-size: 11.5px;
            }
            .col-addr {
              color: #475569;
              font-size: 10.5px;
              line-height: 1.35;
            }
            .col-phone {
              width: 105px;
              white-space: nowrap;
              font-family: monospace;
              font-size: 11px;
              color: #334155;
            }
            .col-veh {
              width: 100px;
              white-space: nowrap;
              font-family: monospace;
              font-weight: 700;
              color: #0f172a;
            }
            .col-comp {
              width: 115px;
              font-weight: 600;
              color: #334155;
            }
            .col-prem {
              width: 105px;
              text-align: right;
              font-weight: 700;
              font-size: 11.5px;
              color: #0f172a;
              white-space: nowrap;
              padding-right: 10px;
            }
            .summary-bar {
              margin-top: 14px;
              display: flex;
              justify-content: flex-end;
              gap: 24px;
              padding: 10px 16px;
              background: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              font-size: 11px;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .summary-item strong {
              color: #0f172a;
              font-weight: 700;
            }
            .summary-total {
              color: #2563eb;
              font-size: 12.5px;
              font-weight: 800;
            }
          </style>
        </head>
        <body>
          <div class="report-header">
            <div>
              <h1 class="report-title">INSURANCE RECORDS REPORT</h1>
              <p class="report-subtitle">Policy Register &amp; Customer Ledger Summary</p>
            </div>
            <div class="report-meta">
              <div>Printed On: <strong>${generatedDate}</strong></div>
              <div>Total Records: <strong>${recordsToPrint.length}</strong></div>
            </div>
          </div>

          ${
            filterBadges.length > 0
              ? `<div class="filter-chips">${filterBadges
                  .map((b) => `<span class="chip">${b}</span>`)
                  .join("")}</div>`
              : ""
          }

          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th class="col-idx">#</th>
                  <th class="col-date">Insurance Start Date</th>
                  <th class="col-name">Customer Name</th>
                  <th class="col-addr">Address</th>
                  <th class="col-phone">Mobile Number</th>
                  <th class="col-veh">Vehicle Number</th>
                  <th class="col-comp">Insurance Company</th>
                  <th class="col-prem" style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>

          <div class="summary-bar">
            <div class="summary-item">Total Records: <strong>${recordsToPrint.length}</strong></div>
            <div class="summary-item">Total Premium: <span class="summary-total">${formatCurrency(totalPremium)}</span></div>
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1000);
      }, 250);
    }
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
        showToast("info", "Preparing Report", "Loading all filtered records for PDF...");
        const params: Record<string, string | number> = {
          paginate: "false",
        };
        if (searchQuery.trim()) params.search = searchQuery.trim();
        if (selectedCompany !== "All Companies") {
          const matched = companies.find((c) => c.name === selectedCompany);
          if (matched) params.insurance_company_id = matched.id;
        }
        if (selectedStatus !== "All Statuses") {
          params.status = selectedStatus.toLowerCase().replace(" ", "_");
        }
        if (fromDate.trim()) {
          const norm = normalizeDateToBackend(fromDate.trim());
          if (norm) params.entry_date_from = norm;
        }
        if (toDate.trim()) {
          const norm = normalizeDateToBackend(toDate.trim());
          if (norm) params.entry_date_to = norm;
        }
        if (sortField) {
          params.ordering = sortDirection === "desc" ? `-${sortField}` : sortField;
        }

        const res = await insuranceRecordService.getAll(params);
        const all = Array.isArray(res)
          ? res
          : (res as { results?: InsuranceRecordItem[] })?.results || [];
        if (all.length > 0) {
          recordsToPrint = all.map(augmentRecordWithPayments);
        }
      } catch {
        recordsToPrint = records;
      }
    }

    printRecordsReport(recordsToPrint, {
      company: selectedCompany,
      status: selectedStatus,
      fromDate,
      toDate,
      search: searchQuery,
    });
  };

  // Pagination display values
  const startRecord = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalCount);

  return (
    <DashboardLayout title="Insurance Records" onSearch={handleSearch}>
      <Toast
        open={toast.open}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setRecordForPayment(null);
        }}
        record={recordForPayment}
        onSavePayment={handleSavePayment}
      />

      {/* Renew Policy Modal */}
      <RenewPolicyModal
        isOpen={isRenewModalOpen}
        onClose={() => {
          setIsRenewModalOpen(false);
          setRecordToRenew(null);
        }}
        record={recordToRenew}
        companies={companies}
        onRenewSuccess={handleRenewSuccess}
      />

      {/* Mobile Filters Popup Modal (Flipkart / Amazon Style) */}
      <MobileFiltersModal
        isOpen={isMobileFiltersOpen}
        onClose={() => setIsMobileFiltersOpen(false)}
        companies={companies}
        fromDate={fromDate}
        toDate={toDate}
        selectedCompany={selectedCompany}
        selectedStatus={selectedStatus}
        searchQuery={searchQuery}
        sortField={sortField}
        sortDirection={sortDirection}
        initialCategory={mobileFilterCategory}
        onApplyFilters={handleApplyMobileFilters}
        onResetFilters={handleClearAllFilters}
        totalRecordsCount={totalCount}
      />

      {/* View Switch: Record Details vs Records Table */}
      {selectedRecordForDetail ? (
        <InsuranceRecordDetail
          record={selectedRecordForDetail}
          onBack={() => {
            setSelectedRecordForDetail(null);
            router.push("/insurance-records");
          }}
          onEdit={handleOpenEditModal}
          onMakePayment={handleOpenPaymentModal}
          onRenew={handleOpenRenewModal}
          onSelectRecord={handleViewRecord}
        />
      ) : (
        <div className="space-y-4">
          {/* Top Row: Subtitle + Dynamic Backend Counters */}
          {/* <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
            <p className="text-xs sm:text-sm text-slate-500">
              Manage, search and track vehicle policy premium payment statuses
            </p>

            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="inline-flex items-center gap-1.5 text-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span>
                  Active Policies:{" "}
                  <span className="font-bold text-slate-900">
                    {activePoliciesCount.toLocaleString("en-IN")}
                  </span>
                </span>
              </div>

              <div className="inline-flex items-center gap-1.5 text-slate-700">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <span>
                  Outstanding:{" "}
                  <span className="font-bold text-slate-900">
                    {outstandingCount.toLocaleString("en-IN")}
                  </span>
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  fetchRecords(currentPage);
                  fetchSummaryCounts();
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                title="Refresh records"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div> */}

          {/* Mobile Filter & Search Section (Flipkart / Amazon Style) */}
          <div className="lg:hidden space-y-2.5">
            {/* Row 1: Search Input + Add Record Button */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search customer, vehicle, phone..."
                  className="w-full pl-8 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => handleSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleOpenAddModal}
                className="inline-flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-xs font-semibold shadow-2xs transition-colors shrink-0 whitespace-nowrap min-h-[35px] cursor-pointer"
                title="Add New Record"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add</span>
              </button>
            </div>

            {/* Row 2: Flipkart / Amazon 5-Button Filter Bar (Horizontal Scrollable) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none select-none">
              {/* Button 1: Master Filter Button */}
              <button
                type="button"
                onClick={() => openMobileFilters("company")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer shadow-2xs ${
                  activeFilterCount > 0
                    ? "bg-blue-600 text-white shadow-blue-500/20 hover:bg-blue-700"
                    : "bg-white border border-slate-200 text-slate-800 hover:bg-slate-50"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-white text-blue-600 text-[10px] font-bold flex items-center justify-center shadow-xs">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Button 2: Company Filter Button */}
              <button
                type="button"
                onClick={() => openMobileFilters("company")}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-all cursor-pointer shadow-2xs max-w-[130px] ${
                  selectedCompany !== "All Companies"
                    ? "bg-blue-50 border border-blue-400 text-blue-700 font-semibold"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="truncate">
                  {selectedCompany !== "All Companies" ? selectedCompany : "Company"}
                </span>
                <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
              </button>

              {/* Button 3: Status Filter Button */}
              <button
                type="button"
                onClick={() => openMobileFilters("status")}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-all cursor-pointer shadow-2xs ${
                  selectedStatus !== "All Statuses"
                    ? "bg-blue-50 border border-blue-400 text-blue-700 font-semibold"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="truncate">
                  {selectedStatus !== "All Statuses" ? selectedStatus : "Status"}
                </span>
                <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
              </button>

              {/* Button 4: Date Filter Button */}
              <button
                type="button"
                onClick={() => openMobileFilters("date")}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-all cursor-pointer shadow-2xs ${
                  fromDate || toDate
                    ? "bg-blue-50 border border-blue-400 text-blue-700 font-semibold"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="truncate">
                  {fromDate || toDate ? "Dates Set" : "Date Range"}
                </span>
                <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
              </button>

              {/* Button 5: Sort By Button */}
              <button
                type="button"
                onClick={() => openMobileFilters("sort")}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-all cursor-pointer shadow-2xs ${
                  sortField !== "entry_date" || sortDirection !== "desc"
                    ? "bg-blue-50 border border-blue-400 text-blue-700 font-semibold"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <ArrowUpDown className="w-3 h-3 opacity-60 shrink-0" />
                <span className="truncate">Sort</span>
              </button>

              {/* Quick Clear All Pill if any filter is active */}
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100/70 border border-rose-200/80 shrink-0 transition-colors cursor-pointer"
                  title="Clear all filters"
                >
                  <X className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Row 3: Active Filter Chips Bar (Flipkart/Amazon style) */}
            {activeFilterCount > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                <span className="text-slate-400 font-semibold shrink-0 text-[10px] uppercase tracking-wider">
                  Active:
                </span>

                {selectedCompany !== "All Companies" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 shrink-0 font-medium">
                    <span className="truncate max-w-[100px]">{selectedCompany}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCompany("All Companies");
                        setCurrentPage(1);
                      }}
                      className="hover:text-rose-600 cursor-pointer p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {selectedStatus !== "All Statuses" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 shrink-0 font-medium">
                    <span>{selectedStatus}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStatus("All Statuses");
                        setCurrentPage(1);
                      }}
                      className="hover:text-rose-600 cursor-pointer p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {fromDate && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 shrink-0 font-medium">
                    <span>From: {fromDate}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setFromDate("");
                        setCurrentPage(1);
                      }}
                      className="hover:text-rose-600 cursor-pointer p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {toDate && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 shrink-0 font-medium">
                    <span>To: {toDate}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setToDate("");
                        setCurrentPage(1);
                      }}
                      className="hover:text-rose-600 cursor-pointer p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Desktop Filter Bar (Direct Inputs - Visible only on Desktop lg+) */}
          <div className="hidden lg:block bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
              {/* FROM DATE */}
              <div className="lg:col-span-2">
                <label className="block text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  FROM DATE
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => {
                      setFromDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-3 pr-8 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  />
                  <CalendarIcon className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* TO DATE */}
              <div className="lg:col-span-2">
                <label className="block text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  TO DATE
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => {
                      setToDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-3 pr-8 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  />
                  <CalendarIcon className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* INSURANCE COMPANY */}
              <div className="lg:col-span-2">
                <label className="block text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  INSURANCE COMPANY
                </label>
                <div className="relative">
                  <select
                    value={selectedCompany}
                    onChange={(e) => {
                      setSelectedCompany(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-3 pr-7 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer appearance-none truncate"
                  >
                    <option value="All Companies">All Companies</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* PAYMENT STATUS */}
              <div className="lg:col-span-2">
                <label className="block text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  PAYMENT STATUS
                </label>
                <div className="relative">
                  <select
                    value={selectedStatus}
                    onChange={(e) => {
                      setSelectedStatus(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-3 pr-7 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer appearance-none truncate"
                  >
                    <option value="All Statuses">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Expiring Soon">Expiring Soon</option>
                    <option value="Expired">Expired</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* SEARCH RECORDS */}
              <div className="lg:col-span-3">
                <label className="block text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  SEARCH RECORDS
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search by Customer Name, Vehicle or Phone..."
                    className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* + Add New Record Button */}
              <div className="lg:col-span-1">
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="w-full inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer whitespace-nowrap min-h-[35px]"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>

          {/* Export Options Bar */}
          <div className="flex items-center justify-between py-1">
            <span className="text-xs font-semibold text-slate-500">
              Export Options:
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-blue-600 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-blue-600 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Save as PDF</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-blue-600 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5 text-blue-600" />
                <span>Print All</span>
              </button>
            </div>
          </div>

          {/* Data Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                <p className="text-xs">Loading records from backend...</p>
              </div>
            ) : records.length === 0 ? (
              <div className="py-16 text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  No insurance records found
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {searchQuery || selectedCompany !== "All Companies" || selectedStatus !== "All Statuses"
                    ? "No records match your active search or filter criteria."
                    : "No insurance records registered in the backend database yet."}
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Policy Record</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th
                        className="py-3 px-4 cursor-pointer select-none hover:text-slate-800"
                        onClick={() => handleSort("policy_start_date")}
                      >
                        <div className="flex items-center gap-1">
                          <span>INSURANCE START DATE</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th
                        className="py-3 px-4 cursor-pointer select-none hover:text-slate-800"
                        onClick={() => handleSort("customer__name")}
                      >
                        <div className="flex items-center gap-1">
                          <span>CUSTOMER NAME</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th
                        className="py-3 px-4 cursor-pointer select-none hover:text-slate-800"
                        onClick={() => handleSort("customer__phone")}
                      >
                        <div className="flex items-center gap-1">
                          <span>PHONE</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="py-3 px-4">VEHICLE NUMBER</th>
                      <th
                        className="py-3 px-4 cursor-pointer select-none hover:text-slate-800"
                        onClick={() => handleSort("insurance_company__name")}
                      >
                        <div className="flex items-center gap-1">
                          <span>INSURANCE COMPANY</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th
                        className="py-3 px-4 cursor-pointer select-none hover:text-slate-800"
                        onClick={() => handleSort("total_premium")}
                      >
                        <div className="flex items-center gap-1">
                          <span>TOTAL</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th
                        className="py-3 px-4 cursor-pointer select-none hover:text-slate-800"
                        onClick={() => handleSort("policy_expiry_date")}
                      >
                        <div className="flex items-center gap-1">
                          <span>STATUS</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="py-3 px-4 text-center">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {records.map((record) => {
                      const totalPrem = Number(record.total_premium) || 0;

                      return (
                        <tr
                          key={record.id}
                          onClick={() => handleViewRecord(record)}
                          className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                        >
                          {/* Insurance Start Date */}
                          <td className="py-3.5 px-4 font-normal text-slate-600 whitespace-nowrap">
                            {formatDisplayDate(record.policy_start_date)}
                          </td>

                          {/* Customer Name */}
                          <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                            {record.customer?.name || "—"}
                          </td>

                          {/* Phone */}
                          <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap font-medium">
                            {record.customer?.phone || "—"}
                          </td>

                          {/* Vehicle Number (Pill badge) */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-block px-2.5 py-1 bg-slate-100 border border-slate-200/80 rounded-md font-mono text-[11px] font-semibold text-slate-800">
                              {record.vehicle?.vehicle_number || "—"}
                            </span>
                          </td>

                          {/* Insurance Company */}
                          <td className="py-3.5 px-4 text-slate-700 font-medium whitespace-nowrap">
                            {record.insurance_company?.name || "—"}
                          </td>

                          {/* Total Premium */}
                          <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                            {formatCurrency(totalPrem)}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {renderStatusBadge(record.status)}
                          </td>

                          {/* Actions: Edit, Trash, Add Payment */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              {/* Edit */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditModal(record);
                                }}
                                className="p-1 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                                title="Edit Record"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>

                              {/* Renew */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenRenewModal(record);
                                }}
                                className="p-1 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                                title="Renew Policy"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteRecord(record);
                                }}
                                className="p-1 text-red-400 hover:text-red-600 transition-colors cursor-pointer"
                                title="Delete Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>

                              {/* Add Payment Button or Paid badge */}
                              {(record.balance ?? 0) <= 0 ? (
                                <span
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-lg text-xs font-semibold select-none ml-1 cursor-default"
                                  title="Policy is fully paid (₹0 outstanding)"
                                >
                                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                                  Paid
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenPaymentModal(record);
                                  }}
                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer ml-1"
                                >
                                  Add Payment
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Footer: 100% Dynamic based on Backend Data */}
            <div className="px-5 py-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
              <p>
                {totalCount === 0 ? (
                  <span>Showing 0 of 0 records</span>
                ) : (
                  <span>
                    Showing{" "}
                    <span className="font-semibold text-slate-800">
                      {startRecord}-{endRecord}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-slate-800">
                      {totalCount.toLocaleString("en-IN")}
                    </span>{" "}
                    records
                  </span>
                )}
              </p>

              {totalPages > 0 && totalCount > 0 && (
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg font-medium cursor-pointer"
                  >
                    &lt; Previous
                  </button>

                  {paginationPages.map((pageItem, idx) => {
                    if (typeof pageItem === "number") {
                      const isActive = pageItem === currentPage;
                      return (
                        <button
                          key={`page-${pageItem}`}
                          type="button"
                          onClick={() => setCurrentPage(pageItem)}
                          className={`w-7 h-7 rounded-lg font-semibold flex items-center justify-center cursor-pointer transition-colors ${
                            isActive
                              ? "bg-blue-600 text-white shadow-xs"
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {pageItem}
                        </button>
                      );
                    }
                    return (
                      <span key={`dots-${idx}`} className="px-1 text-slate-400 select-none">
                        ...
                      </span>
                    );
                  })}

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg font-medium cursor-pointer"
                  >
                    Next &gt;
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function InsuranceRecordsPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout title="Insurance Records">
          <div className="py-24 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
            <p className="text-xs">Loading records...</p>
          </div>
        </DashboardLayout>
      }
    >
      <InsuranceRecordsContent />
    </Suspense>
  );
}

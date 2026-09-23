"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AlertCircle, IndianRupee } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  dashboardService,
  companyService,
  insuranceRecordService,
  paymentService,
  DashboardData,
  InsuranceCompany,
  InsuranceRecordItem,
  extractApiError,
} from "@/lib/api";
import { DashboardKpiCards } from "@/components/dashboard/dashboard-kpi-card";
import { BusinessSummaryChart } from "@/components/dashboard/business-summary-chart";
import { PaymentStatusChart } from "@/components/dashboard/payment-status-chart";
import { CompanyPremiumChart } from "@/components/dashboard/company-premium-chart";
import { ExpiringTodayTable } from "@/components/dashboard/expiring-today-table";
import { InsuranceRecordFormModal } from "@/components/insurance/insurance-record-form-modal";
import {
  DashboardDateFilter,
  DashboardDateRange,
  computeRangeForPreset,
} from "@/components/dashboard/dashboard-date-filter";
import { CollectPaymentModal } from "@/components/dashboard/collect-payment-modal";
import { RecordPaymentModal } from "@/components/insurance/record-payment-modal";
import { Toast, ToastType } from "@/components/ui/toast";

const initialDashboardData: DashboardData = {
  kpis: {
    today_entries: 0,
    today_premium: 0,
    today_received: 0,
    total_outstanding: 0,
    total_policies: 0,
    total_premium: 0,
    total_received: 0,
  },
  business_summary: [],
  payment_status_summary: {
    total_policies: 0,
    paid: { count: 0, amount: 0, percentage: 0 },
    partial: { count: 0, amount: 0, percentage: 0 },
    outstanding: { count: 0, amount: 0, percentage: 0 },
  },
  company_wise_summary: [],
  recent_records: [],
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(initialDashboardData);
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Global Date Filter State (Defaults to All Time)
  const [dateRange, setDateRange] = useState<DashboardDateRange>(() => ({
    preset: "all",
    ...computeRangeForPreset("all"),
  }));

  // Separate refresh trigger for Business Summary chart (independent of global date filter)
  const [chartRefreshTrigger, setChartRefreshTrigger] = useState(0);

  // Collect Payment & Record Payment States
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [recordForPayment, setRecordForPayment] = useState<InsuranceRecordItem | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Modal & Toast states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [toast, setToast] = useState<{
    open: boolean;
    title: string;
    message?: string;
    type: ToastType;
  } | null>(null);

  const loadData = useCallback(
    async (currentRange: DashboardDateRange = dateRange, isSilent = false) => {
      if (isSilent) {
        setRefreshing(true);
      }
      setError(null);

      try {
        const params: { start_date?: string; end_date?: string; filter?: string } = {};
        if (currentRange.preset === "all") {
          params.filter = "all";
        } else if (currentRange.startDate && currentRange.endDate) {
          params.start_date = currentRange.startDate;
          params.end_date = currentRange.endDate;
        }

        const [summaryRes, companiesRes] = await Promise.all([
          dashboardService.getSummary(params),
          companyService.getAll({ is_active: true }),
        ]);
        setData(summaryRes);
        setCompanies(companiesRes);
      } catch (err: unknown) {
        const { message } = extractApiError(err, "Failed to load dashboard data.");
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [dateRange]
  );

  useEffect(() => {
    let ignore = false;

    async function initialFetch() {
      try {
        const allPreset = computeRangeForPreset("all");
        const params: { start_date?: string; end_date?: string; filter?: string } = {
          filter: "all",
        };
        if (allPreset.startDate && allPreset.endDate) {
          params.start_date = allPreset.startDate;
          params.end_date = allPreset.endDate;
        }

        const [summaryRes, companiesRes] = await Promise.all([
          dashboardService.getSummary(params),
          companyService.getAll({ is_active: true }),
        ]);
        if (!ignore) {
          setData(summaryRes);
          setCompanies(companiesRes);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const { message } = extractApiError(err, "Failed to load dashboard data.");
          setError(message);
          setLoading(false);
        }
      }
    }

    initialFetch();

    return () => {
      ignore = true;
    };
  }, []);

  const handleDateRangeChange = (newRange: DashboardDateRange) => {
    setDateRange(newRange);
    setLoading(true);
    loadData(newRange, false);
  };

  const handleCreateRecord = async (formData: {
    policy_number: string;
    insurance_company_id: number;
    customer_id?: number;
    create_new_customer?: boolean;
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    customer_address?: string;
    vehicle_number: string;
    vehicle_type?: string;
    entry_date?: string;
    policy_start_date: string;
    policy_expiry_date: string;
    total_premium: number;
    remarks?: string;
  }) => {
    try {
      await insuranceRecordService.create(formData);
      setIsAddModalOpen(false);
      setToast({
        open: true,
        title: "Success",
        message: "Policy record created successfully!",
        type: "success",
      });
      // Refresh dashboard data with current date range
      await loadData(dateRange, true);
      setChartRefreshTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      const { message } = extractApiError(err, "Failed to create insurance record.");
      setToast({
        open: true,
        title: "Error",
        message,
        type: "error",
      });
      throw err;
    }
  };

  // Open RecordPaymentModal when user selects a vehicle record
  const handleSelectRecordForPayment = async (rec: InsuranceRecordItem) => {
    setIsCollectModalOpen(false);
    try {
      const fullRecord = await insuranceRecordService.getById(rec.id);
      setRecordForPayment(fullRecord);
    } catch {
      setRecordForPayment(rec);
    }
    setIsPaymentModalOpen(true);
  };

  // Save Payment callback
  const handleSavePayment = async (paymentData: {
    recordId: number;
    paymentType: "full" | "partial";
    amount: number;
    paymentMode: string;
    paymentDate: string;
    remark: string;
  }) => {
    try {
      await paymentService.create({
        recordId: paymentData.recordId,
        amount: paymentData.amount,
        payment_mode: paymentData.paymentMode,
        payment_date: paymentData.paymentDate,
        notes: paymentData.remark || "Payment collected via Dashboard",
      });

      setIsPaymentModalOpen(false);
      setRecordForPayment(null);

      setToast({
        open: true,
        title: "Payment Recorded",
        message: `Payment of ₹${paymentData.amount.toLocaleString(
          "en-IN"
        )} recorded successfully!`,
        type: "success",
      });

      // Reload dashboard metrics with current global date filter
      await loadData(dateRange, true);
      setChartRefreshTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      const { message } = extractApiError(err, "Failed to record payment.");
      setToast({
        open: true,
        title: "Payment Error",
        message,
        type: "error",
      });
      throw err;
    }
  };

  return (
    <DashboardLayout title="Dashboard">
      {/* Top Banner with Unified Global Filter and Collect Payment Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 sm:pb-5">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Overview
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time business performance and insurance metrics
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          {/* Unified Global Date Filter */}
          <div className="flex-1 sm:flex-initial min-w-0">
            <DashboardDateFilter
              value={dateRange}
              onChange={handleDateRangeChange}
              disabled={loading && !refreshing}
            />
          </div>

          {/* Collect Payment Button (Replaced Refresh button) */}
          <button
            type="button"
            onClick={() => setIsCollectModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer active:scale-95 shrink-0"
            title="Collect payment by vehicle number"
          >
            <IndianRupee className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="whitespace-nowrap">Collect Payment</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && !loading && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              loadData(dateRange);
            }}
            className="px-3 py-1 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Dashboard Layout */}
      <div className="space-y-5 sm:space-y-6">
        {/* Row 1: KPI Stat Cards */}
        <DashboardKpiCards
          kpis={data.kpis}
          loading={loading}
          filterLabel={dateRange.label}
        />

        {/* Row 2: Business Summary (7 cols) & Payment Status Summary (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
          <div className="lg:col-span-7">
            <BusinessSummaryChart
              data={data.business_summary}
              loading={loading && data.business_summary.length === 0}
              refreshTrigger={chartRefreshTrigger}
            />
          </div>

          <div className="lg:col-span-5">
            <PaymentStatusChart
              data={data.payment_status_summary}
              loading={loading}
            />
          </div>
        </div>

        {/* Row 3: Insurance Company Wise Premium Collection (Requested Graph) */}
        <CompanyPremiumChart
          data={data.company_wise_summary}
          loading={loading}
        />

        {/* Row 4: Expiring Today Records Table */}
        <ExpiringTodayTable
          records={data.expiring_today_records || data.recent_records || []}
          loading={loading}
        />
      </div>

      {/* Add New Record Modal */}
      {isAddModalOpen && (
        <InsuranceRecordFormModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          recordToEdit={null}
          companies={companies}
          onSave={handleCreateRecord}
        />
      )}

      {/* Collect Payment Vehicle Search Modal */}
      <CollectPaymentModal
        isOpen={isCollectModalOpen}
        onClose={() => setIsCollectModalOpen(false)}
        onSelectRecord={handleSelectRecordForPayment}
      />

      {/* Record Payment Dialog */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setRecordForPayment(null);
        }}
        record={recordForPayment}
        onSavePayment={handleSavePayment}
      />

      {/* Toast Notification */}
      {toast && (
        <Toast
          open={toast.open}
          title={toast.title}
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </DashboardLayout>
  );
}

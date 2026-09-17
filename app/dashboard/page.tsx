"use client";

import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  dashboardService,
  companyService,
  insuranceRecordService,
  DashboardData,
  InsuranceCompany,
  extractApiError,
} from "@/lib/api";
import { DashboardKpiCards } from "@/components/dashboard/dashboard-kpi-card";
import { BusinessSummaryChart } from "@/components/dashboard/business-summary-chart";
import { PaymentStatusChart } from "@/components/dashboard/payment-status-chart";
import { CompanyPremiumChart } from "@/components/dashboard/company-premium-chart";
import { RecentRecordsTable } from "@/components/dashboard/recent-records-table";
import { InsuranceRecordFormModal } from "@/components/insurance/insurance-record-form-modal";
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

  // Modal & Toast states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [toast, setToast] = useState<{
    open: boolean;
    title: string;
    message?: string;
    type: ToastType;
  } | null>(null);

  const loadData = useCallback(async (isSilent = false) => {
    if (isSilent) {
      setRefreshing(true);
    }
    setError(null);

    try {
      const [summaryRes, companiesRes] = await Promise.all([
        dashboardService.getSummary(),
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
  }, []);

  useEffect(() => {
    let ignore = false;

    async function initialFetch() {
      try {
        const [summaryRes, companiesRes] = await Promise.all([
          dashboardService.getSummary(),
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
      // Refresh dashboard data to update metrics & recent records
      await loadData(true);
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

  return (
    <DashboardLayout title="Dashboard">
      {/* Top Banner with Refresh Status */}
      <div className="flex items-center justify-between pb-4 sm:pb-5">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Overview
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time business performance and insurance metrics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer disabled:opacity-50"
            title="Refresh dashboard data"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-slate-500 ${
                refreshing ? "animate-spin text-blue-600" : ""
              }`}
            />
            <span className="hidden sm:inline">Refresh</span>
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
              loadData();
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
        <DashboardKpiCards kpis={data.kpis} loading={loading} />

        {/* Row 2: Business Summary (7 cols) & Payment Status Summary (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
          <div className="lg:col-span-7">
            <BusinessSummaryChart
              data={data.business_summary}
              loading={loading}
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

        {/* Row 4: Recent Insurance Records Table with + Add New Record */}
        <RecentRecordsTable
          records={data.recent_records}
          onAddNewRecord={() => setIsAddModalOpen(true)}
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

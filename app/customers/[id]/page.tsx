"use client";

import React, { useState, useEffect, useCallback, useMemo, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Mail,
  Car,
  FileText,
  Eye,
  Pencil,
  Edit2,
  Plus,
  ArrowUpDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  Trash2,
  ExternalLink,
  Shield,
  CreditCard,
  Building2,
  X,
  Upload,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Toast, ToastType } from "@/components/ui/toast";
import {
  customerService,
  insuranceRecordService,
  insuranceDocumentService,
  companyService,
  CustomerDetailResponse,
  InsuranceRecordItem,
  CustomerVehicleItem,
  CustomerDocumentItem,
  InsuranceCompany,
  extractApiError,
} from "@/lib/api";
import { formatDisplayDate } from "@/lib/date-utils";
import { ViewExistingRecordModal } from "@/components/insurance/view-existing-record-modal";
import { InsuranceRecordFormModal } from "@/components/insurance/insurance-record-form-modal";
import { RecordPaymentModal } from "@/components/insurance/record-payment-modal";

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

type TabType = "history" | "vehicles" | "documents";

export default function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const resolvedParams = use(params);
  const customerId = resolvedParams.id;
  const router = useRouter();

  // Primary Data State
  const [customer, setCustomer] = useState<CustomerDetailResponse | null>(null);
  const [records, setRecords] = useState<InsuranceRecordItem[]>([]);
  const [vehicles, setVehicles] = useState<CustomerVehicleItem[]>([]);
  const [documents, setDocuments] = useState<CustomerDocumentItem[]>([]);
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>("history");

  // Sorting for History Table
  const [sortField, setSortField] = useState<string>("entry_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Modals state
  const [viewRecord, setViewRecord] = useState<InsuranceRecordItem | null>(null);
  const [editRecord, setEditRecord] = useState<InsuranceRecordItem | null>(null);
  const [paymentRecord, setPaymentRecord] = useState<InsuranceRecordItem | null>(null);

  // Edit Customer Modal State
  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Upload Document Modal State
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);
  const [uploadRecordId, setUploadRecordId] = useState<number | string>("");
  const [uploadDocName, setUploadDocName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadSaving, setUploadSaving] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Toast State
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

  const showToast = useCallback((type: ToastType, title: string, message?: string) => {
    setToast({ open: true, type, title, message });
  }, []);

  // Fetch all customer details
  const fetchCustomerData = useCallback(async () => {
    try {
      setLoading(true);
      const [custData, recordsData, vehiclesData, docsData, companiesData] =
        await Promise.all([
          customerService.getById(customerId),
          customerService.getRecords(customerId).catch(() => []),
          customerService.getVehicles(customerId).catch(() => []),
          customerService.getDocuments(customerId).catch(() => []),
          companyService.getAll().catch(() => []),
        ]);

      setCustomer(custData);
      setRecords(recordsData);
      setVehicles(vehiclesData);
      setDocuments(docsData);
      setCompanies(companiesData);

      // Prepopulate edit modal state
      setEditName(custData.name || "");
      setEditPhone(custData.phone || "");
      setEditEmail(custData.email || "");
      setEditAddress(custData.address || "");
    } catch (err: unknown) {
      const errInfo = extractApiError(err, "Failed to load customer details.");
      showToast("error", "Error", errInfo.message);
    } finally {
      setLoading(false);
    }
  }, [customerId, showToast]);

  useEffect(() => {
    fetchCustomerData();
  }, [fetchCustomerData]);

  // Format initials
  const customerInitials = useMemo(() => {
    if (!customer || !customer.name) return "C";
    const parts = customer.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }, [customer]);

  // Format Currency (INR)
  const formatCurrency = (val?: number | string) => {
    if (val === undefined || val === null) return "₹0";
    const num = typeof val === "number" ? val : parseFloat(String(val)) || 0;
    return `₹${Math.round(num).toLocaleString("en-IN")}`;
  };

  // Sort Records for Insurance History Tab
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      if (sortField === "entry_date") {
        aVal = a.entry_date || a.created_at || "";
        bVal = b.entry_date || b.created_at || "";
      } else if (sortField === "company") {
        aVal = a.insurance_company?.name || "";
        bVal = b.insurance_company?.name || "";
      } else if (sortField === "vehicle") {
        aVal = a.vehicle?.vehicle_number || "";
        bVal = b.vehicle?.vehicle_number || "";
      } else if (sortField === "premium") {
        aVal = Number(a.total_premium) || 0;
        bVal = Number(b.total_premium) || 0;
      } else if (sortField === "paid") {
        aVal = Number(a.paid_amount ?? a.total_paid ?? 0);
        bVal = Number(b.paid_amount ?? b.total_paid ?? 0);
      } else if (sortField === "balance") {
        aVal = Number(a.balance ?? a.outstanding ?? 0);
        bVal = Number(b.balance ?? b.outstanding ?? 0);
      } else if (sortField === "status") {
        aVal = a.payment_status || a.status || "";
        bVal = b.payment_status || b.status || "";
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDirection === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [records, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Status Badge Helper
  const renderPaymentStatusBadge = (rec: InsuranceRecordItem) => {
    const total = Number(rec.total_premium) || 0;
    const paid = Number(rec.paid_amount ?? rec.total_paid ?? 0);
    const balance = rec.balance !== undefined ? Number(rec.balance) : Math.max(0, total - paid);

    if (paid >= total && total > 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
          Paid
        </span>
      );
    }
    if (paid > 0 && balance > 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
          Partial
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80">
        Unpaid
      </span>
    );
  };

  // Save Customer Profile Changes
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    if (!editPhone.trim()) {
      setEditError("Phone number is required.");
      return;
    }

    setEditSaving(true);
    setEditError("");
    try {
      const updated = await customerService.update(customer.id || customer.customer_id || customerId, {
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        address: editAddress.trim(),
      });
      setCustomer((prev) => (prev ? { ...prev, ...updated } : updated));
      setIsEditCustomerOpen(false);
      showToast("success", "Customer Updated", "Customer profile was successfully updated.");
    } catch (err: unknown) {
      const errInfo = extractApiError(err, "Failed to update customer.");
      setEditError(errInfo.message);
    } finally {
      setEditSaving(false);
    }
  };

  // Save Record Edits
  const handleSaveRecordEdit = async (formData: {
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
    if (!editRecord) return;
    try {
      await insuranceRecordService.update(editRecord.id, formData);
      setEditRecord(null);
      showToast("success", "Policy Updated", "Insurance record was successfully updated.");
      fetchCustomerData();
    } catch (err: unknown) {
      const errInfo = extractApiError(err, "Failed to update record.");
      showToast("error", "Error", errInfo.message);
    }
  };

  // Payment Saved Callback
  const handlePaymentSaved = () => {
    setIsUploadDocOpen(false);
    showToast("success", "Payment Recorded", "Payment transaction saved successfully.");
    fetchCustomerData();
  };

  // Handle Document Upload
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadRecordId) {
      setUploadError("Please select an insurance policy.");
      return;
    }
    if (!uploadFile) {
      setUploadError("Please select a file to upload.");
      return;
    }

    setUploadSaving(true);
    setUploadError("");
    try {
      await insuranceDocumentService.upload(
        Number(uploadRecordId),
        uploadFile,
        uploadDocName.trim() || uploadFile.name
      );
      setIsUploadDocOpen(false);
      setUploadFile(null);
      setUploadDocName("");
      setUploadRecordId("");
      showToast("success", "Document Uploaded", "Document attached successfully.");
      fetchCustomerData();
    } catch (err: unknown) {
      const errInfo = extractApiError(err, "Failed to upload document.");
      setUploadError(errInfo.message);
    } finally {
      setUploadSaving(false);
    }
  };

  // Handle Delete Document
  const handleDeleteDocument = async (doc: CustomerDocumentItem) => {
    if (!confirm(`Are you sure you want to delete "${doc.document_name || "this document"}"?`)) {
      return;
    }
    try {
      await insuranceDocumentService.delete(doc.record_id, doc.id);
      showToast("success", "Document Deleted", "Document removed successfully.");
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err: unknown) {
      const errInfo = extractApiError(err, "Failed to delete document.");
      showToast("error", "Error", errInfo.message);
    }
  };

  return (
    <DashboardLayout title="Customer Details">
      <div className="space-y-6 pb-12">
        {/* Top Back Navigation Link */}
        <div>
          <Link
            href="/customers"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors group cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Customers</span>
          </Link>
        </div>

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-sm font-medium">Loading customer profile &amp; policies...</p>
          </div>
        ) : !customer ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">Customer Not Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              The requested customer record does not exist or was removed.
            </p>
            <Link
              href="/customers"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors"
            >
              <span>Return to Customer Directory</span>
            </Link>
          </div>
        ) : (
          <>
            {/* FIGMA PROFILE HEADER CARD */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* Left Profile Section */}
                <div className="flex items-start sm:items-center gap-4">
                  {/* Avatar with Blue Initials */}
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-blue-200 bg-blue-50/70 text-blue-600 font-bold text-lg sm:text-xl flex items-center justify-center shrink-0 shadow-2xs">
                    {customerInitials}
                  </div>

                  {/* Customer Details */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                        {customer.name || "Unnamed Customer"}
                      </h1>
                      <button
                        type="button"
                        onClick={() => setIsEditCustomerOpen(true)}
                        className="p-1 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                        title="Edit Customer Profile"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs sm:text-sm text-slate-500">
                      {customer.phone && (
                        <div className="inline-flex items-center gap-1.5 font-mono">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{customer.phone}</span>
                        </div>
                      )}

                      {customer.address && (
                        <div className="inline-flex items-center gap-1.5 text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="line-clamp-1">{customer.address}</span>
                        </div>
                      )}

                      {customer.email && (
                        <div className="inline-flex items-center gap-1.5 text-slate-500">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{customer.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Stat Metric Boxes (Figma Pixel-Perfect) */}
                <div className="flex items-center gap-3 sm:gap-4 flex-wrap self-start lg:self-center">
                  {/* TOTAL RECORDS */}
                  <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 min-w-[110px] text-left shadow-2xs">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      TOTAL RECORDS
                    </p>
                    <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5">
                      {customer.total_records ?? records.length}
                    </p>
                  </div>

                  {/* TOTAL PREMIUM */}
                  <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 min-w-[130px] text-left shadow-2xs">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      TOTAL PREMIUM
                    </p>
                    <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5">
                      {formatCurrency(customer.total_premium)}
                    </p>
                  </div>

                  {/* OUTSTANDING */}
                  <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 min-w-[120px] text-left shadow-2xs">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      OUTSTANDING
                    </p>
                    <p className="text-lg sm:text-xl font-extrabold text-red-600 mt-0.5">
                      {formatCurrency(customer.total_outstanding)}
                    </p>
                  </div>

                  {/* + New Policy Button */}
                  <Link
                    href={`/insurance-records/new?phone=${encodeURIComponent(customer.phone)}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>New Policy</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* TAB BAR NAVIGATION */}
            <div className="border-b border-slate-200 flex items-center gap-6 sm:gap-8 text-xs sm:text-sm font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                  activeTab === "history"
                    ? "border-blue-600 text-blue-600 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Insurance History
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("vehicles")}
                className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                  activeTab === "vehicles"
                    ? "border-blue-600 text-blue-600 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Vehicles ({vehicles.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("documents")}
                className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                  activeTab === "documents"
                    ? "border-blue-600 text-blue-600 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Documents ({documents.length})
              </button>
            </div>

            {/* TAB 1: INSURANCE HISTORY */}
            {activeTab === "history" && (
              <div className="space-y-8 animate-in fade-in duration-150">
                {/* Policies Table Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  {records.length === 0 ? (
                    <div className="py-16 text-center space-y-2">
                      <Shield className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="text-sm font-semibold text-slate-700">No insurance records found</p>
                      <p className="text-xs text-slate-400">
                        This customer does not have any policies registered yet.
                      </p>
                      <Link
                        href={`/insurance-records/new?phone=${encodeURIComponent(customer.phone)}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline mt-2"
                      >
                        + Create first policy for this customer
                      </Link>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs sm:text-sm border-collapse">
                        <thead>
                          <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <th
                              className="py-3 px-4 cursor-pointer select-none hover:text-slate-700"
                              onClick={() => handleSort("entry_date")}
                            >
                              <div className="flex items-center gap-1">
                                <span>DATE</span>
                                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                              </div>
                            </th>
                            <th
                              className="py-3 px-4 cursor-pointer select-none hover:text-slate-700"
                              onClick={() => handleSort("company")}
                            >
                              <div className="flex items-center gap-1">
                                <span>INSURANCE COMPANY</span>
                                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                              </div>
                            </th>
                            <th
                              className="py-3 px-4 cursor-pointer select-none hover:text-slate-700"
                              onClick={() => handleSort("vehicle")}
                            >
                              <div className="flex items-center gap-1">
                                <span>VEHICLE NUMBER</span>
                                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                              </div>
                            </th>
                            <th
                              className="py-3 px-4 cursor-pointer select-none hover:text-slate-700"
                              onClick={() => handleSort("premium")}
                            >
                              <div className="flex items-center gap-1">
                                <span>TOTAL PREMIUM</span>
                                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                              </div>
                            </th>
                            <th
                              className="py-3 px-4 cursor-pointer select-none hover:text-slate-700"
                              onClick={() => handleSort("paid")}
                            >
                              <div className="flex items-center gap-1">
                                <span>PAID AMOUNT</span>
                                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                              </div>
                            </th>
                            <th
                              className="py-3 px-4 cursor-pointer select-none hover:text-slate-700"
                              onClick={() => handleSort("balance")}
                            >
                              <div className="flex items-center gap-1">
                                <span>BALANCE</span>
                                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                              </div>
                            </th>
                            <th
                              className="py-3 px-4 cursor-pointer select-none hover:text-slate-700"
                              onClick={() => handleSort("status")}
                            >
                              <div className="flex items-center gap-1">
                                <span>STATUS</span>
                                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                              </div>
                            </th>
                            <th className="py-3 px-4 text-center">ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sortedRecords.map((rec) => {
                            const total = Number(rec.total_premium) || 0;
                            const paid = Number(rec.paid_amount ?? rec.total_paid ?? 0);
                            const balance =
                              rec.balance !== undefined
                                ? Number(rec.balance)
                                : Math.max(0, total - paid);

                            return (
                              <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                                {/* Date */}
                                <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                                  {formatDisplayDate(rec.entry_date || rec.created_at)}
                                </td>

                                {/* Company */}
                                <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                                  {rec.insurance_company?.name || "—"}
                                </td>

                                {/* Vehicle Number (Figma Badge Style) */}
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <span className="inline-block px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 font-bold font-mono text-xs border border-slate-200">
                                    {rec.vehicle?.vehicle_number || "—"}
                                  </span>
                                </td>

                                {/* Total Premium */}
                                <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                                  {formatCurrency(total)}
                                </td>

                                {/* Paid Amount (Green text) */}
                                <td className="py-3.5 px-4 font-semibold text-emerald-600 whitespace-nowrap">
                                  {formatCurrency(paid)}
                                </td>

                                {/* Balance (Red if > 0, gray if 0) */}
                                <td
                                  className={`py-3.5 px-4 whitespace-nowrap ${
                                    balance > 0 ? "font-bold text-red-600" : "text-slate-500 font-medium"
                                  }`}
                                >
                                  {formatCurrency(balance)}
                                </td>

                                {/* Payment Status Badge */}
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  {renderPaymentStatusBadge(rec)}
                                </td>

                                {/* Action Icons (Eye, Edit, Payment) */}
                                <td className="py-3.5 px-4 whitespace-nowrap text-center">
                                  <div className="inline-flex items-center justify-center gap-2">
                                    {/* View Eye Icon */}
                                    <button
                                      type="button"
                                      onClick={() => setViewRecord(rec)}
                                      className="p-1 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                                      title="View Policy Details"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>

                                    {/* Edit Pencil Icon */}
                                    <button
                                      type="button"
                                      onClick={() => setEditRecord(rec)}
                                      className="p-1 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                                      title="Edit Policy"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>

                                    {/* Make Payment Button if balance > 0 */}
                                    {balance > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => setPaymentRecord(rec)}
                                        className="p-1 text-amber-500 hover:text-amber-700 transition-colors cursor-pointer"
                                        title="Record Payment"
                                      >
                                        <CreditCard className="w-4 h-4" />
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
                </div>

                {/* FIGMA LINKED VEHICLES SECTION */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    LINKED VEHICLES
                  </h3>

                  {vehicles.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-400 text-xs">
                      No vehicles linked to this customer yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {vehicles.map((veh) => (
                        <div
                          key={veh.id}
                          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center gap-3.5 hover:border-blue-300 transition-colors"
                        >
                          {/* Light Blue Vehicle Icon Container */}
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Car className="w-5 h-5" />
                          </div>

                          {/* Vehicle Details */}
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">
                              {veh.vehicle_type || "Vehicle"}
                            </p>
                            <p className="text-sm sm:text-base font-bold text-slate-900 font-mono tracking-tight truncate">
                              {veh.vehicle_number}
                            </p>
                            <p className="text-xs text-slate-400">
                              Linked records: {veh.records_count ?? 0}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: VEHICLES DIRECTORY */}
            {activeTab === "vehicles" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800">
                    Customer Vehicles ({vehicles.length})
                  </h3>
                  <Link
                    href={`/insurance-records/new?phone=${encodeURIComponent(customer.phone)}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Policy for Vehicle</span>
                  </Link>
                </div>

                {vehicles.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
                    No vehicles registered for this customer.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vehicles.map((veh) => (
                      <div
                        key={veh.id}
                        className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-md">
                              {veh.vehicle_type || "General"}
                            </span>
                            <span className="text-xs text-slate-400">
                              Added {formatDisplayDate(veh.created_at)}
                            </span>
                          </div>

                          <h4 className="text-lg font-bold text-slate-900 font-mono">
                            {veh.vehicle_number}
                          </h4>

                          <p className="text-xs text-slate-500 flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-blue-600" />
                            <span>
                              <strong>{veh.records_count ?? 0}</strong> active/past policy records
                            </span>
                          </p>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                          <Link
                            href={`/insurance-records/new?phone=${encodeURIComponent(
                              customer.phone
                            )}&vehicle=${encodeURIComponent(veh.vehicle_number)}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                          >
                            <span>+ Create Policy</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: DOCUMENTS REPOSITORY */}
            {activeTab === "documents" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Customer Documents ({documents.length})
                    </h3>
                    <p className="text-xs text-slate-400">
                      All policy documents, RC books, and certificates linked to this customer
                    </p>
                  </div>
                  {records.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setUploadRecordId(records[0]?.id || "");
                        setIsUploadDocOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Document</span>
                    </button>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  {documents.length === 0 ? (
                    <div className="py-16 text-center space-y-2">
                      <FileText className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="text-sm font-semibold text-slate-700">No documents found</p>
                      <p className="text-xs text-slate-400">
                        Upload policy PDFs or receipts to attach them to this customer&apos;s records.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs sm:text-sm border-collapse">
                        <thead>
                          <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <th className="py-3 px-4">DOCUMENT NAME</th>
                            <th className="py-3 px-4">POLICY NUMBER</th>
                            <th className="py-3 px-4">VEHICLE</th>
                            <th className="py-3 px-4">INSURANCE COMPANY</th>
                            <th className="py-3 px-4">UPLOADED DATE</th>
                            <th className="py-3 px-4 text-right">ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {documents.map((doc) => (
                            <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <span className="font-semibold text-slate-900 truncate max-w-xs">
                                    {doc.document_name || "Document"}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 font-mono font-semibold text-blue-600">
                                {doc.policy_number || "—"}
                              </td>
                              <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                                {doc.vehicle_number || "—"}
                              </td>
                              <td className="py-3.5 px-4 text-slate-600">
                                {doc.company_name || "—"}
                              </td>
                              <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                                {formatDisplayDate(doc.uploaded_at)}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <div className="inline-flex items-center gap-2">
                                  {doc.file_url && (
                                    <a
                                      href={doc.file_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50/80 hover:bg-blue-100 rounded-lg transition-colors"
                                      title="Download or View Document"
                                    >
                                      <Download className="w-3 h-3" />
                                      <span>View</span>
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDocument(doc)}
                                    className="p-1 text-red-400 hover:text-red-600 transition-colors cursor-pointer"
                                    title="Delete Document"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
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
            )}
          </>
        )}
      </div>

      {/* MODAL 1: EDIT CUSTOMER PROFILE */}
      {isEditCustomerOpen && customer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Edit Customer Profile</h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Customer ID: #{customer.customer_id || customer.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditCustomerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-5 space-y-4">
              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Full name"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+91 98765-43210"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Address
                </label>
                <textarea
                  rows={2}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Full street address..."
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditCustomerOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-2xs transition-colors cursor-pointer"
                >
                  {editSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: UPLOAD DOCUMENT */}
      {isUploadDocOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <Upload className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Upload Policy Document</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadDocOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadDocument} className="p-5 space-y-4">
              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  {uploadError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Policy Record
                </label>
                <select
                  required
                  value={uploadRecordId}
                  onChange={(e) => setUploadRecordId(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">-- Choose Policy --</option>
                  {records.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.policy_number} — {r.vehicle?.vehicle_number} ({r.insurance_company?.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document Label / Name (Optional)
                </label>
                <input
                  type="text"
                  value={uploadDocName}
                  onChange={(e) => setUploadDocName(e.target.value)}
                  placeholder="e.g. Policy Schedule, RC Book, Inspection Report"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Choose File (PDF, Image, Document)
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadDocOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-2xs transition-colors cursor-pointer"
                >
                  {uploadSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>Upload</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW RECORD MODAL */}
      <ViewExistingRecordModal
        isOpen={Boolean(viewRecord)}
        onClose={() => setViewRecord(null)}
        record={viewRecord}
      />

      {/* EDIT RECORD MODAL */}
      <InsuranceRecordFormModal
        isOpen={Boolean(editRecord)}
        onClose={() => setEditRecord(null)}
        recordToEdit={editRecord}
        companies={companies}
        onSave={handleSaveRecordEdit}
      />

      {/* RECORD PAYMENT MODAL */}
      <RecordPaymentModal
        isOpen={Boolean(paymentRecord)}
        onClose={() => setPaymentRecord(null)}
        record={paymentRecord}
        onSavePayment={handlePaymentSaved}
      />

      {/* TOAST NOTIFICATION */}
      <Toast
        open={toast.open}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </DashboardLayout>
  );
}

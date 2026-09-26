"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Pencil,
  Trash2,
  Loader2,
  Upload,
  Image as ImageIcon,
  ShieldCheck,
  KeyRound,
  AlertTriangle,
  X,
  RefreshCw,
  SlidersHorizontal,
  MessageSquare,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Toast, ToastType } from "@/components/ui/toast";
import {
  companyService,
  settingsService,
  authService,
  InsuranceCompany,
  BusinessSettings,
  UserProfile,
} from "@/lib/api";
import { ChangePasswordModal } from "@/components/modals/change-password-modal";
import { WhatsAppSettingsTab } from "@/components/settings/whatsapp-settings-tab";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"companies" | "business" | "account" | "whatsapp">("companies");

  // Insurance Companies state
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [companyToEdit, setCompanyToEdit] = useState<InsuranceCompany | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<InsuranceCompany | null>(null);

  // Form states for company
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyActive, setNewCompanyActive] = useState(true);
  const [editCompanyName, setEditCompanyName] = useState("");
  const [editCompanyActive, setEditCompanyActive] = useState(true);
  const [submittingCompany, setSubmittingCompany] = useState(false);

  // Business Settings state
  const [, setSettings] = useState<BusinessSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [removingLogo, setRemovingLogo] = useState(false);

  // Account state with lazy initialization
  const [currentUser] = useState<UserProfile | null>(() => {
    if (typeof window !== "undefined") {
      return authService.getCurrentUser();
    }
    return null;
  });

  // Toast state
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

  // Fetch companies
  const fetchCompanies = useCallback(async () => {
    try {
      setLoadingCompanies(true);
      const params: { search?: string; is_active?: string } = {};
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (statusFilter === "active") {
        params.is_active = "true";
      } else if (statusFilter === "inactive") {
        params.is_active = "false";
      }

      const data = await companyService.getAll(params);
      setCompanies(data);
    } catch {
      showToast("error", "Error loading companies", "Failed to fetch insurance companies.");
    } finally {
      setLoadingCompanies(false);
    }
  }, [searchQuery, statusFilter]);

  // Fetch business settings
  const fetchSettings = useCallback(async () => {
    try {
      setLoadingSettings(true);
      const data = await settingsService.get();
      setSettings(data);
      setBusinessName(data.business_name || "");
      setBusinessPhone(data.phone || "");
      setBusinessEmail(data.email || "");
      setBusinessAddress(data.address || "");
      setLogoPreview(data.logo_url || null);
    } catch {
      showToast("error", "Error loading settings", "Failed to load business settings.");
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const init = async () => {
      await fetchCompanies();
      if (active) {
        await fetchSettings();
      }
    };
    init();
    return () => {
      active = false;
    };
  }, [fetchCompanies, fetchSettings]);

  // Handle Add Company
  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCompanyName.trim();
    if (!name) {
      showToast("error", "Validation Error", "Company name is required.");
      return;
    }

    setSubmittingCompany(true);
    try {
      await companyService.create({
        name,
        is_active: newCompanyActive,
      });
      showToast("success", "Company Added", `"${name}" has been added successfully.`);
      setIsAddModalOpen(false);
      setNewCompanyName("");
      setNewCompanyActive(true);
      fetchCompanies();
    } catch (err: unknown) {
      let msg = "Failed to create insurance company.";
      if (typeof err === "object" && err !== null && "response" in err) {
        const responseData = (err as { response?: { data?: { name?: string[] } } }).response?.data;
        if (responseData?.name?.length) {
          msg = responseData.name[0];
        }
      }
      showToast("error", "Error", msg);
    } finally {
      setSubmittingCompany(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (company: InsuranceCompany) => {
    setCompanyToEdit(company);
    setEditCompanyName(company.name);
    setEditCompanyActive(company.is_active);
    setIsEditModalOpen(true);
  };

  // Handle Edit Company
  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyToEdit) return;

    const name = editCompanyName.trim();
    if (!name) {
      showToast("error", "Validation Error", "Company name is required.");
      return;
    }

    setSubmittingCompany(true);
    try {
      await companyService.update(companyToEdit.id, {
        name,
        is_active: editCompanyActive,
      });
      showToast("success", "Company Updated", `"${name}" has been updated.`);
      setIsEditModalOpen(false);
      setCompanyToEdit(null);
      fetchCompanies();
    } catch (err: unknown) {
      let msg = "Failed to update insurance company.";
      if (typeof err === "object" && err !== null && "response" in err) {
        const responseData = (err as { response?: { data?: { name?: string[] } } }).response?.data;
        if (responseData?.name?.length) {
          msg = responseData.name[0];
        }
      }
      showToast("error", "Error", msg);
    } finally {
      setSubmittingCompany(false);
    }
  };

  // Handle Quick Toggle Status
  const handleToggleStatus = async (company: InsuranceCompany) => {
    try {
      const res = await companyService.toggleStatus(company.id);
      showToast(
        "success",
        "Status Changed",
        res.message || `Status updated for ${company.name}`
      );
      setCompanies((prev) =>
        prev.map((c) => (c.id === company.id ? res.data : c))
      );
    } catch {
      showToast("error", "Error", "Failed to toggle status.");
    }
  };

  // Open Delete Modal
  const openDeleteModal = (company: InsuranceCompany) => {
    setCompanyToDelete(company);
    setIsDeleteModalOpen(true);
  };

  // Handle Delete Company
  const handleDeleteCompany = async () => {
    if (!companyToDelete) return;
    setSubmittingCompany(true);
    try {
      await companyService.delete(companyToDelete.id);
      showToast(
        "success",
        "Company Removed",
        `"${companyToDelete.name}" was successfully removed.`
      );
      setIsDeleteModalOpen(false);
      setCompanyToDelete(null);
      fetchCompanies();
    } catch {
      showToast("error", "Error", "Failed to delete company.");
    } finally {
      setSubmittingCompany(false);
    }
  };

  // Handle Logo File Selection
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        showToast("error", "File too large", "Logo file size must be less than 2MB.");
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  // Remove Logo
  const handleRemoveLogo = async () => {
    if (!confirm("Are you sure you want to remove the agency logo?")) return;
    setRemovingLogo(true);
    try {
      const res = await settingsService.removeLogo();
      setSettings(res.data);
      setLogoFile(null);
      setLogoPreview(null);
      showToast("success", "Logo Removed", "Agency logo has been removed.");
    } catch {
      showToast("error", "Error", "Failed to remove logo.");
    } finally {
      setRemovingLogo(false);
    }
  };

  // Save Business Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);

    try {
      const formData = new FormData();
      formData.append("business_name", businessName.trim());
      formData.append("phone", businessPhone.trim());
      formData.append("email", businessEmail.trim());
      formData.append("address", businessAddress.trim());

      if (logoFile) {
        formData.append("logo", logoFile);
      }

      const res = await settingsService.update(formData);
      setSettings(res.data);
      if (res.data.logo_url) {
        setLogoPreview(res.data.logo_url);
      }
      setLogoFile(null);
      showToast("success", "Settings Saved", "Agency settings updated successfully.");
    } catch {
      showToast("error", "Error", "Failed to update business settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  // Metrics counts
  const totalCompaniesCount = companies.length;
  const activeCompaniesCount = companies.filter((c) => c.is_active).length;
  const inactiveCompaniesCount = totalCompaniesCount - activeCompaniesCount;

  return (
    <DashboardLayout title="Settings">
      <Toast
        open={toast.open}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />

      <div className="space-y-5 sm:space-y-6">
        {/* Page Top Header */}
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Settings &amp; Preferences
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure partner insurance companies, business details, and agency information.
          </p>
        </div>

        {/* Tab Navigation Pill Bar (Scrollable on small screens) */}
        <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("companies")}
            className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "companies"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Insurance Companies</span>
            <span
              className={`ml-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${
                activeTab === "companies"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {totalCompaniesCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("business")}
            className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "business"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Agency Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("account")}
            className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "account"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Account &amp; Security</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("whatsapp")}
            className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "whatsapp"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>WhatsApp Meta API</span>
          </button>
        </div>


        {/* ==================== TAB 1: INSURANCE COMPANIES ==================== */}
        {activeTab === "companies" && (
          <div className="space-y-5 sm:space-y-6">
            {/* Stats Summary Cards (Mobile: 2-col, Desktop: 3-col) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Total Companies
                  </p>
                  <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                    {totalCompaniesCount}
                  </p>
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>

              <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-bold text-emerald-600 uppercase tracking-wider">
                    Active Providers
                  </p>
                  <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                    {activeCompaniesCount}
                  </p>
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>

              <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between col-span-2 sm:col-span-1">
                <div>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Inactive Providers
                  </p>
                  <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                    {inactiveCompaniesCount}
                  </p>
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                  <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
            </div>

            {/* Toolbar & Action Bar */}
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search & Filter */}
              <div className="flex flex-1 items-center gap-2 sm:gap-3">
                <div className="relative flex-1 min-w-[160px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search companies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter companies by status"
                  className="px-2.5 sm:px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer shrink-0"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>

                <button
                  type="button"
                  onClick={fetchCompanies}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
                  title="Refresh list"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loadingCompanies ? "animate-spin" : ""}`}
                  />
                </button>
              </div>

              {/* Add Company Button */}
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer shrink-0 min-h-[42px]"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Add Insurance Company</span>
              </button>
            </div>

            {/* Companies Listing */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              {loadingCompanies ? (
                <div className="py-16 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                  <p className="text-sm">Loading insurance companies...</p>
                </div>
              ) : companies.length === 0 ? (
                <div className="py-16 text-center px-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-800">
                    No insurance companies found
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                    {searchQuery
                      ? "No companies match your search criteria. Try a different query."
                      : "Start by registering your first insurance provider company."}
                  </p>
                  {!searchQuery && (
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(true)}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add First Company</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* ================= MOBILE: RECORD CARDS (< md) ================= */}
                  <div className="md:hidden p-3.5 space-y-3">
                    {companies.map((company) => (
                      <div
                        key={company.id}
                        className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5 space-y-3"
                      >
                        {/* Company Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900 truncate">
                                {company.name}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                Added:{" "}
                                {new Date(company.created_at).toLocaleDateString("en-US", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                          </div>

                          {/* Quick Toggle Status */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(company)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer shrink-0 ${
                              company.is_active
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                company.is_active ? "bg-emerald-500" : "bg-slate-400"
                              }`}
                            />
                            <span>{company.is_active ? "Active" : "Inactive"}</span>
                          </button>
                        </div>

                        {/* Card Actions */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                          <button
                            type="button"
                            onClick={() => openEditModal(company)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5 text-blue-600" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openDeleteModal(company)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 border border-red-100 text-red-600 hover:bg-red-100/80 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ================= DESKTOP: DATA TABLE (>= md) ================= */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          <th className="py-3.5 px-6">Company Name</th>
                          <th className="py-3.5 px-6">Status</th>
                          <th className="py-3.5 px-6">Created Date</th>
                          <th className="py-3.5 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {companies.map((company) => (
                          <tr
                            key={company.id}
                            className="hover:bg-slate-50/60 transition-colors group"
                          >
                            {/* Company Name */}
                            <td className="py-3.5 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                  <Building2 className="w-4 h-4" />
                                </div>
                                <span className="font-semibold text-slate-900">
                                  {company.name}
                                </span>
                              </div>
                            </td>

                            {/* Status Badge */}
                            <td className="py-3.5 px-6">
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(company)}
                                title="Click to toggle status"
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                                  company.is_active
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100/70"
                                    : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200/70"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    company.is_active
                                      ? "bg-emerald-500"
                                      : "bg-slate-400"
                                  }`}
                                />
                                <span>
                                  {company.is_active ? "Active" : "Inactive"}
                                </span>
                              </button>
                            </td>

                            {/* Date Added */}
                            <td className="py-3.5 px-6 text-slate-500 text-xs">
                              {new Date(company.created_at).toLocaleDateString(
                                "en-US",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                }
                              )}
                            </td>

                            {/* Action Buttons */}
                            <td className="py-3.5 px-6 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditModal(company)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Company"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openDeleteModal(company)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Company"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB 2: AGENCY SETTINGS ==================== */}
        {activeTab === "business" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-6 max-w-3xl">
            {loadingSettings ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                <p className="text-sm">Loading agency settings...</p>
              </div>
            ) : (
              <form onSubmit={handleSaveSettings} className="space-y-5 sm:space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Agency Information
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    This information is printed on insurance proposals, receipts, and client invoices.
                  </p>
                </div>

                {/* Agency Logo Uploader */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                  <div className="relative w-20 h-20 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center overflow-hidden shrink-0">
                    {logoPreview ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={logoPreview}
                        alt="Agency Logo"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-300" />
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <p className="text-sm font-semibold text-slate-800">
                      Agency Logo
                    </p>
                    <p className="text-xs text-slate-500">
                      Upload a square or horizontal logo. PNG, JPG, WEBP up to 2MB.
                    </p>

                    <div className="flex items-center gap-3 pt-1">
                      <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs cursor-pointer transition-colors min-h-[36px]">
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>Choose File</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="hidden"
                        />
                      </label>

                      {logoPreview && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          disabled={removingLogo}
                          className="text-xs text-red-600 hover:text-red-700 font-medium cursor-pointer"
                        >
                          {removingLogo ? "Removing..." : "Remove Logo"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Text Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Business / Agency Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. InsureLedger Agency"
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={businessPhone}
                      onChange={(e) => setBusinessPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={businessEmail}
                      onChange={(e) => setBusinessEmail(e.target.value)}
                      placeholder="e.g. info@agency.com"
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Office Address
                    </label>
                    <textarea
                      rows={3}
                      value={businessAddress}
                      onChange={(e) => setBusinessAddress(e.target.value)}
                      placeholder="e.g. Shop #4, City Commercial Complex, MG Road, Pune - 411001"
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                    />
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50 min-h-[44px]"
                  >
                    {savingSettings ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Business Settings</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ==================== TAB 3: ACCOUNT & SECURITY ==================== */}
        {activeTab === "account" && (
          <div className="space-y-4 sm:space-y-6 max-w-3xl">
            {/* Account Info */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-6">
              <h3 className="text-base font-bold text-slate-900">
                Administrator Account
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 mb-4">
                Current active session details.
              </p>

              <div className="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm sm:text-base shrink-0">
                  {currentUser?.first_name
                    ? currentUser.first_name.charAt(0).toUpperCase()
                    : currentUser?.username
                    ? currentUser.username.charAt(0).toUpperCase()
                    : "A"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {currentUser?.first_name || currentUser?.last_name
                      ? `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim()
                      : currentUser?.username || "Admin User"}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {currentUser?.email || "No email set"} &bull; User:{" "}
                    <span className="font-mono text-slate-700">
                      {currentUser?.username || "admin"}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Password Security */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-blue-600" />
                  <span>Account Password</span>
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Change your login password to maintain high account security.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsChangePasswordModalOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer shrink-0 min-h-[40px]"
              >
                <span>Change Password</span>
              </button>
            </div>
          </div>
        )}

        {/* ==================== TAB 4: WHATSAPP META API ==================== */}
        {activeTab === "whatsapp" && (
          <WhatsAppSettingsTab showToast={showToast} />
        )}
      </div>


      {/* ==================== ADD COMPANY MODAL ==================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 sm:p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>Add Insurance Company</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCompany} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. HDFC ERGO General Insurance"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="newActiveCheck"
                  checked={newCompanyActive}
                  onChange={(e) => setNewCompanyActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label
                  htmlFor="newActiveCheck"
                  className="text-xs font-medium text-slate-700 cursor-pointer select-none"
                >
                  Set as Active (Available for policies)
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submittingCompany}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submittingCompany && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Add Company</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== EDIT COMPANY MODAL ==================== */}
      {isEditModalOpen && companyToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 sm:p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-600" />
                <span>Edit Insurance Company</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateCompany} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={editCompanyName}
                  onChange={(e) => setEditCompanyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="editActiveCheck"
                  checked={editCompanyActive}
                  onChange={(e) => setEditCompanyActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label
                  htmlFor="editActiveCheck"
                  className="text-xs font-medium text-slate-700 cursor-pointer select-none"
                >
                  Active Status
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submittingCompany}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submittingCompany && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Update Company</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== DELETE COMPANY MODAL ==================== */}
      {isDeleteModalOpen && companyToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 sm:p-6 animate-in zoom-in-95 duration-200">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <h3 className="text-base font-bold text-slate-900">
              Delete Company?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-800">
                &ldquo;{companyToDelete.name}&rdquo;
              </span>
              ? This action cannot be reversed.
            </p>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteCompany}
                disabled={submittingCompany}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {submittingCompany && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Company</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== CHANGE PASSWORD MODAL ==================== */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
      />
    </DashboardLayout>
  );
}

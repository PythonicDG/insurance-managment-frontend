"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  SlidersHorizontal,
  Building2,
  Activity,
  Calendar,
  ArrowUpDown,
  Search,
  Check,
  RotateCcw,
} from "lucide-react";
import { InsuranceCompany } from "@/lib/api";
import { formatLocalDateISO } from "@/lib/date-utils";

export type FilterCategory = "company" | "status" | "date" | "sort" | "search";

export interface MobileFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: InsuranceCompany[];
  fromDate: string;
  toDate: string;
  selectedCompany: string;
  selectedStatus: string;
  searchQuery: string;
  sortField: string;
  sortDirection: "asc" | "desc";
  initialCategory?: FilterCategory;
  onApplyFilters: (filters: {
    fromDate: string;
    toDate: string;
    selectedCompany: string;
    selectedStatus: string;
    searchQuery: string;
    sortField: string;
    sortDirection: "asc" | "desc";
  }) => void;
  onResetFilters: () => void;
  totalRecordsCount?: number;
}

export function MobileFiltersModal(props: MobileFiltersModalProps) {
  if (!props.isOpen) return null;
  return <MobileFiltersDialog {...props} />;
}

function MobileFiltersDialog({
  onClose,
  companies,
  fromDate,
  toDate,
  selectedCompany,
  selectedStatus,
  searchQuery,
  sortField,
  sortDirection,
  initialCategory = "company",
  onApplyFilters,
  onResetFilters,
  totalRecordsCount,
}: Omit<MobileFiltersModalProps, "isOpen">) {
  const [activeCategory, setActiveCategory] = useState<FilterCategory>(initialCategory);

  // Local draft states inside the popup modal initialized from props on mount
  const [draftFromDate, setDraftFromDate] = useState(fromDate);
  const [draftToDate, setDraftToDate] = useState(toDate);
  const [draftCompany, setDraftCompany] = useState(selectedCompany);
  const [draftStatus, setDraftStatus] = useState(selectedStatus);
  const [draftSearch, setDraftSearch] = useState(searchQuery);
  const [draftSortField, setDraftSortField] = useState(sortField);
  const [draftSortDirection, setDraftSortDirection] = useState<"asc" | "desc">(sortDirection);

  // Search input within the company list tab
  const [companyFilterQuery, setCompanyFilterQuery] = useState("");

  // Lock body scroll while dialog is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Calculate active filter count for the draft
  const activeCount = useMemo(() => {
    let count = 0;
    if (draftCompany && draftCompany !== "All Companies") count++;
    if (draftStatus && draftStatus !== "All Statuses") count++;
    if (draftFromDate) count++;
    if (draftToDate) count++;
    if (draftSearch.trim()) count++;
    return count;
  }, [draftCompany, draftStatus, draftFromDate, draftToDate, draftSearch]);

  // Filtered companies based on search inside tab
  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(companyFilterQuery.toLowerCase().trim())
  );

  // Handlers for quick date presets
  const handleDatePreset = (type: "all" | "today" | "this_month" | "last_30_days" | "this_year") => {
    const today = new Date();
    const formatYMD = (d: Date) => formatLocalDateISO(d);

    if (type === "all") {
      setDraftFromDate("");
      setDraftToDate("");
    } else if (type === "today") {
      const nowStr = formatYMD(today);
      setDraftFromDate(nowStr);
      setDraftToDate(nowStr);
    } else if (type === "this_month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setDraftFromDate(formatYMD(firstDay));
      setDraftToDate(formatYMD(today));
    } else if (type === "last_30_days") {
      const past30 = new Date(today);
      past30.setDate(today.getDate() - 30);
      setDraftFromDate(formatYMD(past30));
      setDraftToDate(formatYMD(today));
    } else if (type === "this_year") {
      const firstDayYear = new Date(today.getFullYear(), 0, 1);
      setDraftFromDate(formatYMD(firstDayYear));
      setDraftToDate(formatYMD(today));
    }
  };

  // Sort options list
  const sortOptions = [
    { label: "Start Date: Newest First", field: "policy_start_date", dir: "desc" as const },
    { label: "Start Date: Oldest First", field: "policy_start_date", dir: "asc" as const },
    { label: "Date: Newest First", field: "entry_date", dir: "desc" as const },
    { label: "Date: Oldest First", field: "entry_date", dir: "asc" as const },
    { label: "Customer Name: A to Z", field: "customer__name", dir: "asc" as const },
    { label: "Customer Name: Z to A", field: "customer__name", dir: "desc" as const },
    { label: "Total Premium: High to Low", field: "total_premium", dir: "desc" as const },
    { label: "Total Premium: Low to High", field: "total_premium", dir: "asc" as const },
    { label: "Policy Expiry: Soonest First", field: "policy_expiry_date", dir: "asc" as const },
  ];

  // Reset all draft filters
  const handleClearAll = () => {
    setDraftFromDate("");
    setDraftToDate("");
    setDraftCompany("All Companies");
    setDraftStatus("All Statuses");
    setDraftSearch("");
    setDraftSortField("entry_date");
    setDraftSortDirection("desc");
    if (onResetFilters) {
      onResetFilters();
    }
  };

  // Apply filters
  const handleApply = () => {
    onApplyFilters({
      fromDate: draftFromDate,
      toDate: draftToDate,
      selectedCompany: draftCompany,
      selectedStatus: draftStatus,
      searchQuery: draftSearch,
      sortField: draftSortField,
      sortDirection: draftSortDirection,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white w-full sm:max-w-lg h-[88vh] sm:h-[620px] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/80 animate-in slide-in-from-bottom duration-250"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-filters-title"
      >
        {/* Top Header - Flipkart Style */}
        <div className="px-4 py-3.5 border-b border-slate-200/80 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="mobile-filters-title" className="text-sm font-bold text-slate-900">
                  Filters & Sort
                </h2>
                {activeCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                    {activeCount}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {totalRecordsCount !== undefined ? `${totalRecordsCount} records found` : "Customize your view"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close filters"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2-Pane Flipkart Layout: Left category list, Right options list */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left Category Rail */}
          <div className="w-[125px] sm:w-[150px] bg-slate-50/90 border-r border-slate-200/80 flex flex-col py-1.5 overflow-y-auto scrollbar-none shrink-0">
            {/* Category: Company */}
            <button
              type="button"
              onClick={() => setActiveCategory("company")}
              className={`relative text-left px-3 py-3 transition-colors flex items-center justify-between cursor-pointer ${
                activeCategory === "company"
                  ? "bg-white text-blue-600 font-bold border-l-3 border-blue-600 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-100/60"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Building2
                  className={`w-4 h-4 shrink-0 ${
                    activeCategory === "company" ? "text-blue-600" : "text-slate-400"
                  }`}
                />
                <span className="text-xs truncate">Company</span>
              </div>
              {draftCompany && draftCompany !== "All Companies" && (
                <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
              )}
            </button>

            {/* Category: Status */}
            <button
              type="button"
              onClick={() => setActiveCategory("status")}
              className={`relative text-left px-3 py-3 transition-colors flex items-center justify-between cursor-pointer ${
                activeCategory === "status"
                  ? "bg-white text-blue-600 font-bold border-l-3 border-blue-600 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-100/60"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Activity
                  className={`w-4 h-4 shrink-0 ${
                    activeCategory === "status" ? "text-blue-600" : "text-slate-400"
                  }`}
                />
                <span className="text-xs truncate">Status</span>
              </div>
              {draftStatus && draftStatus !== "All Statuses" && (
                <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
              )}
            </button>

            {/* Category: Date Range */}
            <button
              type="button"
              onClick={() => setActiveCategory("date")}
              className={`relative text-left px-3 py-3 transition-colors flex items-center justify-between cursor-pointer ${
                activeCategory === "date"
                  ? "bg-white text-blue-600 font-bold border-l-3 border-blue-600 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-100/60"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Calendar
                  className={`w-4 h-4 shrink-0 ${
                    activeCategory === "date" ? "text-blue-600" : "text-slate-400"
                  }`}
                />
                <span className="text-xs truncate">Date</span>
              </div>
              {(draftFromDate || draftToDate) && (
                <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
              )}
            </button>

            {/* Category: Sort By */}
            <button
              type="button"
              onClick={() => setActiveCategory("sort")}
              className={`relative text-left px-3 py-3 transition-colors flex items-center justify-between cursor-pointer ${
                activeCategory === "sort"
                  ? "bg-white text-blue-600 font-bold border-l-3 border-blue-600 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-100/60"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <ArrowUpDown
                  className={`w-4 h-4 shrink-0 ${
                    activeCategory === "sort" ? "text-blue-600" : "text-slate-400"
                  }`}
                />
                <span className="text-xs truncate">Sort By</span>
              </div>
              {(draftSortField !== "entry_date" || draftSortDirection !== "desc") && (
                <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
              )}
            </button>

            {/* Category: Search */}
            <button
              type="button"
              onClick={() => setActiveCategory("search")}
              className={`relative text-left px-3 py-3 transition-colors flex items-center justify-between cursor-pointer ${
                activeCategory === "search"
                  ? "bg-white text-blue-600 font-bold border-l-3 border-blue-600 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-100/60"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Search
                  className={`w-4 h-4 shrink-0 ${
                    activeCategory === "search" ? "text-blue-600" : "text-slate-400"
                  }`}
                />
                <span className="text-xs truncate">Search</span>
              </div>
              {draftSearch.trim() && (
                <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
              )}
            </button>
          </div>

          {/* Right Options Pane */}
          <div className="flex-1 bg-white p-3.5 sm:p-5 overflow-y-auto min-h-0">
            {/* PANE: COMPANY */}
            {activeCategory === "company" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Select Insurance Company
                  </h3>
                  {draftCompany !== "All Companies" && (
                    <button
                      type="button"
                      onClick={() => setDraftCompany("All Companies")}
                      className="text-[11px] font-medium text-blue-600 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Company Search Input */}
                {companies.length > 5 && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={companyFilterQuery}
                      onChange={(e) => setCompanyFilterQuery(e.target.value)}
                      placeholder="Find company..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div className="space-y-1.5 pt-1">
                  {/* All Companies Option */}
                  <label
                    onClick={() => setDraftCompany("All Companies")}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                      draftCompany === "All Companies"
                        ? "border-blue-500 bg-blue-50/50 text-blue-700 font-semibold"
                        : "border-slate-200/80 hover:bg-slate-50 text-slate-700 font-medium"
                    }`}
                  >
                    <span className="text-xs">All Companies</span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        draftCompany === "All Companies"
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {draftCompany === "All Companies" && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </label>

                  {/* Filtered Company Options */}
                  {filteredCompanies.map((comp) => {
                    const isSelected = draftCompany === comp.name;
                    return (
                      <label
                        key={comp.id}
                        onClick={() => setDraftCompany(comp.name)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "border-blue-500 bg-blue-50/50 text-blue-700 font-semibold"
                            : "border-slate-200/80 hover:bg-slate-50 text-slate-700 font-medium"
                        }`}
                      >
                        <span className="text-xs truncate pr-2">{comp.name}</span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </label>
                    );
                  })}

                  {filteredCompanies.length === 0 && (
                    <p className="text-xs text-slate-400 py-4 text-center">
                      No companies match &quot;{companyFilterQuery}&quot;
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* PANE: STATUS */}
            {activeCategory === "status" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Select Policy Status
                  </h3>
                  {draftStatus !== "All Statuses" && (
                    <button
                      type="button"
                      onClick={() => setDraftStatus("All Statuses")}
                      className="text-[11px] font-medium text-blue-600 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="space-y-2 pt-1">
                  {[
                    { label: "All Statuses", value: "All Statuses", badge: null },
                    {
                      label: "Active",
                      value: "Active",
                      badge: (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200/60">
                          Active
                        </span>
                      ),
                    },
                    {
                      label: "Expiring Soon (10 Days)",
                      value: "Expiring Soon",
                      badge: (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-200/60">
                          Next 10 Days
                        </span>
                      ),
                    },
                    {
                      label: "Expired",
                      value: "Expired",
                      badge: (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-600 border border-rose-200/60">
                          Expired
                        </span>
                      ),
                    },
                  ].map((item) => {
                    const isSelected = draftStatus === item.value;
                    return (
                      <label
                        key={item.value}
                        onClick={() => setDraftStatus(item.value)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "border-blue-500 bg-blue-50/50 text-blue-700 font-semibold"
                            : "border-slate-200/80 hover:bg-slate-50 text-slate-700 font-medium"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs">{item.label}</span>
                          {item.badge}
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PANE: DATE RANGE */}
            {activeCategory === "date" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Date Range Filter
                  </h3>
                  {(draftFromDate || draftToDate) && (
                    <button
                      type="button"
                      onClick={() => {
                        setDraftFromDate("");
                        setDraftToDate("");
                      }}
                      className="text-[11px] font-medium text-blue-600 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Quick Presets */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-2">
                    Quick Presets
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleDatePreset("all")}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer text-left ${
                        !draftFromDate && !draftToDate
                          ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      All Time
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDatePreset("today")}
                      className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDatePreset("this_month")}
                      className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                    >
                      This Month
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDatePreset("last_30_days")}
                      className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                    >
                      Last 30 Days
                    </button>
                  </div>
                </div>

                {/* Custom Pickers */}
                <div className="space-y-3 pt-1 border-t border-slate-100">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      From Date
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={draftFromDate}
                        onChange={(e) => setDraftFromDate(e.target.value)}
                        className="w-full pl-3 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      To Date
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={draftToDate}
                        onChange={(e) => setDraftToDate(e.target.value)}
                        className="w-full pl-3 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PANE: SORT BY */}
            {activeCategory === "sort" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Sort Records
                  </h3>
                  {(draftSortField !== "entry_date" || draftSortDirection !== "desc") && (
                    <button
                      type="button"
                      onClick={() => {
                        setDraftSortField("entry_date");
                        setDraftSortDirection("desc");
                      }}
                      className="text-[11px] font-medium text-blue-600 hover:underline"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 pt-1">
                  {sortOptions.map((opt, i) => {
                    const isSelected =
                      draftSortField === opt.field && draftSortDirection === opt.dir;
                    return (
                      <label
                        key={i}
                        onClick={() => {
                          setDraftSortField(opt.field);
                          setDraftSortDirection(opt.dir);
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "border-blue-500 bg-blue-50/50 text-blue-700 font-semibold"
                            : "border-slate-200/80 hover:bg-slate-50 text-slate-700 font-medium"
                        }`}
                      >
                        <span className="text-xs">{opt.label}</span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PANE: SEARCH */}
            {activeCategory === "search" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Search Records
                  </h3>
                  {draftSearch.trim() && (
                    <button
                      type="button"
                      onClick={() => setDraftSearch("")}
                      className="text-[11px] font-medium text-blue-600 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="pt-1">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                    Query customer, vehicle or phone
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={draftSearch}
                      onChange={(e) => setDraftSearch(e.target.value)}
                      placeholder="e.g. Rahul, MH-12, 9876..."
                      className="w-full pl-9 pr-8 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    {draftSearch && (
                      <button
                        type="button"
                        onClick={() => setDraftSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Enter customer full/partial name, vehicle number, or contact phone.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Bottom Action Buttons - Flipkart Style */}
        <div className="p-3 sm:p-4 border-t border-slate-200/80 bg-white flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleClearAll}
            className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-center"
          >
            Clear All
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-[1.5] py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Apply Filters</span>
            {activeCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
                {activeCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

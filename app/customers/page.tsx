"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Users,
  UserPlus,
  Search,
  Car,
  Edit2,
  Check,
  X,
  Loader2,
  Info,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Eye,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Toast, ToastType } from "@/components/ui/toast";
import { customerService, CustomerSummary, extractApiError } from "@/lib/api";

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [actionMenu, setActionMenu] = useState<{
    customer: CustomerSummary;
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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Edit Customer Modal State
  const [editingCustomer, setEditingCustomer] = useState<CustomerSummary | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAltPhone, setEditAltPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Create Customer Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createAltPhone, setCreateAltPhone] = useState("");
  const [createAddress, setCreateAddress] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState("");

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

  useEffect(() => {
    let active = true;
    const fetchCustomers = async () => {
      try {
        const data = await customerService.getAll();
        if (active) setCustomers(data);
      } catch {
        if (active) showToast("error", "Error", "Failed to load customers.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    fetchCustomers();
    return () => {
      active = false;
    };
  }, [showToast]);

  // Open Edit Modal
  const openEditModal = (cust: CustomerSummary) => {
    setEditingCustomer(cust);
    setEditName(cust.name || "");
    setEditPhone(cust.phone || "");
    setEditAltPhone(cust.alternative_mobile_number || "");
    setEditAddress(cust.address || "");
    setEditEmail(cust.email || "");
    setEditError("");
  };

  const handleToggleActionMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
    customer: CustomerSummary
  ) => {
    event.stopPropagation();

    const customerId = customer.id || customer.customer_id;
    const openCustomerId =
      actionMenu?.customer.id || actionMenu?.customer.customer_id;
    if (openCustomerId === customerId) {
      setActionMenu(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 192;
    const menuHeight = 94;
    const spaceBelow = window.innerHeight - rect.bottom;

    setActionMenu({
      customer,
      top:
        spaceBelow >= menuHeight + 8
          ? rect.bottom + 6
          : Math.max(8, rect.top - menuHeight - 6),
      left: Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8)),
    });
  };

  // Save Customer Edits (in-place update)
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !editingCustomer.id) return;

    if (!editPhone.trim()) {
      setEditError("Phone number is required.");
      return;
    }

    setEditSaving(true);
    setEditError("");
    try {
      const updated = await customerService.update(editingCustomer.id, {
        name: editName.trim(),
        phone: editPhone.trim(),
        alternative_mobile_number: editAltPhone.trim(),
        address: editAddress.trim(),
        email: editEmail.trim(),
      });

      setCustomers((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
      );

      showToast("success", "Customer Updated", `Profile for ${updated.name || "Customer"} updated without duplicate.`);
      setEditingCustomer(null);
    } catch (err: unknown) {
      const errorInfo = extractApiError(err, "Failed to update customer.");
      setEditError(errorInfo.message);
    } finally {
      setEditSaving(false);
    }
  };

  // Save New Customer
  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createPhone.trim()) {
      setCreateError("Phone number is required.");
      return;
    }

    setCreateSaving(true);
    setCreateError("");
    try {
      const newCust = await customerService.create({
        name: createName.trim(),
        phone: createPhone.trim(),
        alternative_mobile_number: createAltPhone.trim(),
        address: createAddress.trim(),
        email: createEmail.trim(),
      });

      setCustomers((prev) => [newCust, ...prev]);
      setCurrentPage(1);
      showToast(
        "success",
        "Customer Created",
        `Created ${newCust.name || "Customer"} with unique ID #${newCust.customer_id || newCust.id}.`
      );
      setIsCreateModalOpen(false);
      setCreateName("");
      setCreatePhone("");
      setCreateAltPhone("");
      setCreateAddress("");
      setCreateEmail("");
    } catch (err: unknown) {
      const errorInfo = extractApiError(err, "Failed to create customer.");
      setCreateError(errorInfo.message);
    } finally {
      setCreateSaving(false);
    }
  };

  // Count occurrences of phone numbers to detect shared phone numbers
  const phoneCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of customers) {
      if (c.phone) {
        const norm = c.phone.replace(/[\s\-\(\)\.]/g, "");
        counts[norm] = (counts[norm] || 0) + 1;
      }
    }
    return counts;
  }, [customers]);

  // Filtered customers by search term
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    const term = searchTerm.toLowerCase().trim();
    return customers.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(term)) ||
        (c.phone && c.phone.toLowerCase().includes(term)) ||
        (c.alternative_mobile_number && c.alternative_mobile_number.toLowerCase().includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        (c.address && c.address.toLowerCase().includes(term)) ||
        String(c.customer_id || c.id).includes(term)
    );
  }, [customers, searchTerm]);

  // Pagination calculations
  const totalCount = filteredCustomers.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedCustomers = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, safeCurrentPage, pageSize]);

  const startRecord = totalCount === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endRecord = Math.min(safeCurrentPage * pageSize, totalCount);

  // Dynamic pagination buttons list
  const paginationPages = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (safeCurrentPage <= 3) {
      return [1, 2, 3, "...", totalPages];
    }
    if (safeCurrentPage >= totalPages - 2) {
      return [1, "...", totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", safeCurrentPage, "...", totalPages];
  }, [totalPages, safeCurrentPage]);

  return (
    <DashboardLayout title="Customer Management">
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Customer Directory Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">
                All Customers ({filteredCustomers.length})
              </h2>
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by name, phone, email, ID..."
                className="w-full min-h-9 pl-9 pr-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                aria-label="Search customers"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-xs">Loading customer directory...</span>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <Users className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-sm font-medium text-slate-700">No customers found</p>
              <p className="text-xs text-slate-400">
                {searchTerm ? "Try adjusting your search query." : "Add a customer or record to get started."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[790px] table-fixed text-left text-xs border-collapse">
                  <thead className="bg-slate-50/70 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200/80">
                    <tr>
                      <th className="w-[94px] py-3 pl-4 pr-3">Customer ID</th>
                      <th className="w-[184px] py-3 px-3">Customer</th>
                      <th className="w-[156px] py-3 px-3">Phone</th>
                      <th className="w-[230px] py-3 px-3">Email &amp; Address</th>
                      <th className="w-[70px] py-3 px-3 text-center">Vehicles</th>
                      <th className="sticky right-0 z-10 w-[64px] py-3 px-3 text-center bg-slate-50 shadow-[-6px_0_10px_-10px_rgba(15,23,42,0.5)]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedCustomers.map((cust) => {
                    const normPhone = (cust.phone || "").replace(/[\s\-\(\)\.]/g, "");
                    const isSharedPhone = (phoneCounts[normPhone] || 0) > 1;

                    return (
                      <tr
                        key={cust.id || cust.customer_id}
                        onClick={() => router.push(`/customers/${cust.id || cust.customer_id}`)}
                        className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                      >
                        {/* ID Column */}
                        <td className="py-3 pl-4 pr-3 font-mono text-[11px] font-semibold text-slate-700 whitespace-nowrap">
                          <span className="bg-slate-100 group-hover:bg-blue-100/70 group-hover:text-blue-700 px-2 py-0.5 rounded border border-slate-200 transition-colors">
                            #{cust.customer_id || cust.id}
                          </span>
                        </td>

                        {/* Name Column */}
                        <td className="py-3 px-3" title={cust.name || "Unnamed Customer"}>
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              {(cust.name || "C").charAt(0).toUpperCase()}
                            </div>
                            <span className="min-w-0 truncate font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {cust.name || "Unnamed Customer"}
                            </span>
                          </div>
                        </td>

                        {/* Phone Column */}
                        <td className="py-3 px-3">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate font-medium text-slate-800" title={cust.phone || undefined}>
                              {cust.phone || "—"}
                            </span>
                            {isSharedPhone && (
                              <span
                                title="This phone number is shared by multiple customers"
                                className="inline-flex items-center gap-1 text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded-md"
                              >
                                <Users className="w-2.5 h-2.5" />
                                <span>Shared</span>
                              </span>
                            )}
                          </div>
                          {cust.alternative_mobile_number && (
                            <div
                              className="truncate text-[10px] text-slate-400 mt-0.5"
                              title={`Alternate: ${cust.alternative_mobile_number}`}
                            >
                              Alt: {cust.alternative_mobile_number}
                            </div>
                          )}
                        </td>

                        {/* Email & Address */}
                        <td className="py-3 px-3 text-xs text-slate-500">
                          {cust.email && (
                            <div className="truncate font-medium text-slate-700" title={cust.email}>
                              {cust.email}
                            </div>
                          )}
                          {cust.address ? (
                            <div className="truncate text-[11px] text-slate-500" title={cust.address}>
                              {cust.address}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No address registered</span>
                          )}
                        </td>

                        {/* Vehicles Count */}
                        <td className="py-3 px-3 text-center text-xs">
                          {cust.vehicles_count ? (
                            <span className="inline-flex items-center justify-center gap-1 font-semibold text-slate-700">
                              <Car className="w-3.5 h-3.5 text-blue-600" />
                              <span>{cust.vehicles_count}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Actions Column */}
                        <td className="sticky right-0 z-[1] bg-white py-3 px-3 whitespace-nowrap text-center shadow-[-6px_0_10px_-10px_rgba(15,23,42,0.5)] transition-colors group-hover:bg-blue-50">
                          <button
                            type="button"
                            onClick={(event) => handleToggleActionMenu(event, cust)}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                              (actionMenu?.customer.id || actionMenu?.customer.customer_id) ===
                              (cust.id || cust.customer_id)
                                ? "border-blue-200 bg-blue-50 text-blue-600"
                                : "border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-800"
                            }`}
                            title="Customer actions"
                            aria-label={`Actions for ${cust.name || "customer"}`}
                            aria-haspopup="menu"
                            aria-expanded={
                              (actionMenu?.customer.id || actionMenu?.customer.customer_id) ===
                              (cust.id || cust.customer_id)
                            }
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 sm:p-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-slate-500">
              <div className="flex flex-wrap items-center gap-3">
                <p>
                  {totalCount === 0 ? (
                    <span>Showing 0 of 0 customers</span>
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
                      customers
                    </span>
                  )}
                </p>

                {totalCount > 10 && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="text-slate-300">|</span>
                    <span>Rows per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                )}
              </div>

              {totalPages > 1 && totalCount > 0 && (
                <div className="flex items-center gap-1.5 self-end sm:self-auto select-none">
                  <button
                    type="button"
                    disabled={safeCurrentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg font-medium cursor-pointer transition-colors"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>

                  {paginationPages.map((pageItem, idx) => {
                    if (typeof pageItem === "number") {
                      const isActive = pageItem === safeCurrentPage;
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
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg font-medium cursor-pointer transition-colors"
                    title="Next page"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </>
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
              aria-label="Customer actions"
              className="fixed z-50 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
              style={{ top: actionMenu.top, left: actionMenu.left }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  const customer = actionMenu.customer;
                  setActionMenu(null);
                  router.push(`/customers/${customer.id || customer.customer_id}`);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-blue-600 cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
                View Details
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  const customer = actionMenu.customer;
                  setActionMenu(null);
                  openEditModal(customer);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-600 cursor-pointer"
              >
                <Edit2 className="h-3.5 w-3.5" />
                Edit Customer
              </button>
            </div>
          </>,
          document.body
        )}

      {/* EDIT CUSTOMER MODAL */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-hidden">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full max-h-[90vh] max-h-[90dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="sticky top-0 z-10 px-4 sm:px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Edit Customer Profile
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Customer ID: #{editingCustomer.customer_id || editingCustomer.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-3 space-y-3">
                {editError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                    {editError}
                  </div>
                )}

                <div className="p-2.5 bg-blue-50/50 rounded-xl border border-blue-100 text-xs text-blue-800 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    Updates will modify this customer directly. No duplicate will be created.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full px-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                  className="w-full px-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Phone numbers are normalized automatically.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alternative Mobile Number <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={editAltPhone}
                  onChange={(e) => setEditAltPhone(e.target.value)}
                  placeholder="e.g. +91 98765-43211"
                  className="w-full px-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                  className="w-full px-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                  placeholder="Enter full address"
                  className="w-full px-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              </div>

              <div className="sticky bottom-0 z-10 px-4 sm:px-5 py-3 flex items-center justify-end gap-2 border-t border-slate-100 bg-white shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-2xs transition-colors cursor-pointer"
                >
                  {editSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE CUSTOMER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Create Customer Profile
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    A separate unique Customer ID will be generated.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCreate} className="p-5 space-y-4">
              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  {createError}
                </div>
              )}

              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs text-indigo-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  Phone numbers do not have to be unique. Multiple persons can share the same number.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Enter customer name"
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
                  value={createPhone}
                  onChange={(e) => setCreatePhone(e.target.value)}
                  placeholder="+91 98765-43210"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alternative Mobile Number <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={createAltPhone}
                  onChange={(e) => setCreateAltPhone(e.target.value)}
                  placeholder="e.g. +91 98765-43211"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
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
                  value={createAddress}
                  onChange={(e) => setCreateAddress(e.target.value)}
                  placeholder="Enter full address"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-2xs transition-colors cursor-pointer"
                >
                  {createSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Create Customer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toast
        open={toast.open}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        type={toast.type}
        title={toast.title}
        message={toast.message}
      />
    </DashboardLayout>
  );
}

"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  UserPlus,
  UserCheck,
  Search,
  Phone,
  Mail,
  MapPin,
  Car,
  Edit2,
  Check,
  X,
  Loader2,
  RefreshCw,
  Info,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Toast, ToastType } from "@/components/ui/toast";
import { customerService, CustomerSummary, extractApiError } from "@/lib/api";

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Quick Phone Lookup Tool State
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResults, setLookupResults] = useState<{
    phone: string;
    found: boolean;
    count: number;
    customers: CustomerSummary[];
  } | null>(null);

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

  const loadCustomers = useCallback(async () => {
    try {
      const data = await customerService.getAll();
      setCustomers(data);
    } catch {
      showToast("error", "Error", "Failed to load customers.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

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
          setRefreshing(false);
        }
      }
    };
    fetchCustomers();
    return () => {
      active = false;
    };
  }, [showToast]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadCustomers();
  };

  // Perform Quick Lookup
  const handlePhoneLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = lookupPhone.trim();
    if (!trimmed) return;

    setLookupLoading(true);
    try {
      const res = await customerService.lookup(trimmed);
      setLookupResults(res);
    } catch (err: unknown) {
      const errorInfo = extractApiError(err, "Lookup failed.");
      showToast("error", "Lookup Error", errorInfo.message);
    } finally {
      setLookupLoading(false);
    }
  };

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

      // If this customer was in lookup results, update there too
      if (lookupResults) {
        setLookupResults((prev) =>
          prev
            ? {
                ...prev,
                customers: prev.customers.map((c) =>
                  c.id === updated.id ? { ...c, ...updated } : c
                ),
              }
            : null
        );
      }

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

  return (
    <DashboardLayout title="Customer Management">
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Header Bar */}

        {/* Quick Phone Lookup Widget */}
        <div className="bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/60 rounded-2xl border border-blue-200/80 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-600 text-white shadow-2xs">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  Normalized Phone Number Lookup
                </h2>
                <p className="text-xs text-slate-500">
                  Enter any formatted number (e.g. +91 98765-43210 or 9876543210) to test phone lookup &amp; shared number matching.
                </p>
              </div>
            </div>
            {lookupResults && (
              <button
                type="button"
                onClick={() => {
                  setLookupResults(null);
                  setLookupPhone("");
                }}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <form onSubmit={handlePhoneLookup} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={lookupPhone}
                onChange={(e) => setLookupPhone(e.target.value)}
                placeholder="Enter phone number to look up (+91 98765-43210)..."
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
              />
            </div>
            <button
              type="submit"
              disabled={lookupLoading || !lookupPhone.trim()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {lookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Lookup by Phone</span>
            </button>
          </form>

          {/* Lookup Results Display */}
          {lookupResults && (
            <div className="pt-3 border-t border-blue-100">
              {lookupResults.found && lookupResults.customers.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      <span>
                        Found {lookupResults.customers.length} customer
                        {lookupResults.customers.length > 1 ? "s" : ""} matching &quot;{lookupResults.phone}&quot;
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCreatePhone(lookupResults.phone);
                        setIsCreateModalOpen(true);
                      }}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Add Different Person for this Number</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {lookupResults.customers.map((cust) => (
                      <div
                        key={cust.id || cust.customer_id}
                        className="bg-white rounded-xl border border-blue-200 p-3.5 shadow-2xs flex flex-col justify-between space-y-2 hover:border-blue-400 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                              {cust.name || "Unnamed Customer"}
                            </span>
                            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ID: #{cust.customer_id || cust.id}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-mono flex items-center gap-1 flex-wrap">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{cust.phone}</span>
                            {cust.alternative_mobile_number && (
                              <span className="text-[10px] text-slate-400 font-sans">
                                (Alt: {cust.alternative_mobile_number})
                              </span>
                            )}
                          </p>
                          {cust.email && (
                            <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{cust.email}</span>
                            </p>
                          )}
                          {cust.address && (
                            <p className="text-xs text-slate-500 flex items-center gap-1 line-clamp-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{cust.address}</span>
                            </p>
                          )}
                          {Boolean(cust.vehicles_count) && (
                            <p className="text-xs text-blue-600 flex items-center gap-1 font-medium">
                              <Car className="w-3 h-3 text-blue-500" />
                              <span>{cust.vehicles_count} vehicle(s)</span>
                            </p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                          <Link
                            href={`/customers/${cust.id || cust.customer_id}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
                          >
                            <span>View Details</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(cust)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <Link
                              href={`/insurance-records/new?phone=${encodeURIComponent(cust.phone)}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900"
                            >
                              <span>+ Policy</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      No existing customer found with phone &quot;{lookupResults.phone}&quot;.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCreatePhone(lookupResults.phone);
                      setIsCreateModalOpen(true);
                    }}
                    className="font-semibold text-amber-900 underline cursor-pointer"
                  >
                    Create Customer Now
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Customer Directory Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">
                All Customers ({filteredCustomers.length})
              </h2>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, phone, email, ID..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50/80 text-slate-600 uppercase text-[10px] sm:text-xs font-semibold tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4 sm:px-6">Customer ID</th>
                    <th className="py-3 px-4 sm:px-6">Name</th>
                    <th className="py-3 px-4 sm:px-6">Phone Number</th>
                    <th className="py-3 px-4 sm:px-6">Email &amp; Address</th>
                    <th className="py-3 px-4 sm:px-6">Vehicles</th>
                    <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map((cust) => {
                    const normPhone = (cust.phone || "").replace(/[\s\-\(\)\.]/g, "");
                    const isSharedPhone = (phoneCounts[normPhone] || 0) > 1;

                    return (
                      <tr
                        key={cust.id || cust.customer_id}
                        onClick={() => router.push(`/customers/${cust.id || cust.customer_id}`)}
                        className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                      >
                        {/* ID Column */}
                        <td className="py-3.5 px-4 sm:px-6 font-mono text-xs font-semibold text-slate-700">
                          <span className="bg-slate-100 group-hover:bg-blue-100/70 group-hover:text-blue-700 px-2 py-0.5 rounded border border-slate-200 transition-colors">
                            #{cust.customer_id || cust.id}
                          </span>
                        </td>

                        {/* Name Column */}
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              {(cust.name || "C").charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {cust.name || "Unnamed Customer"}
                            </span>
                          </div>
                        </td>

                        {/* Phone Column */}
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-slate-800">{cust.phone}</span>
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
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              Alt: {cust.alternative_mobile_number}
                            </div>
                          )}
                        </td>

                        {/* Email & Address */}
                        <td className="py-3.5 px-4 sm:px-6 text-xs text-slate-500 max-w-xs truncate">
                          {cust.email && <div className="text-slate-700">{cust.email}</div>}
                          {cust.address ? (
                            <div className="text-slate-500 truncate">{cust.address}</div>
                          ) : (
                            <span className="text-slate-400 italic">No address registered</span>
                          )}
                        </td>

                        {/* Vehicles Count */}
                        <td className="py-3.5 px-4 sm:px-6 text-xs">
                          {cust.vehicles_count ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                              <Car className="w-3.5 h-3.5 text-blue-600" />
                              <span>{cust.vehicles_count}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Actions Column */}
                        <td className="py-3.5 px-4 sm:px-6 text-right">
                          <div
                            className="inline-flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link
                              href={`/customers/${cust.id || cust.customer_id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-blue-700 bg-slate-100 hover:bg-blue-100/70 rounded-lg transition-colors"
                              title="View Customer Details"
                            >
                              <span>Details</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(cust);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50/80 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
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
      </div>

      {/* EDIT CUSTOMER MODAL */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
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

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  {editError}
                </div>
              )}

              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-xs text-blue-800 flex items-center gap-2">
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
                  placeholder="Enter full address"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
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

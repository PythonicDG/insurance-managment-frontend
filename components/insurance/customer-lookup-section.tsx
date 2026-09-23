"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  User,
  Phone,
  MapPin,
  Mail,
  UserCheck,
  UserPlus,
  Car,
  Search,
  Check,
  Loader2,
  Info,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { CustomerSummary, customerService } from "@/lib/api";

interface CustomerLookupSectionProps {
  customerName: string;
  setCustomerName: (val: string) => void;
  customerPhone: string;
  setCustomerPhone: (val: string) => void;
  customerAltPhone?: string;
  setCustomerAltPhone?: (val: string) => void;
  customerAddress: string;
  setCustomerAddress: (val: string) => void;
  customerEmail?: string;
  setCustomerEmail?: (val: string) => void;
  selectedCustomer: CustomerSummary | null;
  setSelectedCustomer: (cust: CustomerSummary | null) => void;
  isDifferentPerson: boolean;
  setIsDifferentPerson: (val: boolean) => void;
  disabled?: boolean;
}

export function CustomerLookupSection({
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  customerAltPhone,
  setCustomerAltPhone,
  customerAddress,
  setCustomerAddress,
  customerEmail,
  setCustomerEmail,
  selectedCustomer,
  setSelectedCustomer,
  isDifferentPerson,
  setIsDifferentPerson,
  disabled = false,
}: CustomerLookupSectionProps) {
  const [matchingCustomers, setMatchingCustomers] = useState<CustomerSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Normalize phone locally for comparison
  const normalizeDigits = (val: string) => val.replace(/[\s\-\(\)\.]/g, "");

  const performLookup = useCallback(async (phoneToLookup: string) => {
    const trimmed = phoneToLookup.trim();
    const cleanDigits = normalizeDigits(trimmed);

    if (!trimmed || cleanDigits.length < 5) {
      setMatchingCustomers([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const res = await customerService.lookup(trimmed);
      setMatchingCustomers(res.customers || []);
      setHasSearched(true);
    } catch {
      setMatchingCustomers([]);
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced lookup on phone change
  useEffect(() => {
    const clean = normalizeDigits(customerPhone.trim());
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!clean || clean.length < 5) {
      searchTimeoutRef.current = setTimeout(() => {
        setMatchingCustomers([]);
        setHasSearched(false);
      }, 0);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      performLookup(customerPhone);
    }, 400);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [customerPhone, performLookup]);

  // Handle selecting an existing customer
  const handleSelectCustomer = (customer: CustomerSummary) => {
    setSelectedCustomer(customer);
    setIsDifferentPerson(false);
    if (customer.name) setCustomerName(customer.name);
    if (customer.address) setCustomerAddress(customer.address);
    if (customer.email && setCustomerEmail) setCustomerEmail(customer.email);
    if (setCustomerAltPhone) setCustomerAltPhone(customer.alternative_mobile_number || "");
  };

  // Handle opting to create a new customer sharing the same number
  const handleCreateNewCustomer = () => {
    setSelectedCustomer(null);
    setIsDifferentPerson(true);
  };

  // Handle resetting decision
  const handleResetChoice = () => {
    setSelectedCustomer(null);
    setIsDifferentPerson(false);
  };

  const hasMatches = matchingCustomers.length > 0;
  const isSelectedCustomerActive = Boolean(selectedCustomer);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">
            Customer Details
          </h2>
          {isSelectedCustomerActive && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              Existing Customer #{selectedCustomer?.customer_id || selectedCustomer?.id}
            </span>
          )}
          {isDifferentPerson && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
              New Customer (Shared Phone)
            </span>
          )}
        </div>

        {isSearching && (
          <div className="flex items-center gap-1.5 text-xs text-blue-600">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Checking phone...</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {/* Phone Number Input with Lookup trigger */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Phone className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              disabled={disabled}
              value={customerPhone}
              onChange={(e) => {
                setCustomerPhone(e.target.value);
                // If phone changed from current selected customer's phone, reset selected customer
                if (
                  selectedCustomer &&
                  normalizeDigits(e.target.value) !== normalizeDigits(selectedCustomer.phone)
                ) {
                  setSelectedCustomer(null);
                  setIsDifferentPerson(false);
                }
              }}
              onBlur={() => {
                if (customerPhone.trim().length >= 5) {
                  performLookup(customerPhone);
                }
              }}
              placeholder="+91 98765-43210"
              className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
            {isSearching ? (
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-blue-500">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : hasMatches ? (
              <div
                title="Customer found for this phone number"
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-emerald-600"
              >
                <UserCheck className="w-4 h-4" />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => performLookup(customerPhone)}
                title="Lookup customer by phone"
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
              >
                <Search className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Looking up normalized phone number automatically.
          </p>
        </div>

        {/* Customer Name Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
            <span>
              Customer Name <span className="text-red-500">*</span>
            </span>
            {isSelectedCustomerActive && (
              <span className="text-[10px] text-emerald-600 font-normal">
                (Edits will update this customer)
              </span>
            )}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              disabled={disabled}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter customer name"
              className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Alternative Mobile Number Input (Optional) */}
        {setCustomerAltPhone !== undefined && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Alternative Mobile Number (Optional)</span>
              {isSelectedCustomerActive && (
                <span className="text-[10px] text-emerald-600 font-normal">
                  (Edits will update this customer)
                </span>
              )}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="text"
                disabled={disabled}
                value={customerAltPhone || ""}
                onChange={(e) => setCustomerAltPhone(e.target.value)}
                placeholder="+91 98765-43210 (Optional)"
                className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        )}

        {/* Email Input (if supported) */}
        {setCustomerEmail !== undefined && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email Address (Optional)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                disabled={disabled}
                value={customerEmail || ""}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="customer@example.com"
                className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        )}

        {/* Address Input */}
        <div className={(setCustomerEmail !== undefined && setCustomerAltPhone !== undefined) ? "" : setCustomerEmail !== undefined ? "" : "md:col-span-2"}>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
            <span>Address</span>
            {isSelectedCustomerActive && (
              <span className="text-[10px] text-emerald-600 font-normal">
                (Edits will update this customer)
              </span>
            )}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <MapPin className="w-4 h-4" />
            </div>
            <input
              type="text"
              disabled={disabled}
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder="Enter full address"
              className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* MATCHING CUSTOMER FOUND NOTIFICATION & ACTION PANEL */}
      {hasMatches && !isSelectedCustomerActive && !isDifferentPerson && (
        <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/70 to-indigo-50/40 p-4 sm:p-5 transition-all">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-600 text-white shrink-0 mt-0.5">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <span>
                    {matchingCustomers.length === 1
                      ? "Existing Customer Found"
                      : `Found ${matchingCustomers.length} Customers Sharing This Phone`}
                  </span>
                  <span className="text-xs font-normal text-slate-500">
                    ({customerPhone})
                  </span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Would you like to use the existing customer or create a new customer profile for a different person sharing this number?
                </p>
              </div>

              {/* List of matching customer cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {matchingCustomers.map((cust) => (
                  <div
                    key={cust.id || cust.customer_id}
                    className="p-3 bg-white rounded-xl border border-blue-100 shadow-2xs flex flex-col justify-between hover:border-blue-300 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                          {cust.name || "Unnamed Customer"}
                        </p>
                        <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          ID: #{cust.customer_id || cust.id}
                        </span>
                      </div>
                      {cust.email && (
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{cust.email}</span>
                        </p>
                      )}
                      {cust.alternative_mobile_number && (
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>Alt: {cust.alternative_mobile_number}</span>
                        </p>
                      )}
                      {cust.address && (
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 line-clamp-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{cust.address}</span>
                        </p>
                      )}
                      {Boolean(cust.vehicles_count) && (
                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Car className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>
                            {cust.vehicles_count} registered vehicle
                            {cust.vehicles_count !== 1 ? "s" : ""}
                          </span>
                        </p>
                      )}
                    </div>

                    <div className="pt-2.5 mt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleSelectCustomer(cust)}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-2xs transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Use This Customer</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Alternative: Create new customer */}
              <div className="pt-1 flex items-center justify-between border-t border-blue-200/60 flex-wrap gap-2">
                <span className="text-xs text-slate-600">
                  Different person sharing this phone number?
                </span>
                <button
                  type="button"
                  onClick={handleCreateNewCustomer}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Create New Customer Profile</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STATE 1: EXISTING CUSTOMER IS ACTIVE */}
      {isSelectedCustomerActive && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 sm:p-4 transition-all">
          <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-600 text-white shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-emerald-950">
                  Using Existing Customer: <span className="underline decoration-emerald-400 font-bold">{selectedCustomer?.name || customerName}</span>
                  <span className="ml-1.5 font-mono text-[11px] font-medium text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                    ID: #{selectedCustomer?.customer_id || selectedCustomer?.id}
                  </span>
                </p>
                <p className="text-[11px] text-emerald-700 mt-0.5 flex items-center gap-1">
                  <Info className="w-3 h-3 shrink-0" />
                  <span>
                    Editing name or address above will update this customer&apos;s existing profile directly. No duplicate will be created.
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-center">
              <button
                type="button"
                onClick={handleResetChoice}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Change Selection</span>
              </button>
              <button
                type="button"
                onClick={handleCreateNewCustomer}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 border border-slate-300 rounded-md px-2 py-1 bg-white cursor-pointer"
              >
                <UserPlus className="w-3 h-3 text-indigo-600" />
                <span>Different Person</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATE 2: NEW CUSTOMER OVERRIDE (SHARED NUMBER) */}
      {isDifferentPerson && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3.5 sm:p-4 transition-all">
          <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-600 text-white shrink-0">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-indigo-950">
                  Creating a New Customer Profile
                </p>
                <p className="text-[11px] text-indigo-700 mt-0.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 shrink-0 text-indigo-500" />
                  <span>
                    This customer shares phone number <span className="font-semibold">{customerPhone}</span>. A separate, unique Customer ID will be generated upon saving.
                  </span>
                </p>
              </div>
            </div>

            {hasMatches && (
              <button
                type="button"
                onClick={handleResetChoice}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700 hover:text-indigo-900 underline shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>View Existing Customers</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* STATE 3: FRESH PHONE NUMBER (NO MATCHES FOUND) */}
      {hasSearched && !hasMatches && !isSearching && customerPhone.trim().length >= 5 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              No customer currently registered with <span className="font-medium text-slate-800">{customerPhone}</span>. A new customer ID will be assigned automatically.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

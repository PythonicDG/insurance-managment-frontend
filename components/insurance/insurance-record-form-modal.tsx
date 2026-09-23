"use client";

import React, { useState, useEffect } from "react";
import { X, Calendar as CalendarIcon, Building2, Car, Loader2, AlertCircle } from "lucide-react";
import {
  InsuranceCompany,
  InsuranceRecordItem,
  CustomerSummary,
  VehicleCheckResponse,
  insuranceRecordService,
  extractApiError,
} from "@/lib/api";
import { PolicyDuplicateAlert } from "@/components/insurance/policy-duplicate-alert";
import { VehicleActivePolicyAlert } from "@/components/insurance/vehicle-active-policy-alert";
import { RenewPolicyModal } from "@/components/insurance/renew-policy-modal";
import { ViewExistingRecordModal } from "@/components/insurance/view-existing-record-modal";
import { CustomerLookupSection } from "@/components/insurance/customer-lookup-section";
import {
  getTodayDateString,
  getNextYearDateString,
} from "@/lib/date-utils";
import {
  normalizeVehicleNumber,
  validateVehicleRegistration,
} from "@/lib/vehicle-utils";

interface InsuranceRecordFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordToEdit: InsuranceRecordItem | null;
  companies: InsuranceCompany[];
  onSave: (formData: {
    policy_number: string;
    insurance_company_id: number;
    customer_id?: number;
    create_new_customer?: boolean;
    customer_name: string;
    customer_phone: string;
    customer_alternative_mobile_number?: string;
    alternative_mobile_number?: string;
    customer_email?: string;
    customer_address?: string;
    vehicle_number: string;
    vehicle_type?: string;
    entry_date?: string;
    policy_start_date: string;
    policy_expiry_date: string;
    total_premium: number;
    remarks?: string;
  }) => Promise<void>;
}

interface DialogProps {
  recordToEdit: InsuranceRecordItem | null;
  companies: InsuranceCompany[];
  onClose: () => void;
  onSave: InsuranceRecordFormModalProps["onSave"];
}

function InsuranceRecordFormDialog({
  recordToEdit,
  companies,
  onClose,
  onSave,
}: DialogProps) {
  const [policyNumber, setPolicyNumber] = useState(() => {
    if (recordToEdit?.policy_number) return recordToEdit.policy_number;
    return `POL-${Math.floor(10000 + Math.random() * 90000)}-${Math.floor(
      100 + Math.random() * 900
    )}A`;
  });

  const [companyId, setCompanyId] = useState<number | string>(() => {
    return recordToEdit?.insurance_company?.id || (companies[0]?.id ?? "");
  });

  const [customerName, setCustomerName] = useState(
    () => recordToEdit?.customer?.name || ""
  );
  const [customerPhone, setCustomerPhone] = useState(
    () => recordToEdit?.customer?.phone || ""
  );
  const [customerAltPhone, setCustomerAltPhone] = useState(
    () => recordToEdit?.alternative_mobile_number || recordToEdit?.customer?.alternative_mobile_number || ""
  );
  const [customerEmail, setCustomerEmail] = useState(
    () => recordToEdit?.customer?.email || ""
  );
  const [customerAddress, setCustomerAddress] = useState(
    () => recordToEdit?.customer?.address || ""
  );
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(
    () => recordToEdit?.customer || null
  );
  const [isDifferentPerson, setIsDifferentPerson] = useState(false);

  const [vehicleNumber, setVehicleNumber] = useState(() =>
    normalizeVehicleNumber(recordToEdit?.vehicle?.vehicle_number || "")
  );
  const [vehicleType, setVehicleType] = useState(
    () => recordToEdit?.vehicle?.vehicle_type || "SUV (Mahindra XUV700)"
  );

  const [entryDate, setEntryDate] = useState(() => {
    return recordToEdit?.entry_date || getTodayDateString();
  });

  const [startDate, setStartDate] = useState(() => {
    return recordToEdit?.policy_start_date || "";
  });

  const [expiryDate, setExpiryDate] = useState(() => {
    return recordToEdit?.policy_expiry_date || "";
  });

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (val) {
      setExpiryDate(getNextYearDateString(val));
    } else {
      setExpiryDate("");
    }
  };

  const [totalPremium, setTotalPremium] = useState<number | string>(
    () => recordToEdit?.total_premium ?? ""
  );
  const [remarks, setRemarks] = useState(() => recordToEdit?.remarks || "");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Duplicate Detection State
  const [duplicateRecord, setDuplicateRecord] = useState<InsuranceRecordItem | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [policyNumberError, setPolicyNumberError] = useState("");
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Vehicle Active Policy State
  const [vehicleCheck, setVehicleCheck] = useState<VehicleCheckResponse | null>(null);
  const [checkingVehicle, setCheckingVehicle] = useState(false);
  const [vehicleError, setVehicleError] = useState("");
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [recordToRenew, setRecordToRenew] = useState<InsuranceRecordItem | null>(null);

  // Debounced duplicate detection
  useEffect(() => {
    const trimmed = policyNumber.trim();
    let active = true;

    const timer = setTimeout(async () => {
      if (!trimmed) {
        if (active) {
          setDuplicateRecord(null);
          setPolicyNumberError("");
          setCheckingDuplicate(false);
        }
        return;
      }

      setCheckingDuplicate(true);
      try {
        const res = await insuranceRecordService.checkDuplicatePolicy(
          trimmed,
          recordToEdit?.id
        );
        if (!active) return;
        if (res.is_duplicate && res.record) {
          setDuplicateRecord(res.record);
          const cust = res.record.customer?.name || "another customer";
          setPolicyNumberError(`Policy number "${trimmed}" is already registered to ${cust}.`);
        } else {
          setDuplicateRecord(null);
          setPolicyNumberError("");
        }
      } catch {
        // Silently ignore background check failures
      } finally {
        if (active) {
          setCheckingDuplicate(false);
        }
      }
    }, trimmed ? 400 : 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [policyNumber, recordToEdit?.id]);

  const handlePolicyNumberBlur = async () => {
    const trimmed = policyNumber.trim();
    if (!trimmed) return;
    try {
      setCheckingDuplicate(true);
      const res = await insuranceRecordService.checkDuplicatePolicy(
        trimmed,
        recordToEdit?.id
      );
      if (res.is_duplicate && res.record) {
        setDuplicateRecord(res.record);
        const cust = res.record.customer?.name || "another customer";
        setPolicyNumberError(`Policy number "${trimmed}" is already registered to ${cust}.`);
      } else {
        setDuplicateRecord(null);
        setPolicyNumberError("");
      }
    } catch {
      // ignore
    } finally {
      setCheckingDuplicate(false);
    }
  };

  // Debounced vehicle check
  useEffect(() => {
    const normalized = normalizeVehicleNumber(vehicleNumber);
    let active = true;

    const timer = setTimeout(async () => {
      if (!normalized) {
        if (active) {
          setVehicleCheck(null);
          setVehicleError("");
          setCheckingVehicle(false);
        }
        return;
      }

      // Check format validity before making backend request
      const validation = validateVehicleRegistration(normalized);
      if (!validation.isValid) {
        if (active) {
          setVehicleCheck(null);
          setCheckingVehicle(false);
        }
        return;
      }

      setCheckingVehicle(true);
      try {
        const res = await insuranceRecordService.checkVehicle(
          normalized,
          recordToEdit?.id
        );
        if (!active) return;
        setVehicleCheck(res);
        if (res.has_active_policy && res.active_record && !recordToEdit) {
          setVehicleError(
            `Active policy #${res.active_record.policy_number} already exists for vehicle "${normalized}".`
          );
        } else {
          setVehicleError("");
        }

        if (res.exists && res.vehicle_type && (!vehicleType || vehicleType.includes("SUV"))) {
          setVehicleType(res.vehicle_type);
        }
        if (res.exists && res.customer_phone && !customerPhone) {
          setCustomerPhone(res.customer_phone);
          if (res.customer_name && !customerName) {
            setCustomerName(res.customer_name);
          }
        }
        if (res.exists && res.customer_alternative_mobile_number && !customerAltPhone) {
          setCustomerAltPhone(res.customer_alternative_mobile_number);
        }
      } catch {
        // ignore
      } finally {
        if (active) {
          setCheckingVehicle(false);
        }
      }
    }, normalized ? 400 : 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [vehicleNumber, recordToEdit?.id, vehicleType, customerPhone, customerName, customerAltPhone]);

  const handleVehicleNumberBlur = async () => {
    const normalized = normalizeVehicleNumber(vehicleNumber);
    if (!normalized) return;

    // Validate registration format on blur
    const validation = validateVehicleRegistration(normalized);
    if (!validation.isValid) {
      setVehicleError(validation.error || "Invalid vehicle registration number.");
      setVehicleCheck(null);
      return;
    }

    try {
      setCheckingVehicle(true);
      const res = await insuranceRecordService.checkVehicle(
        normalized,
        recordToEdit?.id
      );
      setVehicleCheck(res);
      if (res.has_active_policy && res.active_record && !recordToEdit) {
        setVehicleError(
          `Active policy #${res.active_record.policy_number} already exists for vehicle "${normalized}".`
        );
      } else {
        setVehicleError("");
      }
    } catch {
      // ignore
    } finally {
      setCheckingVehicle(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const trimmedPolicy = policyNumber.trim();
    if (!trimmedPolicy) {
      setErrorMsg("Policy number is required.");
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMsg("Customer name and phone are required.");
      return;
    }
    const normalizedVeh = normalizeVehicleNumber(vehicleNumber);
    if (!normalizedVeh) {
      setVehicleError("Vehicle number is required.");
      setErrorMsg("Vehicle number is required.");
      return;
    }
    const vehValidation = validateVehicleRegistration(normalizedVeh);
    if (!vehValidation.isValid) {
      const err = vehValidation.error || "Please enter a valid Indian vehicle registration number.";
      setVehicleError(err);
      setErrorMsg(err);
      return;
    }
    setVehicleNumber(normalizedVeh);

    if (!startDate || !expiryDate) {
      setErrorMsg("Start date and expiry date are required.");
      return;
    }
    const numPremium = parseFloat(String(totalPremium));
    if (isNaN(numPremium) || numPremium <= 0) {
      setErrorMsg("Please enter a valid total premium amount.");
      return;
    }

    if (duplicateRecord) {
      setErrorMsg(
        `Policy number "${trimmedPolicy}" is already registered in the system. Please enter a unique policy number.`
      );
      return;
    }

    if (vehicleCheck?.has_active_policy && vehicleCheck.active_record && !recordToEdit) {
      setErrorMsg(
        `Active policy #${vehicleCheck.active_record.policy_number} already exists for vehicle "${normalizedVeh}". Please renew or update.`
      );
      return;
    }

    setSubmitting(true);
    try {
      // Synchronous double-check before submission
      const dupCheck = await insuranceRecordService.checkDuplicatePolicy(
        trimmedPolicy,
        recordToEdit?.id
      );
      if (dupCheck.is_duplicate && dupCheck.record) {
        setDuplicateRecord(dupCheck.record);
        const cust = dupCheck.record.customer?.name || "another customer";
        const msg = `Policy number "${trimmedPolicy}" is already registered to ${cust}. Policy numbers must be unique.`;
        setPolicyNumberError(msg);
        setErrorMsg(msg);
        setSubmitting(false);
        return;
      }

      // Synchronous vehicle check before submission
      if (normalizedVeh) {
        const vCheck = await insuranceRecordService.checkVehicle(
          normalizedVeh,
          recordToEdit ? recordToEdit.id : undefined
        );
        if (vCheck.has_active_policy && vCheck.active_record) {
          setVehicleCheck(vCheck);
          const msg = `Active policy #${vCheck.active_record.policy_number} already exists for vehicle "${normalizedVeh}". Please renew or update.`;
          setVehicleError(msg);
          setErrorMsg(msg);
          setSubmitting(false);
          return;
        }
      }

      await onSave({
        policy_number: trimmedPolicy,
        insurance_company_id: Number(companyId) || (companies[0]?.id ?? 1),
        customer_id: selectedCustomer?.id || selectedCustomer?.customer_id,
        create_new_customer: isDifferentPerson,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_alternative_mobile_number: customerAltPhone.trim() || undefined,
        alternative_mobile_number: customerAltPhone.trim() || undefined,
        customer_email: customerEmail.trim() || undefined,
        customer_address: customerAddress.trim() || undefined,
        vehicle_number: normalizedVeh,
        vehicle_type: vehicleType.trim(),
        entry_date: entryDate || getTodayDateString(),
        policy_start_date: startDate,
        policy_expiry_date: expiryDate,
        total_premium: numPremium,
        remarks: remarks.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      const errorInfo = extractApiError(err, "An unexpected error occurred. Please try again.");
      setErrorMsg(errorInfo.message);
      if (errorInfo.policyNumberError) {
        setPolicyNumberError(errorInfo.policyNumberError);
        if (!duplicateRecord) {
          insuranceRecordService
            .checkDuplicatePolicy(trimmedPolicy, recordToEdit?.id)
            .then((res) => {
              if (res.is_duplicate && res.record) {
                setDuplicateRecord(res.record);
              }
            })
            .catch(() => {});
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-2xl my-8 overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {recordToEdit ? "Edit Insurance Record" : "Add New Insurance Record"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter customer, vehicle, and policy premium specifications.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
            {errorMsg}
          </div>
        )}

        {/* Form Content */}
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-5 max-h-[calc(85vh-8rem)] overflow-y-auto"
        >
          {/* Section 1: Customer Details with Normalized Phone Lookup */}
          <CustomerLookupSection
            customerName={customerName}
            setCustomerName={setCustomerName}
            customerPhone={customerPhone}
            setCustomerPhone={setCustomerPhone}
            customerAltPhone={customerAltPhone}
            setCustomerAltPhone={setCustomerAltPhone}
            customerEmail={customerEmail}
            setCustomerEmail={setCustomerEmail}
            customerAddress={customerAddress}
            setCustomerAddress={setCustomerAddress}
            selectedCustomer={selectedCustomer}
            setSelectedCustomer={setSelectedCustomer}
            isDifferentPerson={isDifferentPerson}
            setIsDifferentPerson={setIsDifferentPerson}
          />

          {/* Section 2: Vehicle Information */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-3 text-slate-900 font-bold text-xs uppercase tracking-wider">
              <Car className="w-3.5 h-3.5 text-blue-600" />
              <span>Vehicle Information</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Vehicle Number <span className="text-red-500">*</span>
                  </label>
                  {checkingVehicle && (
                    <span className="flex items-center gap-1 text-[11px] text-blue-600 font-medium">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Checking...</span>
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={vehicleNumber}
                    onChange={(e) => {
                      const normalized = normalizeVehicleNumber(e.target.value);
                      if (normalized.length <= 11) {
                        setVehicleNumber(normalized);
                        const check = validateVehicleRegistration(normalized);
                        if (check.isValid) {
                          setVehicleError("");
                        }
                      }
                    }}
                    onBlur={handleVehicleNumberBlur}
                    placeholder="e.g. MH12AB1234 or 22BH1234AA"
                    className={`w-full px-3.5 py-2 text-xs sm:text-sm bg-white border rounded-xl font-mono uppercase text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                      vehicleCheck?.has_active_policy
                        ? "border-amber-400 focus:border-amber-500 focus:ring-amber-500/20 bg-amber-50/15"
                        : vehicleError
                        ? "border-red-400 focus:border-red-500 focus:ring-red-500/20 bg-red-50/15"
                        : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                    }`}
                  />
                  {checkingVehicle && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                    </div>
                  )}
                </div>
                {vehicleError && !vehicleCheck?.has_active_policy && (
                  <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                    <span>{vehicleError}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vehicle Type / Model
                </label>
                <input
                  type="text"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  placeholder="e.g. SUV (Mahindra XUV700)"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {vehicleCheck && (
                <div className="sm:col-span-2">
                  <VehicleActivePolicyAlert
                    vehicleNumber={vehicleNumber}
                    vehicleCheck={vehicleCheck}
                    onUpdatePolicy={(activeRec) => {
                      setPolicyNumber(activeRec.policy_number);
                      if (activeRec.insurance_company?.id) {
                        setCompanyId(activeRec.insurance_company.id);
                      }
                      if (activeRec.customer) {
                        setSelectedCustomer(activeRec.customer);
                        setCustomerName(activeRec.customer.name || "");
                        setCustomerPhone(activeRec.customer.phone || "");
                        setCustomerAltPhone(activeRec.alternative_mobile_number || activeRec.customer.alternative_mobile_number || "");
                        setCustomerAddress(activeRec.customer.address || "");
                      }
                      if (activeRec.vehicle?.vehicle_type) {
                        setVehicleType(activeRec.vehicle.vehicle_type);
                      }
                      if (activeRec.policy_start_date) setStartDate(activeRec.policy_start_date);
                      if (activeRec.policy_expiry_date) setExpiryDate(activeRec.policy_expiry_date);
                      if (activeRec.total_premium) setTotalPremium(String(activeRec.total_premium));
                      if (activeRec.remarks) setRemarks(activeRec.remarks);
                    }}
                    onRenewPolicy={(activeRec) => {
                      setRecordToRenew(activeRec);
                      setIsRenewModalOpen(true);
                    }}
                    onViewDetails={(rec) => {
                      setDuplicateRecord(rec);
                      setIsViewModalOpen(true);
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Policy & Financials */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-3 text-slate-900 font-bold text-xs uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Policy &amp; Premium Details</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Policy Number <span className="text-red-500">*</span>
                  </label>
                  {checkingDuplicate && (
                    <span className="flex items-center gap-1.5 text-[11px] text-blue-600 font-medium">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Checking uniqueness...</span>
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={policyNumber}
                    onChange={(e) => {
                      setPolicyNumber(e.target.value);
                      if (errorMsg) setErrorMsg("");
                    }}
                    onBlur={handlePolicyNumberBlur}
                    placeholder="e.g. POL-99283-772A"
                    className={`w-full pl-3.5 pr-9 py-2 text-xs sm:text-sm bg-white border rounded-xl font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                      duplicateRecord
                        ? "border-amber-400 focus:border-amber-500 focus:ring-amber-500/20 bg-amber-50/15"
                        : policyNumberError
                        ? "border-red-400 focus:border-red-500 focus:ring-red-500/20 bg-red-50/15"
                        : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                    }`}
                  />
                  {checkingDuplicate && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                    </div>
                  )}
                </div>

                {duplicateRecord && (
                  <PolicyDuplicateAlert
                    policyNumber={policyNumber}
                    duplicateRecord={duplicateRecord}
                    onViewExisting={() => setIsViewModalOpen(true)}
                  />
                )}

                {!duplicateRecord && policyNumberError && (
                  <p className="mt-1 text-xs text-red-600 font-medium">
                    {policyNumberError}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Insurance Company <span className="text-red-500">*</span>
                </label>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  {companies.length === 0 && (
                    <>
                      <option value="1">ICICI Lombard</option>
                      <option value="2">Bajaj Allianz</option>
                      <option value="3">HDFC ERGO</option>
                      <option value="4">New India Assurance</option>
                      <option value="5">Tata AIG</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  />
                  <CalendarIcon className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Expiry Date <span className="text-red-500">*</span>
                  </label>
                  {startDate && (
                    <span className="text-[11px] text-emerald-600 font-medium">+1 Year Auto</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  />
                  <CalendarIcon className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Premium (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={totalPremium}
                  onChange={(e) => setTotalPremium(e.target.value)}
                  placeholder="e.g. 18500"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm font-semibold bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Underwriting Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add notes about policy coverage, splits, or inspections..."
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || Boolean(vehicleCheck?.has_active_policy && !recordToEdit)}
              title={
                vehicleCheck?.has_active_policy && !recordToEdit
                  ? "Active policy already exists for this vehicle. Please Renew or Update."
                  : undefined
              }
              className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center min-w-[120px]"
            >
              {submitting ? (
                "Saving..."
              ) : vehicleCheck?.has_active_policy && !recordToEdit ? (
                "Active Policy Exists"
              ) : recordToEdit ? (
                "Update Record"
              ) : (
                "Create Record"
              )}
            </button>
          </div>
        </form>
      </div>

      <ViewExistingRecordModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        record={duplicateRecord}
      />

      <RenewPolicyModal
        isOpen={isRenewModalOpen}
        onClose={() => setIsRenewModalOpen(false)}
        record={recordToRenew}
        companies={companies}
        onRenewSuccess={() => {
          onClose();
        }}
      />
    </div>
  );
}

export function InsuranceRecordFormModal({
  isOpen,
  onClose,
  recordToEdit,
  companies,
  onSave,
}: InsuranceRecordFormModalProps) {
  if (!isOpen) return null;

  return (
    <InsuranceRecordFormDialog
      key={recordToEdit?.id ? `edit-${recordToEdit.id}` : "create-new"}
      recordToEdit={recordToEdit}
      companies={companies}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

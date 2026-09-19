"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  UploadCloud,
  FileText,
  X,
  ChevronDown,
  Calendar as CalendarIcon,
  Loader2,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Toast, ToastType } from "@/components/ui/toast";
import {
  companyService,
  insuranceRecordService,
  insuranceDocumentService,
  paymentService,
  InsuranceCompany,
  InsuranceRecordItem,
  InsuranceRecordPayload,
  CustomerSummary,
  VehicleCheckResponse,
  extractApiError,
} from "@/lib/api";
import {
  PolicyDuplicateAlert,
} from "@/components/insurance/policy-duplicate-alert";
import { VehicleActivePolicyAlert } from "@/components/insurance/vehicle-active-policy-alert";
import { RenewPolicyModal } from "@/components/insurance/renew-policy-modal";
import { ViewExistingRecordModal } from "@/components/insurance/view-existing-record-modal";
import { CustomerLookupSection } from "@/components/insurance/customer-lookup-section";
import {
  formatLocalDateISO,
  getTodayDateString,
  getNextYearDateString,
} from "@/lib/date-utils";

function AddInsuranceRecordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const isEditMode = Boolean(editId);

  // Form State - Customer Details
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null);
  const [isDifferentPerson, setIsDifferentPerson] = useState(false);

  // Form State - Vehicle Details
  const [vehicleType, setVehicleType] = useState("Car");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleCheck, setVehicleCheck] = useState<VehicleCheckResponse | null>(null);
  const [checkingVehicle, setCheckingVehicle] = useState(false);
  const [vehicleError, setVehicleError] = useState("");
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [recordToRenew, setRecordToRenew] = useState<InsuranceRecordItem | null>(null);

  // Form State - Insurance Details
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | string>("");
  const [policyNumber, setPolicyNumber] = useState("");

  // Duplicate Detection State
  const [duplicateRecord, setDuplicateRecord] = useState<InsuranceRecordItem | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [policyNumberError, setPolicyNumberError] = useState("");
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Record Entry Date defaults to today's date automatically
  const [entryDate, setEntryDate] = useState(() => {
    return getTodayDateString();
  });
  // Insurance Start Date is empty by default (not pre-selected)
  const [startDate, setStartDate] = useState("");
  // Insurance End Date auto-calculates to 1 year later when start date is picked
  const [endDate, setEndDate] = useState("");

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (val) {
      setEndDate(getNextYearDateString(val));
    } else {
      setEndDate("");
    }
  };

  // Form State - Payment Details
  const [totalPremium, setTotalPremium] = useState<string>("");
  const [paidAmount, setPaidAmount] = useState<string>("");

  // Form State - Documents
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [existingDocName, setExistingDocName] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State - Notes
  const [remarks, setRemarks] = useState("");

  // UI / Submission state
  const [submitting, setSubmitting] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(isEditMode);
  const [errorMessage, setErrorMessage] = useState("");
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

  // Load Companies & Edit Data
  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const comps = await companyService.getAll();
        if (active && comps && comps.length > 0) {
          setCompanies(comps);
          if (!selectedCompanyId) {
            // Check if ICICI Lombard exists to match screenshot, otherwise default to first
            const icici = comps.find((c) =>
              c.name.toLowerCase().includes("icici")
            );
            setSelectedCompanyId(icici ? icici.id : comps[0].id);
          }
        }
      } catch {
        // Handled gracefully
      }

      if (editId) {
        try {
          const rec = await insuranceRecordService.getById(Number(editId));
          if (active && rec) {
            setSelectedCustomer(rec.customer || null);
            setCustomerName(rec.customer?.name || "");
            setCustomerPhone(rec.customer?.phone || "");
            setCustomerAddress(rec.customer?.address || "");
            setVehicleType(rec.vehicle?.vehicle_type || "Car");
            setVehicleNumber(rec.vehicle?.vehicle_number || "");
            if (rec.insurance_company?.id) {
              setSelectedCompanyId(rec.insurance_company.id);
            }
            setPolicyNumber(rec.policy_number || "");
            if (rec.entry_date) setEntryDate(rec.entry_date);
            if (rec.policy_start_date) setStartDate(rec.policy_start_date);
            if (rec.policy_expiry_date) setEndDate(rec.policy_expiry_date);
            if (rec.total_premium) setTotalPremium(String(rec.total_premium));
            const loadedPaid =
              typeof rec.total_paid !== "undefined" && rec.total_paid !== null
                ? String(rec.total_paid)
                : rec.paid_amount
                ? String(rec.paid_amount)
                : "";
            if (loadedPaid) setPaidAmount(loadedPaid);
            if (rec.remarks) setRemarks(rec.remarks);
            if (rec.documents && rec.documents.length > 0) {
              setExistingDocName(rec.documents[0].document_name);
            }
          }
        } catch {
          if (active) {
            setErrorMessage("Failed to load existing insurance record details.");
          }
        } finally {
          if (active) setLoadingInitial(false);
        }
      } else {
        if (active) setLoadingInitial(false);
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [editId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced duplicate detection for policy number (trims spaces & compares case-insensitively)
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
          isEditMode && editId ? Number(editId) : undefined
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
        // Handled gracefully in background
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
  }, [policyNumber, isEditMode, editId]);

  // Immediate validation on blur
  const handlePolicyNumberBlur = async () => {
    const trimmed = policyNumber.trim();
    if (!trimmed) return;
    try {
      setCheckingDuplicate(true);
      const res = await insuranceRecordService.checkDuplicatePolicy(
        trimmed,
        isEditMode && editId ? Number(editId) : undefined
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

  // Debounced vehicle active policy check
  useEffect(() => {
    const trimmed = vehicleNumber.trim();
    let active = true;

    const timer = setTimeout(async () => {
      if (!trimmed) {
        if (active) {
          setVehicleCheck(null);
          setVehicleError("");
          setCheckingVehicle(false);
        }
        return;
      }

      setCheckingVehicle(true);
      try {
        const res = await insuranceRecordService.checkVehicle(
          trimmed,
          isEditMode && editId ? Number(editId) : undefined
        );
        if (!active) return;
        setVehicleCheck(res);
        if (res.has_active_policy && res.active_record && !isEditMode) {
          setVehicleError(
            `Active policy #${res.active_record.policy_number} already exists for vehicle "${trimmed}".`
          );
        } else {
          setVehicleError("");
        }

        // Pre-fill vehicle type if vehicle exists and not set
        if (res.exists && res.vehicle_type && (!vehicleType || vehicleType === "Car")) {
          setVehicleType(res.vehicle_type);
        }
        // Pre-fill customer details if empty
        if (res.exists && res.customer_phone && !customerPhone) {
          setCustomerPhone(res.customer_phone);
          if (res.customer_name && !customerName) {
            setCustomerName(res.customer_name);
          }
        }
      } catch {
        // Handled gracefully in background
      } finally {
        if (active) {
          setCheckingVehicle(false);
        }
      }
    }, trimmed ? 400 : 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [vehicleNumber, isEditMode, editId, vehicleType, customerPhone, customerName]);

  const handleVehicleNumberBlur = async () => {
    const trimmed = vehicleNumber.trim();
    if (!trimmed) return;
    try {
      setCheckingVehicle(true);
      const res = await insuranceRecordService.checkVehicle(
        trimmed,
        isEditMode && editId ? Number(editId) : undefined
      );
      setVehicleCheck(res);
      if (res.has_active_policy && res.active_record && !isEditMode) {
        setVehicleError(
          `Active policy #${res.active_record.policy_number} already exists for vehicle "${trimmed}".`
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

  // Calculations for Payment Details
  const numericPremium = parseFloat(totalPremium) || 0;
  const numericPaid = parseFloat(paidAmount) || 0;
  const balanceAmount = Math.max(0, numericPremium - numericPaid);

  // Determine Payment Status
  const paymentStatus = (() => {
    if (!totalPremium && !paidAmount) {
      return "Auto-calculated";
    }
    if (numericPremium <= 0) {
      return "Auto-calculated";
    }
    if (numericPaid >= numericPremium) {
      return "Paid";
    }
    if (numericPaid > 0 && numericPaid < numericPremium) {
      return "Partial";
    }
    return "Unpaid";
  })();

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        setDocumentFile(file);
        setExistingDocName("");
      } else {
        showToast("error", "Invalid File", "Please upload a PDF document.");
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setDocumentFile(file);
      setExistingDocName("");
    }
  };

  const handleRemoveFile = () => {
    setDocumentFile(null);
    setExistingDocName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!customerName.trim()) {
      setErrorMessage("Please enter customer name.");
      return;
    }
    if (!customerPhone.trim()) {
      setErrorMessage("Please enter customer phone number.");
      return;
    }
    if (!vehicleNumber.trim()) {
      setErrorMessage("Please enter vehicle number.");
      return;
    }
    if (!startDate || !endDate) {
      setErrorMessage("Please select valid insurance start and end dates.");
      return;
    }
    if (numericPremium <= 0) {
      setErrorMessage("Please enter a valid total premium amount.");
      return;
    }
    if (numericPaid > numericPremium) {
      setErrorMessage(
        `Paid amount (₹${numericPaid.toLocaleString("en-IN")}) cannot exceed total premium (₹${numericPremium.toLocaleString("en-IN")}).`
      );
      return;
    }

    // Backend requires policy_number; auto-generate standard format if optional field left blank
    const effectivePolicyNumber = policyNumber.trim()
      ? policyNumber.trim()
      : `POL-${Math.floor(10000 + Math.random() * 90000)}-${Math.floor(100 + Math.random() * 900)}A`;

    // Prevent submission if duplicate is detected
    if (duplicateRecord) {
      setErrorMessage(
        `Policy number "${effectivePolicyNumber}" already exists in the system. Please enter a unique policy number.`
      );
      return;
    }

    // Prevent submission if active policy already exists on this vehicle
    if (vehicleCheck?.has_active_policy && vehicleCheck.active_record && !isEditMode) {
      setErrorMessage(
        `Active policy #${vehicleCheck.active_record.policy_number} already exists for vehicle "${vehicleNumber.trim().toUpperCase()}". Please renew or update the existing policy.`
      );
      return;
    }

    setSubmitting(true);
    try {
      // Synchronous double-check before submission
      if (policyNumber.trim()) {
        const dupCheck = await insuranceRecordService.checkDuplicatePolicy(
          effectivePolicyNumber,
          isEditMode && editId ? Number(editId) : undefined
        );
        if (dupCheck.is_duplicate && dupCheck.record) {
          setDuplicateRecord(dupCheck.record);
          const cust = dupCheck.record.customer?.name || "another customer";
          const msg = `Policy number "${effectivePolicyNumber}" is already registered to ${cust}. Policy numbers must be unique.`;
          setPolicyNumberError(msg);
          setErrorMessage(msg);
          setSubmitting(false);
          return;
        }
      }

      // Synchronous vehicle active policy double-check
      if (!isEditMode && vehicleNumber.trim()) {
        const vCheck = await insuranceRecordService.checkVehicle(
          vehicleNumber.trim(),
          isEditMode && editId ? Number(editId) : undefined
        );
        if (vCheck.has_active_policy && vCheck.active_record) {
          setVehicleCheck(vCheck);
          const msg = `Active policy #${vCheck.active_record.policy_number} already exists for vehicle "${vehicleNumber.trim().toUpperCase()}". Please renew or update the existing policy.`;
          setVehicleError(msg);
          setErrorMessage(msg);
          setSubmitting(false);
          return;
        }
      }

      const payload: InsuranceRecordPayload = {
        policy_number: effectivePolicyNumber,
        insurance_company_id: Number(selectedCompanyId) || 1,
        customer_id: selectedCustomer?.id || selectedCustomer?.customer_id,
        create_new_customer: isDifferentPerson,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_address: customerAddress.trim() || undefined,
        vehicle_number: vehicleNumber.trim().toUpperCase(),
        vehicle_type: vehicleType.trim(),
        entry_date: entryDate || getTodayDateString(),
        policy_start_date: startDate,
        policy_expiry_date: endDate,
        total_premium: numericPremium,
        initial_payment: !isEditMode && numericPaid > 0 ? numericPaid : undefined,
        paid_amount: !isEditMode && numericPaid > 0 ? numericPaid : undefined,
        initial_payment_method: "Cash / Online",
        initial_payment_date: !isEditMode && numericPaid > 0 ? getTodayDateString() : undefined,
        remarks: remarks.trim() || undefined,
      };

      let savedRecordId: number;

      if (isEditMode && editId) {
        const updateRes = await insuranceRecordService.update(Number(editId), payload);
        savedRecordId = updateRes.data.id;
        showToast("success", "Record Updated", "Insurance record updated successfully.");
      } else {
        const createRes = await insuranceRecordService.create(payload);
        savedRecordId = createRes.data.id;
        showToast("success", "Record Created", "Insurance record created successfully.");
      }

      // Upload document if attached
      if (documentFile && savedRecordId) {
        try {
          await insuranceDocumentService.upload(savedRecordId, documentFile);
        } catch {
          // Document upload warning
        }
      }

      // In edit mode, record payment transaction if paidAmount increased
      if (isEditMode && savedRecordId) {
        try {
          const freshRec = await insuranceRecordService.getById(savedRecordId);
          const currentPaid = typeof freshRec.total_paid !== "undefined" ? Number(freshRec.total_paid) : (Number(freshRec.paid_amount) || 0);
          if (numericPaid > currentPaid) {
            const diff = numericPaid - currentPaid;
            await paymentService.create({
              recordId: savedRecordId,
              amount: diff,
              payment_method: "Cash / Online",
              payment_date: getTodayDateString(),
              notes: "Payment adjustment",
            });
          }
        } catch {
          // ignore
        }
      }

      // Redirect back to records table after short delay
      setTimeout(() => {
        router.push("/insurance-records");
      }, 700);
    } catch (err: unknown) {
      const errorInfo = extractApiError(err, "An unexpected error occurred while saving the record.");
      setErrorMessage(errorInfo.message);
      if (errorInfo.policyNumberError) {
        setPolicyNumberError(errorInfo.policyNumberError);
        // Attempt to fetch existing record context if not already loaded
        if (!duplicateRecord && effectivePolicyNumber) {
          insuranceRecordService
            .checkDuplicatePolicy(effectivePolicyNumber, isEditMode && editId ? Number(editId) : undefined)
            .then((res) => {
              if (res.is_duplicate && res.record) {
                setDuplicateRecord(res.record);
              }
            })
            .catch(() => {});
        }
      }
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/insurance-records");
  };

  const handleHeaderSearch = (query: string) => {
    if (query.trim()) {
      router.push(`/insurance-records?search=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <DashboardLayout
      title={isEditMode ? "Edit Insurance Record" : "Add Insurance Record"}
      onSearch={handleHeaderSearch}
    >
      <Toast
        open={toast.open}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />

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
        onRenewSuccess={(newRec) => {
          showToast(
            "success",
            "Policy Renewed",
            `Policy #${newRec.policy_number} created successfully. Old policy archived to history.`
          );
          setTimeout(() => {
            router.push("/insurance-records");
          }, 800);
        }}
      />

      <div className="max-w-6xl mx-auto">
        {loadingInitial ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
            <p className="text-xs">Loading record details...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message Box */}
            {errorMessage && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl flex items-center justify-between">
                <span>{errorMessage}</span>
                <button
                  type="button"
                  onClick={() => setErrorMessage("")}
                  className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Card 1: Customer Details with Normalized Phone Lookup */}
            <CustomerLookupSection
              customerName={customerName}
              setCustomerName={setCustomerName}
              customerPhone={customerPhone}
              setCustomerPhone={setCustomerPhone}
              customerAddress={customerAddress}
              setCustomerAddress={setCustomerAddress}
              selectedCustomer={selectedCustomer}
              setSelectedCustomer={setSelectedCustomer}
              isDifferentPerson={isDifferentPerson}
              setIsDifferentPerson={setIsDifferentPerson}
            />

            {/* Card 2: Vehicle Details */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
              <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">
                Vehicle Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Vehicle Type
                  </label>
                  <div className="relative">
                    <select
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      className="w-full pl-3.5 pr-9 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                    >
                      <option value="Car">Car</option>
                      <option value="Bike">Bike / Two-Wheeler</option>
                      <option value="Commercial">Commercial Vehicle</option>
                      <option value="Bus">Bus</option>
                      <option value="Truck">Truck</option>
                      <option value="Auto Rickshaw">Auto Rickshaw</option>
                      <option value="Tractor">Tractor / Agriculture</option>
                      <option value="Other">Other</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Vehicle Number
                    </label>
                    {checkingVehicle && (
                      <span className="flex items-center gap-1.5 text-[11px] text-blue-600 font-medium">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Checking vehicle...</span>
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={vehicleNumber}
                      onChange={(e) => {
                        setVehicleNumber(e.target.value.toUpperCase());
                        if (vehicleError) setVehicleError("");
                      }}
                      onBlur={handleVehicleNumberBlur}
                      placeholder="MH-12-AB-1234"
                      className={`w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border rounded-xl text-slate-800 placeholder:text-slate-400 font-mono uppercase focus:outline-none focus:ring-2 transition-colors ${
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
                  {!vehicleCheck && vehicleError && (
                    <p className="mt-1.5 text-xs text-red-600 font-medium">
                      {vehicleError}
                    </p>
                  )}
                </div>

                {/* Vehicle Active Policy Alert / Expired Policy Notice */}
                {vehicleCheck && (
                  <div className="md:col-span-2">
                    <VehicleActivePolicyAlert
                      vehicleNumber={vehicleNumber}
                      vehicleCheck={vehicleCheck}
                      onUpdatePolicy={(activeRec) => {
                        router.push(`/insurance-records/new?id=${activeRec.id}`);
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

            {/* Card 3: Insurance Details */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
              <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">
                Insurance Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Insurance Company
                  </label>
                  <div className="relative">
                    <select
                      value={selectedCompanyId}
                      onChange={(e) => setSelectedCompanyId(e.target.value)}
                      className="w-full pl-3.5 pr-9 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
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
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Policy Number <span className="text-slate-400 font-normal text-xs ml-1">(Optional - auto-generated if left blank)</span>
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
                      value={policyNumber}
                      onChange={(e) => {
                        setPolicyNumber(e.target.value);
                        if (errorMessage) setErrorMessage("");
                      }}
                      onBlur={handlePolicyNumberBlur}
                      placeholder="Enter policy number (e.g. POL-99283-772A)"
                      className={`w-full pl-3.5 pr-9 py-2.5 text-xs sm:text-sm bg-white border rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
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

                  {/* Duplicate Alert Card with Context and View Existing Record Button */}
                  {duplicateRecord && (
                    <PolicyDuplicateAlert
                      policyNumber={policyNumber}
                      duplicateRecord={duplicateRecord}
                      onViewExisting={() => setIsViewModalOpen(true)}
                    />
                  )}

                  {/* Policy number error if not already displayed in alert */}
                  {!duplicateRecord && policyNumberError && (
                    <p className="mt-1.5 text-xs text-red-600 font-medium">
                      {policyNumberError}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Insurance Start Date <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer transition-colors"
                    />
                    <CalendarIcon className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Insurance End Date <span className="text-red-500">*</span>
                    </label>
                    {startDate && (
                      <span className="text-[11px] text-emerald-600 font-medium">+1 Year Auto</span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer transition-colors"
                    />
                    <CalendarIcon className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Payment Details */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
              <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">
                Payment Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Total Premium
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs sm:text-sm font-medium">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={totalPremium}
                      onChange={(e) => setTotalPremium(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Paid Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs sm:text-sm font-medium">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max={numericPremium > 0 ? numericPremium : undefined}
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Balance Amount
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={
                      totalPremium
                        ? `₹ ${balanceAmount.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        : ""
                    }
                    placeholder="Auto: Premium - Paid"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-600 placeholder:text-slate-400 font-medium cursor-not-allowed select-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Payment Status
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={totalPremium ? paymentStatus : ""}
                    placeholder="Auto-calculated"
                    className={`w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium cursor-not-allowed select-none ${
                      paymentStatus === "Paid"
                        ? "text-emerald-700 font-semibold"
                        : paymentStatus === "Partial"
                        ? "text-amber-700 font-semibold"
                        : paymentStatus === "Unpaid"
                        ? "text-red-700 font-semibold"
                        : "text-slate-600 placeholder:text-slate-400"
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Card 5: Documents */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
              <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">
                Documents
              </h2>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragOver
                    ? "border-blue-500 bg-blue-50/50"
                    : "border-slate-200/90 hover:border-blue-400 bg-slate-50/40 hover:bg-slate-50/80"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept=".pdf,application/pdf"
                  className="hidden"
                />
                <UploadCloud className="w-8 h-8 text-slate-400 stroke-[1.5] mb-2" />
                <p className="text-xs sm:text-sm text-slate-700 font-medium">
                  Drag &amp; drop PDF, or{" "}
                  <span className="text-blue-600 hover:underline">click to browse</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">(Max 10MB)</p>
              </div>

              {/* Uploaded File Chip / Badge */}
              {(documentFile || existingDocName) && (
                <div className="pt-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100/90 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 shadow-2xs">
                    <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate max-w-xs">
                      {documentFile ? documentFile.name : existingDocName}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile();
                      }}
                      className="p-0.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer transition-colors"
                      title="Remove file"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Card 6: Notes */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
              <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">
                Notes
              </h2>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Remarks
                </label>
                <textarea
                  rows={4}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Additional notes about this record..."
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-none"
                />
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between pt-3 pb-10">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting || Boolean(vehicleCheck?.has_active_policy && !isEditMode)}
                title={
                  vehicleCheck?.has_active_policy && !isEditMode
                    ? "Active policy already exists for this vehicle. Please Renew or Update."
                    : undefined
                }
                className="px-7 py-2.5 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center min-w-[140px]"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </span>
                ) : vehicleCheck?.has_active_policy && !isEditMode ? (
                  "Active Policy Exists"
                ) : isEditMode ? (
                  "Update Record"
                ) : (
                  "Save Record"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function AddInsuranceRecordPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout title="Add Insurance Record">
          <div className="py-24 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
            <p className="text-xs">Loading...</p>
          </div>
        </DashboardLayout>
      }
    >
      <AddInsuranceRecordForm />
    </Suspense>
  );
}

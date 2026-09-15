"use client";

import React, { useState } from "react";
import { X, Calendar as CalendarIcon, Building2, User, Car } from "lucide-react";
import { InsuranceCompany, InsuranceRecordItem } from "@/lib/api";

interface InsuranceRecordFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordToEdit: InsuranceRecordItem | null;
  companies: InsuranceCompany[];
  onSave: (formData: {
    policy_number: string;
    insurance_company_id: number;
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
  const [customerEmail, setCustomerEmail] = useState(
    () => recordToEdit?.customer?.email || ""
  );
  const [customerAddress, setCustomerAddress] = useState(
    () => recordToEdit?.customer?.address || ""
  );

  const [vehicleNumber, setVehicleNumber] = useState(
    () => recordToEdit?.vehicle?.vehicle_number || ""
  );
  const [vehicleType, setVehicleType] = useState(
    () => recordToEdit?.vehicle?.vehicle_type || "SUV (Mahindra XUV700)"
  );

  const [startDate, setStartDate] = useState(() => {
    if (recordToEdit?.policy_start_date) return recordToEdit.policy_start_date;
    return new Date().toISOString().split("T")[0];
  });

  const [expiryDate, setExpiryDate] = useState(() => {
    if (recordToEdit?.policy_expiry_date) return recordToEdit.policy_expiry_date;
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    return nextYear.toISOString().split("T")[0];
  });

  const [totalPremium, setTotalPremium] = useState<number | string>(
    () => recordToEdit?.total_premium ?? ""
  );
  const [remarks, setRemarks] = useState(() => recordToEdit?.remarks || "");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!policyNumber.trim()) {
      setErrorMsg("Policy number is required.");
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMsg("Customer name and phone are required.");
      return;
    }
    if (!vehicleNumber.trim()) {
      setErrorMsg("Vehicle number is required.");
      return;
    }
    if (!startDate || !expiryDate) {
      setErrorMsg("Start date and expiry date are required.");
      return;
    }
    const numPremium = parseFloat(String(totalPremium));
    if (isNaN(numPremium) || numPremium <= 0) {
      setErrorMsg("Please enter a valid total premium amount.");
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        policy_number: policyNumber.trim(),
        insurance_company_id: Number(companyId) || (companies[0]?.id ?? 1),
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim() || undefined,
        customer_address: customerAddress.trim() || undefined,
        vehicle_number: vehicleNumber.trim().toUpperCase(),
        vehicle_type: vehicleType.trim(),
        policy_start_date: startDate,
        policy_expiry_date: expiryDate,
        total_premium: numPremium,
        remarks: remarks.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("An unexpected error occurred. Please try again.");
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
          {/* Section 1: Customer Details */}
          <div>
            <div className="flex items-center gap-2 mb-3 text-slate-900 font-bold text-xs uppercase tracking-wider">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Customer Details</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Residential Address
                </label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="e.g. Flat 402, Signet Heights, Navi Mumbai"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Vehicle Information */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-3 text-slate-900 font-bold text-xs uppercase tracking-wider">
              <Car className="w-3.5 h-3.5 text-blue-600" />
              <span>Vehicle Information</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vehicle Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. MH-12-PQ-9876"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl font-mono uppercase text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
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
            </div>
          </div>

          {/* Section 3: Policy & Financials */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-3 text-slate-900 font-bold text-xs uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Policy &amp; Premium Details</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Policy Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={policyNumber}
                  onChange={(e) => setPolicyNumber(e.target.value)}
                  placeholder="e.g. POL-99283-772A"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
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
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  />
                  <CalendarIcon className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expiry Date <span className="text-red-500">*</span>
                </label>
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
              disabled={submitting}
              className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center min-w-[120px]"
            >
              {submitting ? "Saving..." : recordToEdit ? "Update Record" : "Create Record"}
            </button>
          </div>
        </form>
      </div>
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

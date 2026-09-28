"use client";

import React, { useState } from "react";
import { AlertCircle, CheckCircle2, KeyRound, Loader2, Lock, Printer, X } from "lucide-react";
import { settingsService } from "@/lib/api";

interface ExportPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
  requireConfirmation?: boolean;
  confirmationLabel?: string;
}

export function ExportPinModal({
  isOpen,
  onClose,
  onSuccess,
  title = "Security Verification Required",
  description = "Enter your Export Security PIN to authorize downloading or printing records.",
  requireConfirmation = false,
  confirmationLabel = "Open Print Dialog",
}: ExportPinModalProps) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setErrorMessage("Please enter your PIN.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await settingsService.verifyExportPin(pin.trim());
      if (res.success) {
        if (requireConfirmation) {
          setVerified(true);
        } else {
          onSuccess();
        }
      } else {
        if (res.pin_not_set) {
          onSuccess();
          return;
        }
        setErrorMessage(res.message || "Incorrect PIN. Please try again.");
      }
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { pin_not_set?: boolean; message?: string } };
        message?: string;
      };
      const respData = err?.response?.data;
      if (respData?.pin_not_set) {
        onSuccess();
        return;
      }
      setErrorMessage(
        respData?.message || err?.message || "Failed to verify PIN. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header decoration */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {title}
                </h3>
                <p className="text-xs text-blue-100/90 mt-0.5">
                  Authorized Access Required
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-xs text-slate-600 mb-5 leading-relaxed">
            {description}
          </p>

          {verified ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <h4 className="text-sm font-bold">PIN verified</h4>
                  <p className="mt-1 text-xs leading-relaxed">
                    Click the button below to open the browser print dialog. Choose
                    <strong> Save as PDF</strong> to download a PDF, or select a printer to print all records.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSuccess}
                  className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>{confirmationLabel}</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs animate-in shake duration-200">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <span className="font-medium">{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Export Security PIN
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    autoFocus
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={8}
                    required
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Enter Security PIN"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-center sm:text-left"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Upon verification, the requested records will be prepared and an audit alert will be dispatched to the agency business email.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !pin.trim()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50 min-h-[38px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying PIN...</span>
                    </>
                  ) : (
                    <span>Verify &amp; Proceed</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

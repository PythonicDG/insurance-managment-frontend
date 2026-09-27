"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Mail,
  KeyRound,
  Loader2,
  X,
  AlertCircle,
  CheckCircle2,
  Lock,
  RefreshCw,
} from "lucide-react";
import { settingsService } from "@/lib/api";

interface SetExportPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  businessEmail: string;
  isCurrentlySet: boolean;
}

export function SetExportPinModal({
  isOpen,
  onClose,
  onSuccess,
  businessEmail,
  isCurrentlySet,
}: SetExportPinModalProps) {
  const [step, setStep] = useState<"request" | "verify">("request");
  const [otp, setOtp] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep("request");
      setOtp("");
      setNewPin("");
      setConfirmPin("");
      setErrorMessage(null);
      setCountdown(0);
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  if (!isOpen) return null;

  const handleRequestOtp = async () => {
    if (!businessEmail || !businessEmail.trim()) {
      setErrorMessage("No business email configured. Please enter and save an email address first.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await settingsService.requestPinOtp();
      if (res.success) {
        setStep("verify");
        setCountdown(60);
      } else {
        setErrorMessage(res.message || "Could not send verification code.");
      }
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || err?.message || "Failed to send verification code."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || resending) return;
    try {
      setResending(true);
      setErrorMessage(null);
      const res = await settingsService.requestPinOtp();
      if (res.success) {
        setCountdown(60);
      } else {
        setErrorMessage(res.message || "Could not resend code.");
      }
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || err?.message || "Failed to resend code."
      );
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!otp.trim()) {
      setErrorMessage("Please enter the 6-digit verification code from your email.");
      return;
    }
    if (!newPin.trim() || newPin.trim().length < 4 || newPin.trim().length > 8) {
      setErrorMessage("PIN must be between 4 and 8 digits.");
      return;
    }
    if (newPin.trim() !== confirmPin.trim()) {
      setErrorMessage("New PIN and Confirm PIN do not match.");
      return;
    }

    try {
      setLoading(true);
      const res = await settingsService.setExportPin({
        otp: otp.trim(),
        new_pin: newPin.trim(),
        confirm_pin: confirmPin.trim(),
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage(res.message || "Failed to update PIN.");
      }
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || err?.message || "Failed to update PIN."
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
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {isCurrentlySet ? "Change Export Security PIN" : "Set Export Security PIN"}
                </h3>
                <p className="text-xs text-blue-100/90 mt-0.5">
                  Email OTP Authorization Required
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
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs mb-4">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {step === "request" ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <span>Authorized Recipient Email</span>
                </div>
                <p className="text-sm font-semibold text-blue-700 font-mono break-all">
                  {businessEmail || "No email configured"}
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  To ensure only authorized administrators can configure or reset the PIN, a 6-digit one-time verification code will be dispatched to this email address.
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
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={loading || !businessEmail}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50 min-h-[38px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending Code...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-3.5 h-3.5" />
                      <span>Send Verification Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200/80 text-xs text-blue-900 flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="font-semibold">Code sent to your email!</p>
                  <p className="text-blue-700 text-[11px]">
                    Check <span className="font-mono font-medium">{businessEmail}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={countdown > 0 || resending}
                  className="shrink-0 text-blue-600 hover:text-blue-800 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {resending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  <span>{countdown > 0 ? `Resend (${countdown}s)` : "Resend"}</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  6-Digit Verification Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter 6-digit code"
                  className="w-full px-3.5 py-2.5 text-center text-base tracking-widest font-mono font-bold bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    New Security PIN <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    maxLength={8}
                    required
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="4-8 digits"
                    className="w-full px-3.5 py-2 text-sm text-center font-mono tracking-wider bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Confirm PIN <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    maxLength={8}
                    required
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    placeholder="Re-enter PIN"
                    className="w-full px-3.5 py-2 text-sm text-center font-mono tracking-wider bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                This PIN will be required anytime a user attempts to export CSVs or download/print records.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setStep("request")}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !otp || !newPin || !confirmPin}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50 min-h-[38px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving PIN...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verify &amp; Save PIN</span>
                    </>
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

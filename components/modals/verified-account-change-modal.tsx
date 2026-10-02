"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2, X, Eye, EyeOff } from "lucide-react";
import axios from "axios";
import { authService } from "@/lib/api";

export type ChangePurpose = "password" | "email" | "phone" | "account_email";

export function VerifiedAccountChangeModal({ purpose, onClose, onSuccess }: {
  purpose: ChangePurpose;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"send" | "verify" | "change" | "success">("send");
  const [recipient, setRecipient] = useState("");
  const [otp, setOtp] = useState("");
  const [token, setToken] = useState("");
  const [value, setValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const label = { password: "Password", email: "Agency Email", phone: "Phone Number", account_email: "Account Email" }[purpose];
  const inputClass = "w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:opacity-50";
  const buttonClass = "px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 inline-flex items-center justify-center gap-2";

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try { await action(); } catch (err) {
      let message = "Unable to complete this change. Please try again.";
      if (axios.isAxiosError(err)) {
        const data = err.response?.data;
        if (typeof data?.message === "string") message = data.message;
        else if (typeof data?.detail === "string") message = data.detail;
        else if (data && typeof data === "object") {
          const messages = Object.values(data).flat().filter((item): item is string => typeof item === "string");
          if (messages.length) message = messages.join(" ");
        }
      }
      setError(message);
    } finally { setBusy(false); }
  }

  async function sendOtp() {
    if (Date.now() < resendAt) { setError("Please wait 60 seconds before resending the OTP."); return; }
    await run(async () => {
      const data = await authService.requestChangeOtp(purpose);
      setRecipient(data.recipient);
      setOtp("");
      setToken("");
      setStep("verify");
      setResendAt(Date.now() + 60000);
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (step === "send") { await sendOtp(); return; }
    if (step === "verify") {
      await run(async () => {
        const data = await authService.verifyChangeOtp(purpose, otp);
        setToken(data.verification_token);
        setStep("change");
      });
      return;
    }
    if (purpose === "password" && value !== confirm) { setError("New password and confirmation do not match."); return; }
    await run(async () => {
      const data = purpose === "password"
        ? await authService.changePassword({ verification_token: token, new_password: value, confirm_password: confirm })
        : await authService.changeContact({ purpose, verification_token: token, new_value: value.trim() });
      if (purpose === "password") {
        for (const storage of [sessionStorage, localStorage]) {
          for (const key of ["insure_token", "insure_user", "insure_last_activity"]) storage.removeItem(key);
        }
        setStep("success");
        onSuccess?.(data.message);
      } else {
        onSuccess?.(data.message);
        onClose();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div role="dialog" aria-modal="true" aria-labelledby="verified-change-title" className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 id="verified-change-title" className="font-bold text-slate-900 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-blue-600" />Change {label}</h3>
          <button type="button" disabled={busy} onClick={onClose} aria-label="Close modal" className="p-2 text-slate-500"><X className="w-4 h-4" /></button>
        </div>
        {step === "success" ? (
          <div className="mt-5 space-y-4">
            <p role="status" className="text-sm text-emerald-700">Your password has been changed. Please log in with your new password.</p>
            <button className={buttonClass} onClick={() => { onClose(); router.push("/"); }}>Go to Login</button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            {error && <p role="alert" className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</p>}
            {step === "send" && <p className="text-sm text-slate-600">First, verify a code sent to your saved email address. You can then enter your new {label.toLowerCase()}.</p>}
            {step === "verify" && <>
              <p className="text-sm text-slate-600">Enter the 6-digit OTP sent to <strong>{recipient}</strong>. The code expires in 10 minutes.</p>
              <label className="block text-xs font-semibold text-slate-700" htmlFor="change-otp">Email OTP</label>
              <input id="change-otp" autoFocus required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))} disabled={busy} className={inputClass} />
              <button type="button" onClick={sendOtp} disabled={busy} className="text-sm text-blue-600">Resend OTP (after 60 seconds)</button>
            </>}
            {step === "change" && <>
              <p className="text-sm text-emerald-700">Email verified. Enter your new {label.toLowerCase()}.</p>
              <label htmlFor="new-account-value" className="block text-xs font-semibold text-slate-700">New {label}</label>
              <input id="new-account-value" autoFocus required disabled={busy} type={purpose === "password" ? (showPassword ? "text" : "password") : purpose === "phone" ? "tel" : "email"} autoComplete={purpose === "password" ? "new-password" : "off"} minLength={purpose === "password" ? 8 : undefined} maxLength={purpose === "phone" ? 30 : undefined} value={value} onChange={e => setValue(e.target.value)} className={inputClass} />
              {purpose === "password" && <>
                <label htmlFor="confirm-account-password" className="block text-xs font-semibold text-slate-700">Confirm New Password</label>
                <input id="confirm-account-password" required disabled={busy} type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)} className={inputClass} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="flex items-center gap-2 text-xs text-slate-600">{showPassword ? <EyeOff size={14} /> : <Eye size={14} />}{showPassword ? "Hide passwords" : "Show passwords"}</button>
                <p className="text-xs text-slate-500">Use at least 8 characters. You will need to log in again after saving.</p>
              </>}
              <button type="button" disabled={busy} onClick={() => { setToken(""); setValue(""); setConfirm(""); setError(""); setStep("send"); }} className="text-xs text-blue-600">Request a new OTP</button>
            </>}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" disabled={busy} onClick={onClose} className="text-sm text-slate-600 px-3">Cancel</button>
              <button type="submit" disabled={busy} className={buttonClass}>{busy && <Loader2 className="w-4 h-4 animate-spin" />}{step === "send" ? "Send Email OTP" : step === "verify" ? "Verify OTP" : `Save ${label}`}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

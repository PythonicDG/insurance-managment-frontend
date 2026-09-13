"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Lock, Eye, EyeOff, Loader2, ArrowLeft, ShieldCheck } from "lucide-react";
import axios from "axios";
import { AuthBrandPanel } from "@/components/layout/auth-brand-panel";
import { Toast, ToastType } from "@/components/ui/toast";

export default function ChangePasswordPage() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Toast state
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!oldPassword) {
      setErrorMessage("Please enter your current password.");
      return;
    }

    if (!newPassword) {
      setErrorMessage("Please enter your new password.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("New password and confirmation do not match.");
      return;
    }

    setLoading(true);

    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("insure_token")
          : null;

      if (!token) {
        throw new Error(
          "You must be logged in to change your password. Please log in first."
        );
      }

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Token ${token}`,
      };

      const payload = {
        old_password: oldPassword,
        new_password: newPassword,
      };

      let response;
      try {
        response = await axios.post("/api/auth/change-password/", payload, {
          headers,
          timeout: 10000,
        });
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && (!err.response || err.code === "ECONNREFUSED")) {
          response = await axios.post(
            "http://127.0.0.1:8000/api/auth/change-password/",
            payload,
            { headers, timeout: 10000 }
          );
        } else {
          throw err;
        }
      }

      if (response && response.status === 200) {
        // Clear old token since backend deletes token on password change
        if (typeof window !== "undefined") {
          localStorage.removeItem("insure_token");
        }

        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");

        setToast({
          open: true,
          type: "success",
          title: "Password Updated",
          message:
            response.data?.message ||
            "Password changed successfully. Please log in with your new password.",
        });
      }
    } catch (err: unknown) {
      let msg = "Failed to update password. Please check your current password.";
      if (axios.isAxiosError(err) && err.response) {
        const resData = err.response.data;
        if (typeof resData === "string") {
          msg = resData;
        } else if (resData?.old_password?.length) {
          msg = resData.old_password[0];
        } else if (resData?.new_password?.length) {
          msg = resData.new_password[0];
        } else if (resData?.detail) {
          msg = resData.detail;
        } else if (resData?.message) {
          msg = resData.message;
        }
      } else if (err instanceof Error) {
        msg = err.message;
      }

      setErrorMessage(msg);
      setToast({
        open: true,
        type: "error",
        title: "Change Password Failed",
        message: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col lg:flex-row bg-white font-sans text-slate-900">
      <Toast
        open={toast.open}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />

      {/* Left Brand Panel */}
      <AuthBrandPanel />

      {/* Right Change Password Form */}
      <section className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-[420px]">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Login</span>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Change Password
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Update your password to keep your insurance ledger account secure.
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-lg bg-red-50 border border-red-200/80 text-xs text-red-700 leading-relaxed">
              {errorMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleChangePassword} className="space-y-5" noValidate>
            {/* Current Password */}
            <div>
              <label
                htmlFor="old_password"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Current Password
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="old_password"
                  name="old_password"
                  type={showOld ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                  disabled={loading}
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition disabled:bg-slate-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-none p-1 rounded transition cursor-pointer"
                  aria-label={showOld ? "Hide password" : "Show password"}
                >
                  {showOld ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label
                htmlFor="new_password"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                New Password
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="new_password"
                  name="new_password"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                  disabled={loading}
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition disabled:bg-slate-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-none p-1 rounded transition cursor-pointer"
                  aria-label={showNew ? "Hide password" : "Show password"}
                >
                  {showNew ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label
                htmlFor="confirm_password"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Confirm New Password
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="confirm_password"
                  name="confirm_password"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  required
                  disabled={loading}
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition disabled:bg-slate-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-none p-1 rounded transition cursor-pointer"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-all duration-150 shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

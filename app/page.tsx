"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, Loader2, Info } from "lucide-react";
import axios from "axios";
// import { AuthBrandPanel } from "@/components/layout/auth-brand-panel";
import { Toast, ToastType } from "@/components/ui/toast";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("insure_remember_user") || "";
      } catch {
        return "";
      }
    }
    return "";
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return Boolean(localStorage.getItem("insure_remember_user"));
      } catch {
        return false;
      }
    }
    return false;
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

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

  // Check URL query param for inactivity or session expiry & redirect if already authenticated
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const params = new URLSearchParams(window.location.search);
        const reason = params.get("reason");
        if (reason === "inactivity") {
          setInfoMessage(
            "You were automatically logged out after 5 minutes of inactivity."
          );
        } else if (reason === "session_expired") {
          setInfoMessage(
            "Your session has expired. Please sign in again to continue."
          );
        }

        const token = sessionStorage.getItem("insure_token");
        const lastActivityStr = sessionStorage.getItem("insure_last_activity");
        const lastActivity = lastActivityStr
          ? parseInt(lastActivityStr, 10)
          : 0;
        const isExpired =
          !lastActivity || Date.now() - lastActivity > 5 * 60 * 1000;

        // Only redirect to dashboard if authenticated and active within 5 minutes
        if (token && !reason && !isExpired) {
          router.replace("/dashboard");
        } else if (token && isExpired) {
          sessionStorage.removeItem("insure_token");
          sessionStorage.removeItem("insure_user");
          sessionStorage.removeItem("insure_last_activity");
        }
      } catch {
        // Ignore storage error
      }
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    const trimmedUser = username.trim();
    if (!trimmedUser) {
      setErrorMessage("Please enter your username or email.");
      return;
    }

    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const isEmail = /@/.test(trimmedUser);
      const payload = isEmail
        ? {
            email: trimmedUser,
            password: password,
          }
        : {
            username: trimmedUser,
            password: password,
          };

      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login/`, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      });

      if (response && response.status === 200) {
        const data = response.data;
        const token = data.token;
        const user = data.user;

        // Persist token & user in sessionStorage so session is tied to the window/tab lifecycle.
        // When user closes the window or tab, sessionStorage is cleared automatically.
        if (typeof window !== "undefined") {
          if (token) {
            sessionStorage.setItem("insure_token", token);
            localStorage.removeItem("insure_token");
          }
          if (user) {
            sessionStorage.setItem("insure_user", JSON.stringify(user));
            localStorage.removeItem("insure_user");
          }
          sessionStorage.setItem("insure_last_activity", Date.now().toString());
          localStorage.removeItem("insure_last_activity");

          if (rememberMe) {
            localStorage.setItem("insure_remember_user", trimmedUser);
          } else {
            localStorage.removeItem("insure_remember_user");
          }
        }

        setToast({
          open: true,
          type: "success",
          title: "Welcome back!",
          message: data.message || "Logged in successfully. Redirecting to dashboard...",
        });

        setTimeout(() => {
          router.push("/dashboard");
        }, 350);
      }
    } catch (err: unknown) {
      let msg = "Invalid username or password. Please try again.";
      if (axios.isAxiosError(err) && err.response) {
        const resData = err.response.data;
        if (typeof resData === "string") {
          msg = resData;
        } else if (resData?.non_field_errors?.length) {
          msg = resData.non_field_errors[0];
        } else if (resData?.detail) {
          msg = resData.detail;
        } else if (resData?.message) {
          msg = resData.message;
        } else if (resData?.username?.length) {
          msg = resData.username[0];
        } else if (resData?.password?.length) {
          msg = resData.password[0];
        }
      } else if (axios.isAxiosError(err) && err.code === "ECONNABORTED") {
        msg = "Request timed out. Please check if backend server is running.";
      } else if (axios.isAxiosError(err) && err.message) {
        msg = err.message;
      }

      setErrorMessage(msg);
      setToast({
        open: true,
        type: "error",
        title: "Login Failed",
        message: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-50 lg:bg-white font-sans text-slate-900">
      {/* Toast Notification in top-right corner */}
      <Toast
        open={toast.open}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />

      {/* Brand Panel: Compact Header on Mobile, Rich Side Panel on Desktop */}
      {/* <AuthBrandPanel /> */}

      {/* Login Form Section */}
      <section className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12 xl:p-16">
        <div className="w-full max-w-[420px] bg-white lg:bg-transparent p-6 sm:p-8 lg:p-0 rounded-2xl shadow-xs lg:shadow-none border border-slate-200/80 lg:border-0 my-auto">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Admin Login
            </h2>
            {/* <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
              Sign in to manage your policy portfolio, customer ledgers, and reports.
            </p> */}
          </div>

          {/* Inactivity / Session Expiry Info Alert */}
          {infoMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-800 leading-relaxed flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200/80 text-xs text-red-700 leading-relaxed">
              {errorMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5" noValidate>
            {/* Username / Email */}
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Username or Email
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="you@company.com"
                  required
                  disabled={loading}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition disabled:bg-slate-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  disabled={loading}
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition disabled:bg-slate-50 disabled:cursor-not-allowed font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-none p-1.5 rounded-lg transition cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between pt-0.5 flex-wrap gap-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer accent-blue-600"
                />
                <span className="text-xs text-slate-600 font-normal">
                  Remember me
                </span>
              </label>

              <Link
                href="/change-password"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 transition"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-all duration-150 shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed min-h-[44px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Log In to Dashboard</span>
                )}
              </button>
            </div>
          </form>

          {/* Admin Note */}
          {/* <div className="mt-6 sm:mt-8 flex items-start gap-2 text-slate-500 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none border border-slate-200/60 sm:border-0">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
            <p className="text-xs leading-relaxed text-slate-500">
              Single business owner / admin access. Contact support for account issues.
            </p>
          </div> */}
        </div>
      </section>
    </main>
  );
}

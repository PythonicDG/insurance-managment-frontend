"use client";

import React from "react";
import { Clock, LogOut, ShieldAlert } from "lucide-react";

interface SessionTimeoutModalProps {
  isOpen: boolean;
  remainingSeconds: number;
  onStayLoggedIn: () => void;
  onLogout: () => void;
}

export function SessionTimeoutModal({
  isOpen,
  remainingSeconds,
  onStayLoggedIn,
  onLogout,
}: SessionTimeoutModalProps) {
  if (!isOpen) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-timeout-title"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 flex flex-col items-center text-center">
        {/* Animated Warning Icon */}
        <div className="relative mb-5">
          <div className="w-16 h-16 rounded-full bg-amber-50 border-4 border-amber-100 flex items-center justify-center text-amber-600">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full p-1 text-white shadow">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>

        {/* Title & Description */}
        <h3
          id="session-timeout-title"
          className="text-xl font-bold text-slate-800 tracking-tight"
        >
          Session Inactivity Warning
        </h3>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-sm">
          You have been away for nearly 5 minutes. For security reasons, your
          session will automatically log out in:
        </p>

        {/* Countdown Badge */}
        <div className="my-5 px-6 py-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-center justify-center space-x-2">
          <span className="text-2xl font-mono font-bold text-amber-700">
            {formattedTime}
          </span>
          <span className="text-xs font-medium text-amber-600 uppercase tracking-wider">
            seconds left
          </span>
        </div>

        <p className="text-xs text-slate-400 mb-6">
          Click &quot;Stay Logged In&quot; to continue your work or you will be
          safely logged out.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 w-full">
          <button
            type="button"
            onClick={onLogout}
            className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Log Out Now
          </button>
          <button
            type="button"
            onClick={onStayLoggedIn}
            className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-600/20 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  );
}

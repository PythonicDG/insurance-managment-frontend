"use client";

import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastProps {
  open: boolean;
  type?: ToastType;
  title: string;
  message?: string;
  onClose: () => void;
  duration?: number;
}

export function Toast({
  open,
  type = "success",
  title,
  message,
  onClose,
  duration = 5000,
}: ToastProps) {
  useEffect(() => {
    if (!open) return;
    if (duration <= 0) return;

    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [open, duration, onClose]);

  if (!open) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
    error: <AlertCircle className="w-5 h-5 text-red-600" />,
    info: <Info className="w-5 h-5 text-blue-600" />,
  };

  const badgeBg = {
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
    error: "bg-red-50 border-red-200 text-red-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
  };

  const borderAccent = {
    success: "border-l-4 border-l-emerald-500",
    error: "border-l-4 border-l-red-500",
    info: "border-l-4 border-l-blue-500",
  };

  return (
    <div className="fixed top-5 right-5 z-50 flex items-start max-w-sm w-full animate-in fade-in slide-in-from-top-4 duration-300">
      <div
        className={`w-full bg-white rounded-xl shadow-xl border border-slate-200/90 ${borderAccent[type]} p-4 flex items-start gap-3 transition-all`}
        role="alert"
      >
        <div className={`p-1.5 rounded-full shrink-0 ${badgeBg[type]}`}>
          {icons[type]}
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          {message && (
            <p className="text-xs text-slate-600 mt-1 leading-relaxed break-words">
              {message}
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          type="button"
          className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors shrink-0 -mr-1 -mt-1 cursor-pointer"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

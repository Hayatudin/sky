"use client";

import React from "react";
import { useUIStore, Toast } from "../hooks/useUIStore";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

export default function ToastContainer() {
  const toasts = useUIStore((state) => state.toasts);
  const removeToast = useUIStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      {toasts.map((toast: Toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 p-4 rounded-xl backdrop-blur-md border shadow-lg transition-all duration-300 transform translate-x-0 animate-toast pointer-events-auto ${
            toast.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : toast.type === "error"
              ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
              : "bg-blue-500/10 border-blue-500/20 text-blue-400"
          }`}
        >
          <div className="flex-shrink-0 mt-0.5">
            {toast.type === "success" && <CheckCircle2 className="w-5 h-5" />}
            {toast.type === "error" && <AlertTriangle className="w-5 h-5" />}
            {toast.type === "info" && <Info className="w-5 h-5" />}
          </div>
          <div className="flex-grow text-sm font-medium">{toast.message}</div>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 hover:opacity-75 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

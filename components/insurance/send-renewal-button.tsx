"use client";
import { useState } from "react";
import { whatsAppService } from "@/lib/api";

export function SendRenewalButton({ recordId, disabled = false }: { recordId: number; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const send = async () => {
    setBusy(true);
    try { setNotice((await whatsAppService.sendRenewal(recordId)).message); }
    catch (error: unknown) {
      const detail = error as { response?: { data?: { error?: string } } };
      setNotice(detail.response?.data?.error || "Could not queue reminder.");
    } finally { setBusy(false); }
  };
  return <div className="inline-block max-w-52 text-left">
    <button type="button" disabled={busy || disabled} onClick={e => { e.stopPropagation(); void send(); }}
      className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs font-semibold text-emerald-800 disabled:opacity-50">
      {busy ? "Queueing…" : "Send WhatsApp Renewal"}
    </button>
    {notice && <p role="status" className="mt-1 whitespace-normal text-[11px] text-slate-600">{notice}</p>}
  </div>;
}

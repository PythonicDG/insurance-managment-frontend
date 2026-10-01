"use client";
import { useState } from "react";
import { WhatsAppConfig, whatsAppService } from "@/lib/api";

export const renewalDefaults: Partial<WhatsAppConfig> = {
  renewal_enabled: false, renewal_send_time: "10:30", renewal_skip_sundays: true,
  renewal_skip_holidays: true, renewal_holidays: [], renewal_stages: [30, 15, 7, 2, 0],
  renewal_daily_cap: 100, renewal_language: "en",
};
const stages = [[30, "Awareness & NCB review"], [15, "Quotation & comparison"],
  [7, "Urgent follow-up"], [2, "Final reminder"], [0, "Expiry-day alert"]] as const;
const times = [...Array.from({ length: 24 }, (_, i) => 600 + i * 5),
  ...Array.from({ length: 18 }, (_, i) => 990 + i * 5)].map(minutes =>
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`);

export function RenewalReminderSettings({ value, onChange }: {
  value: Partial<WhatsAppConfig>; onChange: (value: Partial<WhatsAppConfig>) => void;
}) {
  const [stage, setStage] = useState(30);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const sendTest = async () => {
    setSending(true);
    try { setNotice((await whatsAppService.sendRenewalTest(stage)).message); }
    catch (error: unknown) {
      const detail = error as { response?: { data?: { error?: string } } };
      setNotice(detail.response?.data?.error || "Could not queue test reminder.");
    } finally { setSending(false); }
  };
  return <section className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-4">
    <h4 className="text-sm font-bold text-slate-900">Automated WhatsApp Renewal Reminders</h4>
    <label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={value.renewal_enabled ?? false}
      onChange={e => onChange({ renewal_enabled: e.target.checked })} />Enable automatic renewal reminders</label>
    <div className="grid sm:grid-cols-2 gap-4 text-xs">
      <label>Preferred daily send time
        <select className="block w-full rounded-lg border bg-white p-2" value={value.renewal_send_time?.slice(0, 5)}
          onChange={e => onChange({ renewal_send_time: e.target.value })}>
          {times.map(t => <option key={t} value={t}>{Number(t.slice(0, 2)) % 12 || 12}:{t.slice(3)} {Number(t.slice(0, 2)) < 12 ? "AM" : "PM"}</option>)}
        </select>
      </label>
      <label>Daily message safety cap
        <input className="block w-full rounded-lg border bg-white p-2" type="number" min={1} max={1000}
          value={value.renewal_daily_cap ?? 100} onChange={e => onChange({ renewal_daily_cap: Number(e.target.value) })} />
      </label>
      <label className="flex gap-2 items-center"><input type="checkbox" checked={value.renewal_skip_sundays ?? true}
        onChange={e => onChange({ renewal_skip_sundays: e.target.checked })} />Skip Sundays</label>
      <label className="flex gap-2 items-center"><input type="checkbox" checked={value.renewal_skip_holidays ?? true}
        onChange={e => onChange({ renewal_skip_holidays: e.target.checked })} />Skip configured holidays</label>
      <label>Holiday dates (one YYYY-MM-DD per line)
        <textarea className="block w-full rounded-lg border bg-white p-2" rows={3}
          value={(value.renewal_holidays || []).join("\n")}
          onChange={e => onChange({ renewal_holidays: e.target.value.split("\n") })} />
      </label>
      <label>Approved template language code
        <input className="block w-full rounded-lg border bg-white p-2" value={value.renewal_language ?? "en"}
          onChange={e => onChange({ renewal_language: e.target.value })} />
      </label>
    </div>
    <div className="space-y-2">{stages.map(([days, label]) => <label key={days} className="flex gap-2 items-center text-xs">
      <input type="checkbox" checked={value.renewal_stages?.includes(days) ?? true}
        onChange={e => onChange({ renewal_stages: e.target.checked ? [...(value.renewal_stages || []), days] :
          (value.renewal_stages || []).filter(d => d !== days) })} />
      {days === 0 ? "On expiry day" : `${days} days before expiry`} — {label}
    </label>)}</div>
    <p className="text-xs text-slate-600">Business timezone: backend TIME_ZONE (default Asia/Kolkata). Sends from your selected time until 12:00 or 18:00. One reminder attempt per phone per day, at most 15 per minute. Renewed, scheduled and paid policies are excluded. Enter holiday dates above.</p>
    <p className="text-xs text-slate-600">Save configuration before testing. The background worker must be running. Tests always use the saved Admin Test Phone and follow the same sending hours and limits.</p>
    <div className="flex flex-wrap gap-2">
      <select aria-label="Test reminder stage" className="rounded-lg border bg-white p-2 text-xs" value={stage} onChange={e => setStage(Number(e.target.value))}>
        {stages.map(([days]) => <option key={days} value={days}>{days} day template</option>)}
      </select>
      <button type="button" disabled={sending} onClick={sendTest} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
        {sending ? "Queueing…" : "Send Test Reminder"}
      </button>
    </div>
    {notice && <p role="status" className="text-xs text-slate-700">{notice}</p>}
  </section>;
}

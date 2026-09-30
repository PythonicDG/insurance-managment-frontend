"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { Download, Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { bulkUploadService, UploadResult, UploadTemplate } from "@/lib/bulk-upload-api";

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function describe(value: unknown): string {
  if (Array.isArray(value)) return value.map(describe).join("; ");
  if (typeof value === "object" && value !== null) return Object.entries(value).map(([key, item]) => `${key}: ${describe(item)}`).join("; ");
  return String(value);
}

export default function BulkUploadPage() {
  const [templates, setTemplates] = useState<UploadTemplate[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"loading" | "download" | "preview" | "import" | null>("loading");
  const [imported, setImported] = useState(false);
  const template = templates.find((item) => String(item.id) === templateId);

  useEffect(() => {
    let active = true;
    bulkUploadService.templates().then((data) => {
      if (!active) return;
      setTemplates(data);
      if (data.length) setTemplateId(String(data[0].id));
    }).catch(() => {
      if (active) setError("Could not load upload templates. Refresh this page to try again.");
    }).finally(() => { if (active) setBusy(null); });
    return () => { active = false; };
  }, []);

  function reset() {
    setResult(null);
    setError("");
    setImported(false);
  }

  async function downloadTemplate() {
    if (!template) return;
    setBusy("download");
    setError("");
    try {
      downloadBlob(await bulkUploadService.download(template.id), `bulk-upload-template-${template.id}.xlsx`);
    } catch {
      setError("Could not download this template. Contact your administrator if the problem continues.");
    } finally { setBusy(null); }
  }

  async function submit(importNow: boolean) {
    if (!template || !file || (importNow && !result?.preview_token)) return;
    const token = importNow ? result?.preview_token : undefined;
    setBusy(importNow ? "import" : "preview");
    setError("");
    setResult(null);
    try {
      const response = await bulkUploadService.submit(template.id, file, token);
      setResult(response);
      setImported(importNow);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const data = err.response.data;
        if (Array.isArray(data.errors) && typeof data.total_rows === "number") setResult(data as UploadResult);
        setError(data.error ? describe(data.error) : "Validation failed. Review the row errors below. No rows were imported.");
      } else {
        setError(importNow ? "The import response was interrupted. Check Customers or Insurance Records before trying again; the import may have completed." : "Could not validate the file. Please try again.");
      }
      setImported(false);
    } finally { setBusy(null); }
  }

  function downloadErrors() {
    if (!result) return;
    const csvCell = (value: string) => {
      const safe = /^[=+@\-\t\r]/.test(value) ? `'${value}` : value;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const csv = ["Excel Row,Errors", ...result.errors.map((item) => `${item.row},${csvCell(describe(item.errors))}`)].join("\r\n");
    downloadBlob(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }), "bulk-upload-errors.csv");
  }

  const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed";
  return (
    <DashboardLayout title="Bulk Upload" showAddRecord={false}>
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bulk Upload</h1>
          <p className="mt-2 text-sm text-slate-600">Upload customers or insurance records from Excel. Validate the file, review the preview, then import.</p>
        </div>
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <label htmlFor="upload-template" className="mb-2 block text-sm font-semibold text-slate-700">Upload template</label>
            <select id="upload-template" value={templateId} disabled={!!busy} onChange={(event) => { setTemplateId(event.target.value); reset(); }} className="w-full rounded-xl border border-slate-300 p-3 text-sm">
              {!templates.length && <option value="">{busy === "loading" ? "Loading templates…" : "No active templates available"}</option>}
              {templates.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.target === "customers" ? "Customers" : "Insurance records"}</option>)}
            </select>
            {template?.description && <p className="mt-2 text-sm text-slate-600">{template.description}</p>}
          </div>
          <button type="button" disabled={!!busy || !template} onClick={downloadTemplate} className={`${buttonClass} border border-slate-300 text-slate-700`}>
            {busy === "download" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download Excel template
          </button>
          {template && <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-800">Expected columns</p>
            <p className="mt-2">{template.columns.map((column) => `${column.name}${column.required ? " *" : ""}`).join(", ")}</p>
            <p className="mt-2 text-xs">* Required. Column settings are managed by your administrator.</p>
          </div>}
          <div>
            <label htmlFor="upload-file" className="mb-2 block text-sm font-semibold text-slate-700">Excel file (.xlsx)</label>
            <input id="upload-file" type="file" accept=".xlsx" disabled={!!busy} onChange={(event) => {
              reset();
              const selected = event.target.files?.[0] ?? null;
              if (selected && (!selected.name.toLowerCase().endsWith(".xlsx") || selected.size > 10 * 1024 * 1024)) {
                setFile(null);
                setError("Choose an .xlsx file of 10 MB or less.");
                event.target.value = "";
              } else setFile(selected);
            }} className="block w-full rounded-xl border border-dashed border-slate-300 p-4 text-sm" />
            <p className="mt-2 text-xs text-slate-500">First worksheet, headers on row 1. Maximum 2,000 data rows and 10 MB. Dates: YYYY-MM-DD or DD/MM/YYYY. Use plain values without formulas.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={!!busy || !template || !file} onClick={() => submit(false)} className={`${buttonClass} bg-blue-600 text-white`}>
              {busy === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Validate file
            </button>
            <button type="button" disabled={!!busy || !result?.valid || !result.preview_token || imported} onClick={() => submit(true)} className={`${buttonClass} bg-emerald-600 text-white`}>
              {busy === "import" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Import validated file
            </button>
          </div>
          <p className="text-xs text-slate-500">Existing customers with the same phone/name are skipped. Duplicate policies and conflicting vehicle ownership are rejected. If any row fails, the whole upload is cancelled.</p>
        </section>
        {error && <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}
        {result && <section aria-live="polite" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">{imported ? "Import completed" : "Validation result"}</h2>
          <p className="text-sm text-slate-600">{result.total_rows} rows · {result.created} {imported ? "created" : "ready to create"} · {result.skipped} skipped · {result.errors.length} errors</p>
          {result.message && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{result.message}</p>}
          {imported && <Link href={template?.target === "customers" ? "/customers" : "/insurance-records"} className="inline-block text-sm font-semibold text-blue-600">View imported {template?.target === "customers" ? "customers" : "insurance records"} →</Link>}
          {result.warnings.length > 0 && <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{result.warnings.join(" · ")}</div>}
          {result.errors.length > 0 && <>
            <button type="button" onClick={downloadErrors} className={`${buttonClass} border border-slate-300`}><Download className="h-4 w-4" /> Download error report</button>
            <div className="max-h-96 overflow-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-3">Excel row</th><th className="p-3">Error</th></tr></thead><tbody>{result.errors.map((item) => <tr key={item.row} className="border-b"><td className="p-3 align-top">{item.row}</td><td className="p-3 text-red-700">{describe(item.errors)}</td></tr>)}</tbody></table></div>
          </>}
          {result.sample.length > 0 && <div className="overflow-x-auto">
            <p className="mb-2 text-sm font-medium text-slate-700">Preview (up to 10 valid rows)</p>
            <table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-3">Row</th><th className="p-3">Action</th><th className="p-3">Values</th></tr></thead><tbody>{result.sample.map((item) => <tr key={item.row} className="border-b"><td className="p-3 align-top">{item.row}</td><td className="p-3 align-top">{item.status === "created" ? imported ? "Created" : "Create" : "Skip existing"}</td><td className="min-w-64 p-3 text-slate-600">{describe(item.values)}</td></tr>)}</tbody></table>
          </div>}
        </section>}
      </div>
    </DashboardLayout>
  );
}

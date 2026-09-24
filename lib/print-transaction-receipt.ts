import {
  InsuranceRecordItem,
  PaymentTransaction,
  BusinessSettings,
  CustomerDetailResponse,
  LedgerRecord,
} from "@/lib/api";
import { formatDisplayDate, formatLocalDateISO } from "@/lib/date-utils";

/**
 * Convert a number to Indian currency words
 * e.g. 15450 -> "Rupees Fifteen Thousand Four Hundred Fifty Only"
 */
export function numberToWordsIndian(amount: number): string {
  const num = Math.round(Math.abs(amount));
  if (num === 0) return "Rupees Zero Only";

  const a = [
    "",
    "One ",
    "Two ",
    "Three ",
    "Four ",
    "Five ",
    "Six ",
    "Seven ",
    "Eight ",
    "Nine ",
    "Ten ",
    "Eleven ",
    "Twelve ",
    "Thirteen ",
    "Fourteen ",
    "Fifteen ",
    "Sixteen ",
    "Seventeen ",
    "Eighteen ",
    "Nineteen ",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function convertLessThanOneThousand(n: number): string {
    let str = "";
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + "Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      str += b[Math.floor(n / 10)] + " " + a[n % 10];
    } else if (n > 0) {
      str += a[n];
    }
    return str;
  }

  let result = "";
  const crore = Math.floor(num / 10000000);
  const remainderCrore = num % 10000000;
  const lakh = Math.floor(remainderCrore / 100000);
  const remainderLakh = remainderCrore % 100000;
  const thousand = Math.floor(remainderLakh / 1000);
  const remainderThousand = remainderLakh % 1000;

  if (crore > 0) {
    result += convertLessThanOneThousand(crore) + "Crore ";
  }
  if (lakh > 0) {
    result += convertLessThanOneThousand(lakh) + "Lakh ";
  }
  if (thousand > 0) {
    result += convertLessThanOneThousand(thousand) + "Thousand ";
  }
  if (remainderThousand > 0) {
    result += convertLessThanOneThousand(remainderThousand);
  }

  return `Rupees ${result.replace(/\s+/g, " ").trim()} Only`;
}

/**
 * Safe currency formatter for reports
 */
export function formatCurrency(val: number | string | undefined | null): string {
  if (val === undefined || val === null) return "₹0.00";
  const num = typeof val === "number" ? val : parseFloat(String(val)) || 0;
  return `₹${num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Sanitize a string for use as a valid, readable filesystem/PDF filename
 * Replaces illegal OS characters (/\:*?"<>|), spaces, and collapses underscores.
 */
export function sanitizeFileName(name?: string | number | null): string {
  if (name === undefined || name === null) return "";
  return String(name)
    .trim()
    .replace(/[/\\:*?"<>|]/g, "_") // Replace filesystem reserved characters
    .replace(/\s+/g, "_")          // Replace whitespace with underscore
    .replace(/_+/g, "_")           // Collapse consecutive underscores
    .replace(/^_+|_+$/g, "");      // Strip leading and trailing underscores
}

/**
 * Dispatch an HTML document to an invisible iframe for native browser printing & Save as PDF.
 * Temporarily updates the parent window's document.title so Chromium (Chrome/Edge)
 * automatically assigns the appropriate filename in the native "Save as PDF" file dialog.
 */
export function printHtmlDocument(htmlContent: string, fileName: string) {
  if (typeof window === "undefined") return;

  const cleanTitle = sanitizeFileName(fileName) || "Document";
  const originalTitle = document.title;
  let restored = false;

  const restoreTitle = () => {
    if (!restored) {
      restored = true;
      document.title = originalTitle;
      window.removeEventListener("afterprint", restoreTitle);
    }
  };

  // 1. Set parent window document.title for Chromium Save-As-PDF filename deduction
  document.title = cleanTitle;
  window.addEventListener("afterprint", restoreTitle, { once: true });

  // 2. Create invisible iframe
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.title = cleanTitle;
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    // Ensure <title> in htmlContent matches cleanTitle
    let processedHtml = htmlContent;
    if (processedHtml.includes("<title>")) {
      processedHtml = processedHtml.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(cleanTitle)}</title>`);
    } else {
      processedHtml = processedHtml.replace(/<head>/i, `<head><title>${escapeHtml(cleanTitle)}</title>`);
    }
    doc.write(processedHtml);
    doc.close();
    doc.title = cleanTitle;

    try {
      iframe.contentWindow?.addEventListener("afterprint", restoreTitle, { once: true });
    } catch {}

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error("Print invocation failed:", err);
      }

      // Cleanup iframe and restore title fallback after dialog opens/closes
      setTimeout(() => {
        restoreTitle();
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }, 300);
  } else {
    restoreTitle();
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }
}

/**
 * Backward compatibility alias for printHtmlDocument
 */
export function printHtmlContent(htmlContent: string, title: string = "Print") {
  printHtmlDocument(htmlContent, title);
}

export interface PrintTransactionStatementOptions {
  record: InsuranceRecordItem;
  transactions?: PaymentTransaction[];
  settings?: BusinessSettings | null;
  totalPaid?: number;
  balance?: number;
}

/**
 * Print a full professional Payment Transaction Statement & Receipt for a policy record
 */
export function printTransactionStatement({
  record,
  transactions,
  settings,
  totalPaid: explicitTotalPaid,
  balance: explicitBalance,
}: PrintTransactionStatementOptions) {
  const txList =
    transactions && transactions.length > 0
      ? transactions
      : record.payments || record.transactions || [];

  const totalPremium =
    typeof record.total_premium === "number"
      ? record.total_premium
      : parseFloat(String(record.total_premium || 0)) || 0;

  const totalPaid =
    explicitTotalPaid !== undefined
      ? explicitTotalPaid
      : typeof record.total_paid !== "undefined" && record.total_paid !== null
      ? parseFloat(String(record.total_paid)) || 0
      : typeof record.paid_amount === "number"
      ? record.paid_amount
      : parseFloat(String(record.paid_amount || 0)) || 0;

  const balance =
    explicitBalance !== undefined
      ? explicitBalance
      : typeof record.outstanding !== "undefined" && record.outstanding !== null
      ? parseFloat(String(record.outstanding)) || 0
      : typeof record.balance === "number"
      ? record.balance
      : Math.max(0, totalPremium - totalPaid);

  const isFullyPaid = balance <= 0 && totalPremium > 0;
  const isPartiallyPaid = totalPaid > 0 && balance > 0;

  const printDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const agencyName = settings?.business_name || "INSURANCE MANAGEMENT SERVICES";
  const agencyPhone = settings?.phone || "";
  const agencyEmail = settings?.email || "";
  const agencyAddress = settings?.address || "";
  const agencyLogo = settings?.logo_url || settings?.logo || "";

  const customerName = record.customer?.name || "Valued Customer";
  const customerPhone = record.customer?.phone || "—";
  const customerAltPhone = record.alternative_mobile_number || record.customer?.alternative_mobile_number || "";
  const customerAddress = record.customer?.address || "—";

  const vehicleNum = record.vehicle?.vehicle_number || "—";
  const vehicleType = record.vehicle?.vehicle_type || record.vehicle_class || "Vehicle";
  const companyName = record.insurance_company?.name || "—";
  const policyNum = record.policy_number || "—";

  const policyStart = formatDisplayDate(record.policy_start_date);
  const policyExpiry = formatDisplayDate(record.policy_expiry_date);
  const recordDate = formatDisplayDate(record.entry_date || record.created_at);

  const amountInWords = numberToWordsIndian(totalPaid);

  const txRowsHtml =
    txList.length === 0
      ? `<tr>
          <td colspan="6" class="empty-state">
            No payment transactions have been recorded yet for this policy record.
          </td>
        </tr>`
      : txList
          .map((tx, idx) => {
            const date = formatDisplayDate(tx.date || tx.payment_date || tx.created_at);
            const mode = tx.payment_mode || tx.payment_method || "Cash";
            const note = tx.note || tx.notes || "—";
            const amount = typeof tx.amount === "number" ? tx.amount : parseFloat(String(tx.amount || 0));
            const statusLabel = tx.is_outstanding ? "Outstanding" : "Received";
            const statusClass = tx.is_outstanding ? "badge-red" : "badge-green";

            return `
            <tr>
              <td class="col-center text-muted">${idx + 1}</td>
              <td class="font-medium">${date}</td>
              <td class="col-center">
                <span class="badge-mode">${escapeHtml(mode)}</span>
              </td>
              <td>${escapeHtml(note)}</td>
              <td class="col-center">
                <span class="${statusClass}">${statusLabel}</span>
              </td>
              <td class="col-right font-bold text-dark">${formatCurrency(amount)}</td>
            </tr>`;
          })
          .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Payment Transaction Statement - ${escapeHtml(policyNum)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11.5px;
      color: #0f172a;
      line-height: 1.45;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }

    /* Container */
    .document-container {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
    }

    /* Header */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 2.5px solid #1e40af;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .header-table td {
      vertical-align: top;
    }
    .agency-logo {
      max-height: 52px;
      max-width: 160px;
      object-fit: contain;
      margin-bottom: 6px;
    }
    .agency-name {
      font-size: 18px;
      font-weight: 800;
      color: #1e3a8a;
      letter-spacing: -0.3px;
      margin: 0 0 3px 0;
      text-transform: uppercase;
    }
    .agency-info {
      font-size: 10px;
      color: #475569;
      line-height: 1.4;
      margin: 0;
    }
    .doc-meta {
      text-align: right;
    }
    .doc-title {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.5px;
      margin: 0 0 4px 0;
      text-transform: uppercase;
    }
    .doc-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .badge-paid {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }
    .badge-partial {
      background: #fffbeb;
      color: #b45309;
      border: 1px solid #fde68a;
    }
    .badge-unpaid {
      background: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }
    .doc-meta-text {
      font-size: 9.5px;
      color: #64748b;
      margin: 2px 0;
    }
    .doc-meta-text strong {
      color: #0f172a;
    }

    /* Details Grid */
    .details-grid {
      width: 100%;
      border-collapse: separate;
      border-spacing: 8px 0;
      margin-bottom: 14px;
    }
    .details-card {
      width: 50%;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      vertical-align: top;
    }
    .card-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #3b82f6;
      border-bottom: 1px dashed #cbd5e1;
      padding-bottom: 4px;
      margin-bottom: 8px;
    }
    .info-row {
      margin-bottom: 5px;
      display: flex;
      justify-content: space-between;
      font-size: 10.5px;
    }
    .info-row:last-child {
      margin-bottom: 0;
    }
    .info-label {
      color: #64748b;
      font-weight: 500;
      width: 38%;
      shrink: 0;
    }
    .info-value {
      color: #0f172a;
      font-weight: 600;
      width: 62%;
      text-align: right;
    }
    .plate-badge {
      display: inline-block;
      background: #0f172a;
      color: #ffffff;
      padding: 2px 8px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
    }

    /* Policy Strip */
    .policy-strip {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 14px;
      display: table;
      width: 100%;
    }
    .strip-col {
      display: table-cell;
      vertical-align: middle;
      padding: 0 6px;
    }
    .strip-label {
      font-size: 9px;
      text-transform: uppercase;
      font-weight: 700;
      color: #3b82f6;
      letter-spacing: 0.5px;
    }
    .strip-value {
      font-size: 11px;
      font-weight: 700;
      color: #1e3a8a;
    }

    /* Financial Overview */
    .metrics-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 8px 0;
      margin-bottom: 16px;
    }
    .metric-cell {
      width: 33.333%;
      border-radius: 8px;
      padding: 10px 12px;
      vertical-align: middle;
    }
    .metric-blue {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
    }
    .metric-green {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
    }
    .metric-red {
      background: #fef2f2;
      border: 1px solid #fecaca;
    }
    .metric-title {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .metric-blue .metric-title { color: #475569; }
    .metric-green .metric-title { color: #047857; }
    .metric-red .metric-title { color: #b91c1c; }

    .metric-amount {
      font-size: 17px;
      font-weight: 800;
      line-height: 1.1;
    }
    .metric-blue .metric-amount { color: #0f172a; }
    .metric-green .metric-amount { color: #059669; }
    .metric-red .metric-amount { color: #dc2626; }

    /* Transactions Table */
    .section-title {
      font-size: 12px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 8px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .ledger-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
    }
    .ledger-table th {
      background: #f1f5f9;
      color: #334155;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 7px 10px;
      border-bottom: 1.5px solid #cbd5e1;
      text-align: left;
    }
    .ledger-table td {
      padding: 7px 10px;
      font-size: 10.5px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    .ledger-table tr:last-child td {
      border-bottom: none;
    }
    .ledger-table tfoot td {
      background: #f8fafc;
      font-weight: 800;
      border-top: 1.5px solid #cbd5e1;
      padding: 8px 10px;
    }
    .col-center { text-align: center; }
    .col-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .font-medium { font-weight: 600; }
    .text-muted { color: #64748b; }
    .text-dark { color: #0f172a; }
    .empty-state {
      text-align: center;
      padding: 24px 10px;
      color: #64748b;
      font-style: italic;
    }

    .badge-mode {
      background: #f1f5f9;
      color: #334155;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 9px;
      font-weight: 600;
      border: 1px solid #e2e8f0;
    }
    .badge-green {
      background: #ecfdf5;
      color: #047857;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 9px;
      font-weight: 700;
    }
    .badge-red {
      background: #fef2f2;
      color: #b91c1c;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 9px;
      font-weight: 700;
    }

    /* Words Box */
    .words-box {
      background: #fafafa;
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 10.5px;
      margin-bottom: 16px;
      color: #334155;
    }
    .words-box strong {
      color: #0f172a;
    }

    /* Footer & Signatures */
    .signatures-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 24px;
      page-break-inside: avoid;
    }
    .signatures-table td {
      width: 50%;
      vertical-align: bottom;
      padding: 0 10px;
    }
    .sig-box {
      text-align: center;
      padding-top: 36px;
      border-top: 1.2px solid #0f172a;
      margin-top: 40px;
    }
    .sig-title {
      font-size: 10.5px;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0;
    }
    .sig-subtitle {
      font-size: 9px;
      color: #64748b;
      margin: 2px 0 0 0;
    }

    .terms-note {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      font-size: 8.5px;
      color: #64748b;
      line-height: 1.4;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="document-container">
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td style="width: 60%;">
          ${agencyLogo ? `<img src="${escapeHtml(agencyLogo)}" alt="Agency Logo" class="agency-logo" /><br />` : ""}
          <h1 class="agency-name">${escapeHtml(agencyName)}</h1>
          <p class="agency-info">
            ${agencyAddress ? `${escapeHtml(agencyAddress)}<br />` : ""}
            ${agencyPhone ? `<strong>Phone:</strong> ${escapeHtml(agencyPhone)} &nbsp;&bull;&nbsp; ` : ""}
            ${agencyEmail ? `<strong>Email:</strong> ${escapeHtml(agencyEmail)}` : ""}
          </p>
        </td>
        <td style="width: 40%;" class="doc-meta">
          <div class="doc-title">Transaction Receipt</div>
          <div>
            ${
              isFullyPaid
                ? `<span class="doc-badge badge-paid">Fully Paid</span>`
                : isPartiallyPaid
                ? `<span class="doc-badge badge-partial">Partially Paid</span>`
                : `<span class="doc-badge badge-unpaid">Payment Due</span>`
            }
          </div>
          <div class="doc-meta-text">Statement Ref: <strong>#TXN-${record.id || "REC"}</strong></div>
          <div class="doc-meta-text">Issued Date: <strong>${printDate}</strong></div>
          <div class="doc-meta-text">Policy Entry Date: <strong>${recordDate}</strong></div>
        </td>
      </tr>
    </table>

    <!-- Insured & Vehicle Section -->
    <table class="details-grid">
      <tr>
        <td class="details-card">
          <div class="card-title">Customer / Policyholder</div>
          <div class="info-row">
            <span class="info-label">Customer Name:</span>
            <span class="info-value font-bold">${escapeHtml(customerName)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Phone Number:</span>
            <span class="info-value">${escapeHtml(customerPhone)}</span>
          </div>
          ${customerAltPhone ? `
          <div class="info-row">
            <span class="info-label">Alt Mobile:</span>
            <span class="info-value">${escapeHtml(customerAltPhone)}</span>
          </div>` : ""}
          <div class="info-row">
            <span class="info-label">Address:</span>
            <span class="info-value">${escapeHtml(customerAddress)}</span>
          </div>
        </td>
        <td class="details-card">
          <div class="card-title">Vehicle Information</div>
          <div class="info-row">
            <span class="info-label">Vehicle Number:</span>
            <span class="info-value"><span class="plate-badge">${escapeHtml(vehicleNum)}</span></span>
          </div>
          <div class="info-row">
            <span class="info-label">Vehicle Type:</span>
            <span class="info-value">${escapeHtml(vehicleType)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Vehicle Class:</span>
            <span class="info-value">${escapeHtml(record.vehicle_class || "—")}</span>
          </div>
        </td>
      </tr>
    </table>

    <!-- Policy Strip -->
    <div class="policy-strip">
      <div class="strip-col" style="width: 28%;">
        <div class="strip-label">Policy Number</div>
        <div class="strip-value">${escapeHtml(policyNum)}</div>
      </div>
      <div class="strip-col" style="width: 32%;">
        <div class="strip-label">Insurance Company</div>
        <div class="strip-value">${escapeHtml(companyName)}</div>
      </div>
      <div class="strip-col" style="width: 25%;">
        <div class="strip-label">Insurance Period</div>
        <div class="strip-value">${policyStart} to ${policyExpiry}</div>
      </div>
      <div class="strip-col" style="width: 15%; text-align: right;">
        <div class="strip-label">Policy Status</div>
        <div class="strip-value" style="color: ${record.is_active ? "#059669" : "#64748b"};">
          ${record.is_active ? "Active" : "Expired / Inactive"}
        </div>
      </div>
    </div>

    <!-- Financial Metrics -->
    <table class="metrics-table">
      <tr>
        <td class="metric-cell metric-blue">
          <div class="metric-title">Total Policy Premium</div>
          <div class="metric-amount">${formatCurrency(totalPremium)}</div>
        </td>
        <td class="metric-cell metric-green">
          <div class="metric-title">Total Amount Received</div>
          <div class="metric-amount">${formatCurrency(totalPaid)}</div>
        </td>
        <td class="metric-cell metric-red">
          <div class="metric-title">Outstanding Balance</div>
          <div class="metric-amount">${formatCurrency(balance)}</div>
        </td>
      </tr>
    </table>

    <!-- Transaction Ledger Table -->
    <div class="section-title">
      <span>Payment Transaction History</span>
      <span style="font-size: 10px; color: #64748b; font-weight: normal;">${txList.length} transaction${txList.length === 1 ? "" : "s"} recorded</span>
    </div>

    <table class="ledger-table">
      <thead>
        <tr>
          <th style="width: 5%;" class="col-center">#</th>
          <th style="width: 18%;">Payment Date</th>
          <th style="width: 16%;" class="col-center">Payment Mode</th>
          <th style="width: 35%;">Notes / Reference</th>
          <th style="width: 11%;" class="col-center">Status</th>
          <th style="width: 15%;" class="col-right">Amount Received</th>
        </tr>
      </thead>
      <tbody>
        ${txRowsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5" class="col-right">Total Payments Received:</td>
          <td class="col-right text-dark">${formatCurrency(totalPaid)}</td>
        </tr>
        <tr>
          <td colspan="5" class="col-right" style="color: ${balance > 0 ? "#dc2626" : "#059669"};">
            Remaining Outstanding Balance:
          </td>
          <td class="col-right" style="color: ${balance > 0 ? "#dc2626" : "#059669"}; font-weight: 800;">
            ${formatCurrency(balance)}
          </td>
        </tr>
      </tfoot>
    </table>

    <!-- Amount In Words -->
    ${
      totalPaid > 0
        ? `<div class="words-box">
            Amount Received (in words): <strong>${escapeHtml(amountInWords)}</strong>
          </div>`
        : ""
    }

    <!-- Signatures Section -->
    <table class="signatures-table">
      <tr>
        <td>
          <div class="sig-box">
            <p class="sig-title">Customer / Payer Signature</p>
            <p class="sig-subtitle">Thank you for your payment</p>
          </div>
        </td>
        <td>
          <div class="sig-box">
            <p class="sig-title">Authorized Signatory</p>
            <p class="sig-subtitle">For ${escapeHtml(agencyName)}</p>
          </div>
        </td>
      </tr>
    </table>

    <!-- Terms Note -->
    <div class="terms-note">
      This is a computer-generated transaction statement and payment receipt issued by ${escapeHtml(agencyName)}.
      All transactions are recorded subject to banking clearance and policy terms. For inquiries or discrepancies, please contact our office.
    </div>
  </div>
</body>
</html>`;

  const custClean = sanitizeFileName(customerName !== "Valued Customer" ? customerName : "");
  const vehClean = sanitizeFileName(vehicleNum !== "—" ? vehicleNum : "");
  const polClean = sanitizeFileName(policyNum !== "—" ? policyNum : "");

  const parts = ["Transactions_History"];
  if (custClean) parts.push(custClean);
  if (vehClean) parts.push(vehClean);
  if (polClean) parts.push(polClean);
  if (parts.length === 1 && record.id) parts.push(String(record.id));
  const fileName = parts.join("_");

  printHtmlDocument(html, fileName);
}

/**
 * Print an individual transaction payment voucher
 */
export function printSinglePaymentReceipt({
  record,
  transaction,
  settings,
}: {
  record: InsuranceRecordItem;
  transaction: PaymentTransaction;
  settings?: BusinessSettings | null;
}) {
  const printDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const agencyName = settings?.business_name || "INSURANCE MANAGEMENT SERVICES";
  const agencyPhone = settings?.phone || "";
  const agencyEmail = settings?.email || "";
  const agencyAddress = settings?.address || "";
  const agencyLogo = settings?.logo_url || settings?.logo || "";

  const customerName = record.customer?.name || "Valued Customer";
  const customerPhone = record.customer?.phone || "—";
  const customerAltPhone = record.alternative_mobile_number || record.customer?.alternative_mobile_number || "";
  const vehicleNum = record.vehicle?.vehicle_number || "—";
  const companyName = record.insurance_company?.name || "—";
  const policyNum = record.policy_number || "—";

  const txAmount =
    typeof transaction.amount === "number"
      ? transaction.amount
      : parseFloat(String(transaction.amount || 0)) || 0;
  const txDate = formatDisplayDate(transaction.date || transaction.payment_date);
  const txMode = transaction.payment_mode || transaction.payment_method || "Cash";
  const txNote = transaction.note || transaction.notes || "—";
  const amountInWords = numberToWordsIndian(txAmount);

  const receiptRef = `RCP-${transaction.id || "PAY"}-${new Date().getFullYear()}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Payment Receipt - ${escapeHtml(receiptRef)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 20mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 12px;
      color: #0f172a;
      line-height: 1.5;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .receipt-container {
      max-width: 680px;
      margin: 0 auto;
      border: 2px solid #2563eb;
      border-radius: 12px;
      padding: 24px;
      position: relative;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .logo {
      max-height: 48px;
      max-width: 140px;
      object-fit: contain;
      margin-bottom: 6px;
    }
    .agency-name {
      font-size: 20px;
      font-weight: 800;
      color: #1e3a8a;
      margin: 0 0 4px 0;
      text-transform: uppercase;
    }
    .agency-meta {
      font-size: 10.5px;
      color: #475569;
    }
    .receipt-title-box {
      text-align: right;
    }
    .receipt-badge {
      display: inline-block;
      background: #1e40af;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 4px 12px;
      border-radius: 4px;
      margin-bottom: 6px;
    }
    .ref-line {
      font-size: 11px;
      color: #64748b;
    }
    .ref-line strong {
      color: #0f172a;
    }
    .receipt-body {
      margin-bottom: 20px;
    }
    .row {
      display: flex;
      margin-bottom: 10px;
      padding: 6px 0;
      border-bottom: 1px dashed #f1f5f9;
    }
    .label {
      width: 35%;
      color: #64748b;
      font-weight: 600;
    }
    .value {
      width: 65%;
      color: #0f172a;
      font-weight: 600;
    }
    .highlight-amount {
      background: #ecfdf5;
      border: 1.5px solid #10b981;
      border-radius: 8px;
      padding: 12px 16px;
      margin: 16px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .highlight-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #047857;
      letter-spacing: 0.5px;
    }
    .highlight-val {
      font-size: 24px;
      font-weight: 800;
      color: #059669;
    }
    .words-line {
      font-size: 11px;
      color: #334155;
      margin-top: 6px;
      font-style: italic;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 48px;
      padding-top: 24px;
    }
    .sig-col {
      width: 45%;
      text-align: center;
      border-top: 1.5px solid #0f172a;
      padding-top: 8px;
    }
    .sig-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .footer-note {
      margin-top: 24px;
      text-align: center;
      font-size: 9px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <div>
        ${agencyLogo ? `<img src="${escapeHtml(agencyLogo)}" alt="Logo" class="logo" /><br />` : ""}
        <h1 class="agency-name">${escapeHtml(agencyName)}</h1>
        <div class="agency-meta">
          ${agencyAddress ? `${escapeHtml(agencyAddress)}<br />` : ""}
          ${agencyPhone ? `Phone: ${escapeHtml(agencyPhone)} &nbsp;|&nbsp; ` : ""}
          ${agencyEmail ? `Email: ${escapeHtml(agencyEmail)}` : ""}
        </div>
      </div>
      <div class="receipt-title-box">
        <div class="receipt-badge">Payment Voucher</div>
        <div class="ref-line">Receipt Ref: <strong>${escapeHtml(receiptRef)}</strong></div>
        <div class="ref-line">Date: <strong>${printDate}</strong></div>
      </div>
    </div>

    <div class="receipt-body">
      <div class="row">
        <div class="label">Received With Thanks From:</div>
        <div class="value font-bold" style="font-size: 13px;">${escapeHtml(customerName)}</div>
      </div>
      <div class="row">
        <div class="label">Customer Contact:</div>
        <div class="value">${escapeHtml(customerPhone)}${customerAltPhone ? ` &nbsp;|&nbsp; Alt: ${escapeHtml(customerAltPhone)}` : ""}</div>
      </div>
      <div class="row">
        <div class="label">Vehicle Number:</div>
        <div class="value font-bold">${escapeHtml(vehicleNum)}</div>
      </div>
      <div class="row">
        <div class="label">Policy Number & Company:</div>
        <div class="value">${escapeHtml(policyNum)} (${escapeHtml(companyName)})</div>
      </div>
      <div class="row">
        <div class="label">Payment Date & Mode:</div>
        <div class="value">${txDate} via <strong>${escapeHtml(txMode)}</strong></div>
      </div>
      <div class="row">
        <div class="label">Remarks / Note:</div>
        <div class="value">${escapeHtml(txNote)}</div>
      </div>

      <div class="highlight-amount">
        <div>
          <div class="highlight-title">Amount Received</div>
          <div class="words-line">${escapeHtml(amountInWords)}</div>
        </div>
        <div class="highlight-val">${formatCurrency(txAmount)}</div>
      </div>
    </div>

    <div class="signatures">
      <div class="sig-col">
        <div class="sig-label">Payer's Signature</div>
      </div>
      <div class="sig-col">
        <div class="sig-label">Authorized Signatory</div>
        <div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">For ${escapeHtml(agencyName)}</div>
      </div>
    </div>

    <div class="footer-note">
      This is a computer generated receipt. Subject to realization of cheque / digital payment clearance.
    </div>
  </div>
</body>
</html>`;

  const cleanReceiptRef = sanitizeFileName(receiptRef);
  const cleanCust = sanitizeFileName(customerName !== "Valued Customer" ? customerName : "");
  const cleanVeh = sanitizeFileName(vehicleNum !== "—" ? vehicleNum : "");
  const parts = ["Payment_Receipt", cleanReceiptRef];
  if (cleanCust) parts.push(cleanCust);
  if (cleanVeh) parts.push(cleanVeh);
  const fileName = parts.join("_");

  printHtmlDocument(html, fileName);
}

/**
 * Print an entire vehicle policy history summary report
 */
export function printVehicleHistorySummary({
  vehicleNumber,
  vehicleType,
  customerName,
  historyRecords,
  settings,
}: {
  vehicleNumber: string;
  vehicleType?: string;
  customerName?: string;
  historyRecords: InsuranceRecordItem[];
  settings?: BusinessSettings | null;
}) {
  const printDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const agencyName = settings?.business_name || "INSURANCE MANAGEMENT SERVICES";
  const agencyPhone = settings?.phone || "";
  const agencyEmail = settings?.email || "";
  const agencyAddress = settings?.address || "";
  const agencyLogo = settings?.logo_url || settings?.logo || "";

  const totalPolicies = historyRecords.length;
  const totalPremiumAll = historyRecords.reduce((sum, r) => {
    const p = typeof r.total_premium === "number" ? r.total_premium : parseFloat(String(r.total_premium || 0)) || 0;
    return sum + p;
  }, 0);

  const rows = historyRecords
    .map((r, i) => {
      const pNum = r.policy_number || "—";
      const comp = r.insurance_company?.name || "—";
      const start = formatDisplayDate(r.policy_start_date);
      const exp = formatDisplayDate(r.policy_expiry_date);
      const prem = typeof r.total_premium === "number" ? r.total_premium : parseFloat(String(r.total_premium || 0)) || 0;
      const statusBadge = r.is_active
        ? `<span style="color: #059669; font-weight: 700;">Active</span>`
        : `<span style="color: #64748b;">Expired</span>`;

      return `
      <tr>
        <td style="text-align: center;">${i + 1}</td>
        <td style="font-weight: 700;">${escapeHtml(pNum)}</td>
        <td>${escapeHtml(comp)}</td>
        <td>${start} &ndash; ${exp}</td>
        <td style="text-align: right; font-weight: 700;">${formatCurrency(prem)}</td>
        <td style="text-align: center;">${statusBadge}</td>
      </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Vehicle Insurance History - ${escapeHtml(vehicleNumber)}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 11px;
      color: #0f172a;
      line-height: 1.4;
      margin: 0;
    }
    .header {
      border-bottom: 2px solid #2563eb;
      padding-bottom: 10px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .agency-name {
      font-size: 18px;
      font-weight: 800;
      color: #1e3a8a;
      text-transform: uppercase;
      margin: 0 0 2px 0;
    }
    .agency-info { font-size: 10px; color: #475569; }
    .title-box { text-align: right; }
    .doc-title { font-size: 14px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin: 0 0 3px 0; }
    .meta-text { font-size: 10px; color: #64748b; }

    .summary-card {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .veh-plate {
      background: #0f172a;
      color: #fff;
      padding: 3px 10px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 13px;
      font-weight: 700;
      display: inline-block;
      margin-left: 6px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 14px;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 8px 10px;
      border-bottom: 1.5px solid #cbd5e1;
      text-align: left;
    }
    td {
      padding: 7px 10px;
      font-size: 10.5px;
      border-bottom: 1px solid #e2e8f0;
    }
    tfoot td {
      background: #f8fafc;
      font-weight: 800;
      border-top: 1.5px solid #cbd5e1;
      padding: 8px 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      ${agencyLogo ? `<img src="${escapeHtml(agencyLogo)}" alt="Logo" style="max-height:44px; margin-bottom:4px;" /><br />` : ""}
      <h1 class="agency-name">${escapeHtml(agencyName)}</h1>
      <div class="agency-info">
        ${agencyAddress ? `${escapeHtml(agencyAddress)} &bull; ` : ""}
        ${agencyPhone ? `Phone: ${escapeHtml(agencyPhone)} &bull; ` : ""}
        ${agencyEmail ? `Email: ${escapeHtml(agencyEmail)}` : ""}
      </div>
    </div>
    <div class="title-box">
      <div class="doc-title">Vehicle Insurance History</div>
      <div class="meta-text">Generated: <strong>${printDate}</strong></div>
      <div class="meta-text">Total Policies: <strong>${totalPolicies}</strong></div>
    </div>
  </div>

  <div class="summary-card">
    <div>
      <span style="font-size: 11px; font-weight: 600; color: #475569;">Vehicle Registration:</span>
      <span class="veh-plate">${escapeHtml(vehicleNumber)}</span>
      ${vehicleType ? `<span style="font-size: 11px; color: #64748b; margin-left: 10px;">(${escapeHtml(vehicleType)})</span>` : ""}
    </div>
    ${customerName ? `<div><span style="font-size: 11px; color: #64748b;">Customer: </span><strong style="color: #0f172a;">${escapeHtml(customerName)}</strong></div>` : ""}
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 6%; text-align: center;">#</th>
        <th style="width: 25%;">Policy Number</th>
        <th style="width: 25%;">Insurance Company</th>
        <th style="width: 25%;">Insurance Period</th>
        <th style="width: 19%; text-align: right;">Total Premium</th>
        <th style="width: 10%; text-align: center;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="4" style="text-align: right;">Cumulative Premium Across All Records:</td>
        <td style="text-align: right;">${formatCurrency(totalPremiumAll)}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;

  const cleanVeh = sanitizeFileName(vehicleNumber);
  const cleanCust = sanitizeFileName(customerName);
  const parts = ["Vehicle_Insurance_History"];
  if (cleanVeh) parts.push(cleanVeh);
  if (cleanCust) parts.push(cleanCust);
  const fileName = parts.join("_");

  printHtmlDocument(html, fileName);
}

export interface PrintCustomerInsuranceHistoryOptions {
  customer: CustomerDetailResponse | {
    id?: number | string;
    name?: string;
    phone?: string;
    alternative_mobile_number?: string;
    email?: string;
    address?: string;
    total_records?: number;
    total_premium?: number | string;
    total_paid?: number | string;
    total_outstanding?: number | string;
  };
  records: InsuranceRecordItem[];
  settings?: BusinessSettings | null;
}

/**
 * Print an entire Customer Insurance History report across all policies
 */
export function printCustomerInsuranceHistory({
  customer,
  records,
  settings,
}: PrintCustomerInsuranceHistoryOptions) {
  const printDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const agencyName = settings?.business_name || "INSURANCE MANAGEMENT SERVICES";
  const agencyPhone = settings?.phone || "";
  const agencyEmail = settings?.email || "";
  const agencyAddress = settings?.address || "";
  const agencyLogo = settings?.logo_url || settings?.logo || "";

  const customerName = customer.name || "Valued Customer";
  const customerPhone = customer.phone || "—";
  const customerAltPhone = customer.alternative_mobile_number || "";
  const customerEmail = customer.email || "";
  const customerAddress = customer.address || "—";

  const totalPolicies = records.length;
  const totalPremium = records.reduce((sum, r) => {
    const val = typeof r.total_premium === "number" ? r.total_premium : parseFloat(String(r.total_premium || 0)) || 0;
    return sum + val;
  }, 0);

  const totalPaid = records.reduce((sum, r) => {
    const val = typeof r.total_paid !== "undefined" && r.total_paid !== null
      ? parseFloat(String(r.total_paid)) || 0
      : typeof r.paid_amount === "number"
      ? r.paid_amount
      : parseFloat(String(r.paid_amount || 0)) || 0;
    return sum + val;
  }, 0);

  const totalOutstanding = Math.max(0, totalPremium - totalPaid);

  const cleanCust = sanitizeFileName(customer.name);
  const cleanPhone = sanitizeFileName(customer.phone);
  const dateIso = new Date().toISOString().split("T")[0];
  const parts = ["Customer_Insurance_History"];
  if (cleanCust) parts.push(cleanCust);
  if (cleanPhone) parts.push(cleanPhone);
  parts.push(dateIso);
  const fileName = parts.join("_");

  const rows = records.length === 0
    ? `<tr><td colspan="8" style="text-align: center; padding: 24px; color: #64748b; font-style: italic;">No insurance policies recorded for this customer.</td></tr>`
    : records.map((r, i) => {
        const pNum = r.policy_number || "—";
        const comp = r.insurance_company?.name || "—";
        const veh = r.vehicle?.vehicle_number || "—";
        const vehType = r.vehicle?.vehicle_type || r.vehicle_class || "";
        const start = formatDisplayDate(r.policy_start_date);
        const exp = formatDisplayDate(r.policy_expiry_date);
        const prem = typeof r.total_premium === "number" ? r.total_premium : parseFloat(String(r.total_premium || 0)) || 0;
        const paid = typeof r.total_paid !== "undefined" && r.total_paid !== null
          ? parseFloat(String(r.total_paid)) || 0
          : typeof r.paid_amount === "number"
          ? r.paid_amount
          : parseFloat(String(r.paid_amount || 0)) || 0;
        const bal = typeof r.outstanding !== "undefined" && r.outstanding !== null
          ? parseFloat(String(r.outstanding)) || 0
          : typeof r.balance === "number"
          ? r.balance
          : Math.max(0, prem - paid);

        const statusLabel = r.is_active ? "Active" : "Expired";
        const statusStyle = r.is_active
          ? "background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;"
          : "background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0;";

        return `
        <tr>
          <td style="text-align: center; color: #64748b;">${i + 1}</td>
          <td style="font-weight: 700; color: #0f172a;">
            ${escapeHtml(pNum)}
            <div style="font-size: 9px; font-weight: normal; color: #64748b;">${escapeHtml(comp)}</div>
          </td>
          <td>
            <span style="font-family: monospace; font-weight: 700; background: #0f172a; color: #fff; padding: 1px 5px; border-radius: 3px; font-size: 10px;">${escapeHtml(veh)}</span>
            ${vehType ? `<div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">${escapeHtml(vehType)}</div>` : ""}
          </td>
          <td style="font-size: 10px;">${start} &ndash; ${exp}</td>
          <td style="text-align: right; font-weight: 700;">${formatCurrency(prem)}</td>
          <td style="text-align: right; color: #059669; font-weight: 600;">${formatCurrency(paid)}</td>
          <td style="text-align: right; color: ${bal > 0 ? "#dc2626" : "#059669"}; font-weight: 700;">${formatCurrency(bal)}</td>
          <td style="text-align: center;">
            <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; ${statusStyle}">${statusLabel}</span>
          </td>
        </tr>`;
      }).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(fileName)}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm 14mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11px;
      color: #0f172a;
      line-height: 1.4;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 2.5px solid #1e40af;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .header-table td { vertical-align: top; }
    .agency-name {
      font-size: 18px;
      font-weight: 800;
      color: #1e3a8a;
      text-transform: uppercase;
      margin: 0 0 2px 0;
      letter-spacing: -0.3px;
    }
    .agency-info { font-size: 10px; color: #475569; margin: 0; line-height: 1.35; }
    .doc-meta { text-align: right; }
    .doc-title {
      font-size: 15px;
      font-weight: 800;
      text-transform: uppercase;
      color: #0f172a;
      letter-spacing: 0.5px;
      margin: 0 0 3px 0;
    }
    .meta-text { font-size: 10px; color: #64748b; margin: 1px 0; }
    .meta-text strong { color: #0f172a; }

    /* Customer Info & Financial Summary */
    .summary-grid {
      width: 100%;
      border-collapse: separate;
      border-spacing: 10px 0;
      margin-bottom: 12px;
    }
    .customer-card {
      width: 45%;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 9px 12px;
      vertical-align: top;
    }
    .card-title {
      font-size: 9.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #2563eb;
      border-bottom: 1px dashed #cbd5e1;
      padding-bottom: 3px;
      margin-bottom: 6px;
    }
    .info-line { margin-bottom: 3px; font-size: 10.5px; }
    .info-line strong { color: #0f172a; }
    .info-line span { color: #64748b; }

    .metrics-col {
      width: 55%;
      vertical-align: top;
    }
    .metrics-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 6px 0;
    }
    .metric-cell {
      padding: 8px 10px;
      border-radius: 8px;
      vertical-align: middle;
      text-align: center;
    }
    .metric-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .metric-val {
      font-size: 15px;
      font-weight: 800;
      line-height: 1.1;
    }

    /* Ledger Table */
    .ledger-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 12px;
    }
    .ledger-table th {
      background: #f1f5f9;
      color: #334155;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 6px 8px;
      border-bottom: 1.5px solid #cbd5e1;
      text-align: left;
    }
    .ledger-table td {
      padding: 6px 8px;
      font-size: 10.5px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    .ledger-table tr:last-child td { border-bottom: none; }
    .ledger-table tfoot td {
      background: #f8fafc;
      font-weight: 800;
      border-top: 1.5px solid #cbd5e1;
      padding: 7px 8px;
    }

    .footer-note {
      text-align: center;
      font-size: 8.5px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td style="width: 60%;">
        ${agencyLogo ? `<img src="${escapeHtml(agencyLogo)}" alt="Logo" style="max-height:42px; margin-bottom:4px;" /><br />` : ""}
        <h1 class="agency-name">${escapeHtml(agencyName)}</h1>
        <p class="agency-info">
          ${agencyAddress ? `${escapeHtml(agencyAddress)}<br />` : ""}
          ${agencyPhone ? `<strong>Phone:</strong> ${escapeHtml(agencyPhone)} &nbsp;&bull;&nbsp; ` : ""}
          ${agencyEmail ? `<strong>Email:</strong> ${escapeHtml(agencyEmail)}` : ""}
        </p>
      </td>
      <td style="width: 40%;" class="doc-meta">
        <div class="doc-title">Customer Insurance History</div>
        <div class="meta-text">Report Generated: <strong>${printDate}</strong></div>
        <div class="meta-text">Total Policies Registered: <strong>${totalPolicies}</strong></div>
      </td>
    </tr>
  </table>

  <table class="summary-grid">
    <tr>
      <td class="customer-card">
        <div class="card-title">Customer Profile</div>
        <div class="info-line"><span>Name:</span> <strong>${escapeHtml(customerName)}</strong></div>
        <div class="info-line"><span>Phone:</span> <strong>${escapeHtml(customerPhone)}</strong> ${customerAltPhone ? `&nbsp;|&nbsp; <span>Alt:</span> ${escapeHtml(customerAltPhone)}` : ""}</div>
        ${customerEmail ? `<div class="info-line"><span>Email:</span> ${escapeHtml(customerEmail)}</div>` : ""}
        <div class="info-line"><span>Address:</span> ${escapeHtml(customerAddress)}</div>
      </td>
      <td class="metrics-col">
        <table class="metrics-table">
          <tr>
            <td class="metric-cell" style="background: #f1f5f9; border: 1px solid #cbd5e1;">
              <div class="metric-label" style="color: #475569;">Total Policies</div>
              <div class="metric-val" style="color: #0f172a;">${totalPolicies}</div>
            </td>
            <td class="metric-cell" style="background: #eff6ff; border: 1px solid #bfdbfe;">
              <div class="metric-label" style="color: #1e40af;">Total Premium</div>
              <div class="metric-val" style="color: #1d4ed8;">${formatCurrency(totalPremium)}</div>
            </td>
            <td class="metric-cell" style="background: #ecfdf5; border: 1px solid #a7f3d0;">
              <div class="metric-label" style="color: #047857;">Total Received</div>
              <div class="metric-val" style="color: #059669;">${formatCurrency(totalPaid)}</div>
            </td>
            <td class="metric-cell" style="background: ${totalOutstanding > 0 ? "#fef2f2" : "#f0fdf4"}; border: 1px solid ${totalOutstanding > 0 ? "#fecaca" : "#bbf7d0"};">
              <div class="metric-label" style="color: ${totalOutstanding > 0 ? "#b91c1c" : "#15803d"};">Outstanding</div>
              <div class="metric-val" style="color: ${totalOutstanding > 0 ? "#dc2626" : "#16a34a"};">${formatCurrency(totalOutstanding)}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <table class="ledger-table">
    <thead>
      <tr>
        <th style="width: 4%; text-align: center;">#</th>
        <th style="width: 22%;">Policy &amp; Company</th>
        <th style="width: 17%;">Vehicle</th>
        <th style="width: 18%;">Insurance Period</th>
        <th style="width: 13%; text-align: right;">Total Premium</th>
        <th style="width: 11%; text-align: right;">Paid</th>
        <th style="width: 11%; text-align: right;">Balance</th>
        <th style="width: 7%; text-align: center;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="4" style="text-align: right;">Cumulative Portfolio Totals:</td>
        <td style="text-align: right; color: #0f172a;">${formatCurrency(totalPremium)}</td>
        <td style="text-align: right; color: #059669;">${formatCurrency(totalPaid)}</td>
        <td style="text-align: right; color: ${totalOutstanding > 0 ? "#dc2626" : "#059669"};">${formatCurrency(totalOutstanding)}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>

  <div class="footer-note">
    Official Customer Insurance Portfolio &amp; History Statement &bull; Generated from ${escapeHtml(agencyName)}
  </div>
</body>
</html>`;

  printHtmlDocument(html, fileName);
}

export interface PrintSingleInsuranceRecordOptions {
  record: InsuranceRecordItem;
  settings?: BusinessSettings | null;
}

/**
 * Print an official summary record voucher for an individual insurance policy
 */
export function printSingleInsuranceRecord({
  record,
  settings,
}: PrintSingleInsuranceRecordOptions) {
  const printDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const agencyName = settings?.business_name || "INSURANCE MANAGEMENT SERVICES";
  const agencyPhone = settings?.phone || "";
  const agencyEmail = settings?.email || "";
  const agencyAddress = settings?.address || "";
  const agencyLogo = settings?.logo_url || settings?.logo || "";

  const customerName = record.customer?.name || "Valued Customer";
  const customerPhone = record.customer?.phone || "—";
  const customerAltPhone = record.alternative_mobile_number || record.customer?.alternative_mobile_number || "";
  const customerAddress = record.customer?.address || "—";

  const vehicleNum = record.vehicle?.vehicle_number || "—";
  const vehicleType = record.vehicle?.vehicle_type || record.vehicle_class || "—";
  const companyName = record.insurance_company?.name || "—";
  const policyNum = record.policy_number || "—";

  const policyStart = formatDisplayDate(record.policy_start_date);
  const policyExpiry = formatDisplayDate(record.policy_expiry_date);
  const recordDate = formatDisplayDate(record.entry_date || record.created_at);

  const totalPremium = typeof record.total_premium === "number" ? record.total_premium : parseFloat(String(record.total_premium || 0)) || 0;
  const totalPaid = typeof record.total_paid !== "undefined" && record.total_paid !== null
    ? parseFloat(String(record.total_paid)) || 0
    : typeof record.paid_amount === "number"
    ? record.paid_amount
    : parseFloat(String(record.paid_amount || 0)) || 0;
  const balance = typeof record.outstanding !== "undefined" && record.outstanding !== null
    ? parseFloat(String(record.outstanding)) || 0
    : typeof record.balance === "number"
    ? record.balance
    : Math.max(0, totalPremium - totalPaid);

  const cleanPol = sanitizeFileName(policyNum !== "—" ? policyNum : "");
  const cleanVeh = sanitizeFileName(vehicleNum !== "—" ? vehicleNum : "");
  const cleanCust = sanitizeFileName(customerName !== "Valued Customer" ? customerName : "");

  const parts = ["Insurance_Record"];
  if (cleanPol) parts.push(cleanPol);
  if (cleanVeh) parts.push(cleanVeh);
  if (cleanCust) parts.push(cleanCust);
  const fileName = parts.join("_");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(fileName)}</title>
  <style>
    @page { size: A4 portrait; margin: 14mm 16mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 11.5px;
      color: #0f172a;
      line-height: 1.5;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 2.5px solid #1e40af;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .header-table td { vertical-align: top; }
    .agency-name {
      font-size: 18px;
      font-weight: 800;
      color: #1e3a8a;
      text-transform: uppercase;
      margin: 0 0 3px 0;
    }
    .agency-info { font-size: 10px; color: #475569; margin: 0; }
    .doc-meta { text-align: right; }
    .doc-title {
      font-size: 16px;
      font-weight: 800;
      text-transform: uppercase;
      color: #0f172a;
      letter-spacing: 0.5px;
      margin: 0 0 4px 0;
    }
    .meta-text { font-size: 10px; color: #64748b; margin: 2px 0; }

    .section-box {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
      background: #f8fafc;
      margin-bottom: 14px;
    }
    .section-title {
      font-size: 10.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #1e40af;
      border-bottom: 1px dashed #cbd5e1;
      padding-bottom: 4px;
      margin-bottom: 10px;
    }
    .data-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px 16px;
    }
    .data-item {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
    }
    .data-label { color: #64748b; font-weight: 500; }
    .data-value { font-weight: 700; color: #0f172a; }

    .financials-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 8px 0;
      margin-bottom: 16px;
    }
    .financials-table td {
      width: 33.333%;
      padding: 12px;
      border-radius: 8px;
      text-align: center;
    }
    .badge-plate {
      background: #0f172a;
      color: #fff;
      padding: 2px 8px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 11px;
      font-weight: 700;
    }
    .footer-note {
      text-align: center;
      font-size: 9px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      margin-top: 24px;
    }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td style="width: 60%;">
        ${agencyLogo ? `<img src="${escapeHtml(agencyLogo)}" alt="Logo" style="max-height:44px; margin-bottom:4px;" /><br />` : ""}
        <h1 class="agency-name">${escapeHtml(agencyName)}</h1>
        <p class="agency-info">
          ${agencyAddress ? `${escapeHtml(agencyAddress)}<br />` : ""}
          ${agencyPhone ? `<strong>Phone:</strong> ${escapeHtml(agencyPhone)} &nbsp;&bull;&nbsp; ` : ""}
          ${agencyEmail ? `<strong>Email:</strong> ${escapeHtml(agencyEmail)}` : ""}
        </p>
      </td>
      <td style="width: 40%;" class="doc-meta">
        <div class="doc-title">Insurance Policy Record</div>
        <div class="meta-text">Policy Ref: <strong>${escapeHtml(policyNum)}</strong></div>
        <div class="meta-text">Print Date: <strong>${printDate}</strong></div>
        <div class="meta-text">Record Date: <strong>${recordDate}</strong></div>
      </td>
    </tr>
  </table>

  <div class="section-box">
    <div class="section-title">Customer &amp; Policyholder</div>
    <div class="data-grid">
      <div class="data-item"><span class="data-label">Customer Name:</span><span class="data-value">${escapeHtml(customerName)}</span></div>
      <div class="data-item"><span class="data-label">Mobile Number:</span><span class="data-value">${escapeHtml(customerPhone)}</span></div>
      ${customerAltPhone ? `<div class="data-item"><span class="data-label">Alt Mobile:</span><span class="data-value">${escapeHtml(customerAltPhone)}</span></div>` : ""}
      <div class="data-item"><span class="data-label">Address:</span><span class="data-value">${escapeHtml(customerAddress)}</span></div>
    </div>
  </div>

  <div class="section-box">
    <div class="section-title">Policy &amp; Coverage Information</div>
    <div class="data-grid">
      <div class="data-item"><span class="data-label">Policy Number:</span><span class="data-value font-mono">${escapeHtml(policyNum)}</span></div>
      <div class="data-item"><span class="data-label">Insurance Company:</span><span class="data-value">${escapeHtml(companyName)}</span></div>
      <div class="data-item"><span class="data-label">Policy Period:</span><span class="data-value">${policyStart} to ${policyExpiry}</span></div>
      <div class="data-item"><span class="data-label">Policy Status:</span><span class="data-value" style="color: ${record.is_active ? "#059669" : "#64748b"};">${record.is_active ? "Active" : "Expired / Inactive"}</span></div>
    </div>
  </div>

  <div class="section-box">
    <div class="section-title">Vehicle Details</div>
    <div class="data-grid">
      <div class="data-item"><span class="data-label">Vehicle Registration:</span><span class="badge-plate">${escapeHtml(vehicleNum)}</span></div>
      <div class="data-item"><span class="data-label">Vehicle Type:</span><span class="data-value">${escapeHtml(vehicleType)}</span></div>
      <div class="data-item"><span class="data-label">Vehicle Class:</span><span class="data-value">${escapeHtml(record.vehicle_class || "—")}</span></div>
    </div>
  </div>

  <table class="financials-table">
    <tr>
      <td style="background: #f1f5f9; border: 1px solid #cbd5e1;">
        <div style="font-size: 9.5px; font-weight: 700; text-transform: uppercase; color: #475569; margin-bottom: 2px;">Total Premium</div>
        <div style="font-size: 18px; font-weight: 800; color: #0f172a;">${formatCurrency(totalPremium)}</div>
      </td>
      <td style="background: #ecfdf5; border: 1px solid #a7f3d0;">
        <div style="font-size: 9.5px; font-weight: 700; text-transform: uppercase; color: #047857; margin-bottom: 2px;">Amount Paid</div>
        <div style="font-size: 18px; font-weight: 800; color: #059669;">${formatCurrency(totalPaid)}</div>
      </td>
      <td style="background: ${balance > 0 ? "#fef2f2" : "#f0fdf4"}; border: 1px solid ${balance > 0 ? "#fecaca" : "#bbf7d0"};">
        <div style="font-size: 9.5px; font-weight: 700; text-transform: uppercase; color: ${balance > 0 ? "#b91c1c" : "#15803d"}; margin-bottom: 2px;">Outstanding Balance</div>
        <div style="font-size: 18px; font-weight: 800; color: ${balance > 0 ? "#dc2626" : "#16a34a"};">${formatCurrency(balance)}</div>
      </td>
    </tr>
  </table>

  ${record.remarks ? `
  <div class="section-box">
    <div class="section-title">Underwriting Remarks</div>
    <div style="font-size: 11px; color: #334155;">${escapeHtml(record.remarks)}</div>
  </div>` : ""}

  <div class="footer-note">
    This document is a computer-generated summary of Insurance Record #${record.id || ""}. Issued by ${escapeHtml(agencyName)}.
  </div>
</body>
</html>`;

  printHtmlDocument(html, fileName);
}

export interface PrintOutstandingLedgerOptions {
  records: LedgerRecord[];
  settings?: BusinessSettings | null;
  filters?: {
    company?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    search?: string;
  };
  summary?: {
    total_premium?: number;
    total_received?: number;
    total_outstanding?: number;
    total_customers_pending?: number;
  } | null;
}

/**
 * Print or Save as PDF a professional Outstanding & Payment Ledger report
 */
export function printOutstandingLedgerReport({
  records,
  settings,
  filters,
  summary: externalSummary,
}: PrintOutstandingLedgerOptions) {
  const agencyName = settings?.business_name || "INSURANCE MANAGEMENT SERVICES";
  const agencyPhone = settings?.phone || "";
  const agencyEmail = settings?.email || "";
  const agencyAddress = settings?.address || "";
  const agencyLogo = settings?.logo_url || settings?.logo || "";

  const generatedDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  // Calculate totals from records if not provided
  const totalPremium =
    externalSummary?.total_premium !== undefined
      ? externalSummary.total_premium
      : records.reduce((sum, r) => {
          const val = typeof r.total_premium === "number" ? r.total_premium : parseFloat(String(r.total_premium || 0)) || 0;
          return sum + val;
        }, 0);

  const totalPaid =
    externalSummary?.total_received !== undefined
      ? externalSummary.total_received
      : records.reduce((sum, r) => {
          const val = typeof r.paid_amount === "number" ? r.paid_amount : parseFloat(String(r.paid_amount || 0)) || 0;
          return sum + val;
        }, 0);

  const totalOutstanding =
    externalSummary?.total_outstanding !== undefined
      ? externalSummary.total_outstanding
      : records.reduce((sum, r) => {
          const val = typeof r.outstanding === "number" ? r.outstanding : parseFloat(String(r.outstanding || 0)) || 0;
          return sum + val;
        }, 0);

  const pendingCustomers =
    externalSummary?.total_customers_pending !== undefined
      ? externalSummary.total_customers_pending
      : new Set(records.filter((r) => {
          const out = typeof r.outstanding === "number" ? r.outstanding : parseFloat(String(r.outstanding || 0)) || 0;
          return out > 0;
        }).map((r) => r.customer_id || r.customer_name)).size;

  // Filter chips
  const filterBadges: string[] = [];
  if (filters?.company && filters.company !== "all" && filters.company !== "All companies") {
    filterBadges.push(`Company: ${filters.company}`);
  }
  if (filters?.status) {
    let statusLabel = filters.status;
    if (statusLabel === "outstanding_partial") statusLabel = "Outstanding & Partial";
    else if (statusLabel === "outstanding") statusLabel = "Outstanding Only";
    else if (statusLabel === "partial") statusLabel = "Partial Only";
    else if (statusLabel === "paid") statusLabel = "Paid";
    else if (statusLabel === "all") statusLabel = "All Statuses";
    filterBadges.push(`Status: ${statusLabel}`);
  }
  if (filters?.fromDate || filters?.toDate) {
    const fDate = filters.fromDate ? formatDisplayDate(filters.fromDate) : "Earliest";
    const tDate = filters.toDate ? formatDisplayDate(filters.toDate) : "Present";
    filterBadges.push(`Date Range: ${fDate} to ${tDate}`);
  }
  if (filters?.search && filters.search.trim()) {
    filterBadges.push(`Search: "${filters.search.trim()}"`);
  }

  const formatPhoneVal = (phone?: string) => {
    if (!phone) return "—";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith("91")) {
      return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
    }
    return phone;
  };

  const rowsHtml =
    records.length === 0
      ? `<tr><td colspan="10" class="empty-state">No outstanding or ledger entries match your filter criteria.</td></tr>`
      : records
          .map((r, idx) => {
            const prem = typeof r.total_premium === "number" ? r.total_premium : parseFloat(String(r.total_premium || 0)) || 0;
            const paid = typeof r.paid_amount === "number" ? r.paid_amount : parseFloat(String(r.paid_amount || 0)) || 0;
            const out = typeof r.outstanding === "number" ? r.outstanding : parseFloat(String(r.outstanding || 0)) || 0;

            const isPaid = r.status === "Paid" || out <= 0;
            const isPartial = r.status === "Partial" || (paid > 0 && out > 0);
            const statusClass = isPaid ? "badge-paid" : isPartial ? "badge-partial" : "badge-out";
            const statusText = isPaid ? "Paid" : isPartial ? "Partial" : "Outstanding";

            const altPhone = r.customer_alternative_mobile_number || r.alternative_mobile_number;

            return `
            <tr>
              <td class="col-center text-muted">${idx + 1}</td>
              <td class="font-bold text-dark">${escapeHtml(r.customer_name || "—")}</td>
              <td>
                <div class="font-mono text-dark">${formatPhoneVal(r.customer_phone)}</div>
                ${altPhone ? `<div style="font-size: 9px; color: #64748b;">Alt: ${formatPhoneVal(altPhone)}</div>` : ""}
              </td>
              <td>
                <span class="badge-plate font-mono">${escapeHtml(r.vehicle_number || "—")}</span>
              </td>
              <td class="text-dark font-medium">${escapeHtml(r.insurance_company_name || "—")}</td>
              <td class="font-mono text-muted">${escapeHtml(r.policy_number || "—")}</td>
              <td class="col-right font-medium text-dark">${formatCurrency(prem)}</td>
              <td class="col-right font-medium text-green">${formatCurrency(paid)}</td>
              <td class="col-right font-bold text-red">${formatCurrency(out)}</td>
              <td class="col-center">
                <span class="status-badge ${statusClass}">${statusText}</span>
              </td>
            </tr>`;
          })
          .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Outstanding &amp; Ledger Report - ${generatedDate}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11px;
      color: #0f172a;
      line-height: 1.4;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }

    /* Container */
    .document-container {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
    }

    /* Header */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 2.5px solid #2563eb;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .header-table td {
      vertical-align: top;
    }
    .agency-logo {
      max-height: 48px;
      max-width: 150px;
      object-fit: contain;
      margin-bottom: 4px;
    }
    .agency-name {
      font-size: 18px;
      font-weight: 800;
      color: #1e3a8a;
      letter-spacing: -0.3px;
      margin: 0 0 2px 0;
      text-transform: uppercase;
    }
    .agency-info {
      font-size: 10px;
      color: #475569;
      line-height: 1.35;
      margin: 0;
    }
    .doc-meta {
      text-align: right;
    }
    .doc-title {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.2px;
      margin: 0 0 3px 0;
      text-transform: uppercase;
    }
    .doc-subtitle {
      font-size: 10.5px;
      color: #64748b;
      margin: 0 0 5px 0;
      font-weight: 500;
    }
    .doc-meta-text {
      font-size: 9.5px;
      color: #64748b;
      margin: 1px 0;
    }
    .doc-meta-text strong {
      color: #0f172a;
    }

    /* Filter Chips */
    .filter-chips {
      margin-bottom: 10px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .chip {
      display: inline-block;
      background: #f1f5f9;
      color: #475569;
      font-size: 9.5px;
      font-weight: 600;
      padding: 2.5px 8px;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
    }

    /* KPI Cards */
    .metrics-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 8px 0;
      margin-bottom: 12px;
    }
    .metric-cell {
      width: 25%;
      border-radius: 8px;
      padding: 8px 12px;
      vertical-align: middle;
    }
    .metric-blue {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
    }
    .metric-green {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
    }
    .metric-red {
      background: #fef2f2;
      border: 1px solid #fecaca;
    }
    .metric-slate {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
    }
    .metric-title {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .metric-blue .metric-title { color: #1e40af; }
    .metric-green .metric-title { color: #047857; }
    .metric-red .metric-title { color: #b91c1c; }
    .metric-slate .metric-title { color: #475569; }

    .metric-amount {
      font-size: 16px;
      font-weight: 800;
      line-height: 1.1;
    }
    .metric-blue .metric-amount { color: #1e3a8a; }
    .metric-green .metric-amount { color: #059669; }
    .metric-red .metric-amount { color: #dc2626; }
    .metric-slate .metric-amount { color: #0f172a; }

    /* Ledger Table */
    .table-container {
      width: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 12px;
    }
    table.report-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: auto;
    }
    thead {
      display: table-header-group;
    }
    thead th {
      background-color: #f1f5f9;
      color: #334155;
      font-weight: 700;
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 8px 7px;
      text-align: left;
      border-bottom: 2px solid #94a3b8;
      border-right: 1px solid #cbd5e1;
      white-space: nowrap;
    }
    thead th:last-child {
      border-right: none;
    }
    tbody tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    tbody tr:nth-child(even) {
      background-color: #f8fafc;
    }
    tbody td {
      padding: 7px 7px;
      vertical-align: middle;
      border-bottom: 1px solid #e2e8f0;
      border-right: 1px solid #e2e8f0;
      font-size: 10.5px;
    }
    tbody td:last-child {
      border-right: none;
    }
    tbody tr:last-child td {
      border-bottom: none;
    }
    tfoot tr td {
      background: #f8fafc;
      font-weight: 800;
      border-top: 2px solid #cbd5e1;
      padding: 8px 7px;
      font-size: 11px;
    }

    .col-center { text-align: center; }
    .col-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .font-medium { font-weight: 600; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 10px; }
    .text-muted { color: #64748b; }
    .text-dark { color: #0f172a; }
    .text-green { color: #059669; }
    .text-red { color: #dc2626; }

    .badge-plate {
      display: inline-block;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #0f172a;
      padding: 1.5px 6px;
      border-radius: 4px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    .status-badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .badge-paid {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }
    .badge-partial {
      background: #fffbeb;
      color: #b45309;
      border: 1px solid #fde68a;
    }
    .badge-out {
      background: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }

    .empty-state {
      text-align: center;
      padding: 24px 10px;
      color: #64748b;
      font-style: italic;
    }

    /* Summary Bar */
    .summary-bar {
      display: flex;
      justify-content: flex-end;
      gap: 20px;
      padding: 9px 14px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 11px;
      break-inside: avoid;
      page-break-inside: avoid;
      margin-bottom: 12px;
    }
    .summary-item strong {
      color: #0f172a;
      font-weight: 700;
    }
    .summary-item .sum-red {
      color: #dc2626;
      font-weight: 800;
      font-size: 12px;
    }
    .summary-item .sum-green {
      color: #059669;
      font-weight: 800;
      font-size: 12px;
    }

    /* Footer Note */
    .footer-note {
      text-align: center;
      font-size: 8.5px;
      color: #64748b;
      padding-top: 6px;
      border-top: 1px solid #e2e8f0;
      break-inside: avoid;
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class="document-container">
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td style="width: 55%;">
          ${agencyLogo ? `<img src="${escapeHtml(agencyLogo)}" alt="Agency Logo" class="agency-logo" /><br />` : ""}
          <h1 class="agency-name">${escapeHtml(agencyName)}</h1>
          <p class="agency-info">
            ${agencyAddress ? `${escapeHtml(agencyAddress)}<br />` : ""}
            ${agencyPhone ? `<strong>Phone:</strong> ${escapeHtml(agencyPhone)} &nbsp;&bull;&nbsp; ` : ""}
            ${agencyEmail ? `<strong>Email:</strong> ${escapeHtml(agencyEmail)}` : ""}
          </p>
        </td>
        <td style="width: 45%;" class="doc-meta">
          <div class="doc-title">Outstanding Ledger Report</div>
          <div class="doc-subtitle">Customer Balances &amp; Pending Premium Register</div>
          <div class="doc-meta-text">Report Date: <strong>${generatedDate}</strong></div>
          <div class="doc-meta-text">Total Listed Policies: <strong>${records.length}</strong></div>
          <div class="doc-meta-text">Total Pending Accounts: <strong>${pendingCustomers}</strong></div>
        </td>
      </tr>
    </table>

    <!-- Filter Chips -->
    ${
      filterBadges.length > 0
        ? `<div class="filter-chips">${filterBadges.map((b) => `<span class="chip">${escapeHtml(b)}</span>`).join("")}</div>`
        : ""
    }

    <!-- Financial KPI Summary Cards -->
    <table class="metrics-table">
      <tr>
        <td class="metric-cell metric-blue">
          <div class="metric-title">Total Premium</div>
          <div class="metric-amount">${formatCurrency(totalPremium)}</div>
        </td>
        <td class="metric-cell metric-green">
          <div class="metric-title">Total Received</div>
          <div class="metric-amount">${formatCurrency(totalPaid)}</div>
        </td>
        <td class="metric-cell metric-red">
          <div class="metric-title">Total Outstanding</div>
          <div class="metric-amount">${formatCurrency(totalOutstanding)}</div>
        </td>
        <td class="metric-cell metric-slate">
          <div class="metric-title">Pending Accounts</div>
          <div class="metric-amount">${pendingCustomers} Customers</div>
        </td>
      </tr>
    </table>

    <!-- Ledger Table -->
    <div class="table-container">
      <table class="report-table">
        <thead>
          <tr>
            <th style="width: 3%; text-align: center;">#</th>
            <th style="width: 17%;">Customer Name</th>
            <th style="width: 13%;">Phone</th>
            <th style="width: 11%;">Vehicle Number</th>
            <th style="width: 13%;">Insurance Company</th>
            <th style="width: 11%;">Policy Number</th>
            <th style="width: 10%; text-align: right;">Total Premium</th>
            <th style="width: 9%; text-align: right;">Paid Amount</th>
            <th style="width: 9%; text-align: right;">Outstanding</th>
            <th style="width: 4%; text-align: center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
        ${
          records.length > 0
            ? `<tfoot>
                <tr>
                  <td colspan="6" style="text-align: right;">Total Summary (${records.length} Policies):</td>
                  <td style="text-align: right; color: #0f172a;">${formatCurrency(totalPremium)}</td>
                  <td style="text-align: right; color: #059669;">${formatCurrency(totalPaid)}</td>
                  <td style="text-align: right; color: #dc2626;">${formatCurrency(totalOutstanding)}</td>
                  <td></td>
                </tr>
              </tfoot>`
            : ""
        }
      </table>
    </div>

    <!-- Summary Bar -->
    <div class="summary-bar">
      <div class="summary-item">Total Listed Records: <strong>${records.length}</strong></div>
      <div class="summary-item">Total Premium: <strong>${formatCurrency(totalPremium)}</strong></div>
      <div class="summary-item">Total Received: <span class="sum-green">${formatCurrency(totalPaid)}</span></div>
      <div class="summary-item">Total Outstanding: <span class="sum-red">${formatCurrency(totalOutstanding)}</span></div>
    </div>

    <div class="footer-note">
      Official Outstanding &amp; Recovery Ledger Statement &bull; Generated from ${escapeHtml(agencyName)} &bull; ${generatedDate}
    </div>
  </div>
</body>
</html>`;

  // Sanitized filename deduction for Chromium Save as PDF dialog
  const dateStr = formatLocalDateISO(new Date());
  const parts = ["Outstanding_Ledger_Report"];
  if (filters?.company && filters.company !== "all" && filters.company !== "All companies") {
    parts.push(sanitizeFileName(filters.company));
  }
  if (filters?.status && filters.status !== "all") {
    parts.push(sanitizeFileName(filters.status));
  }
  if (filters?.search && filters.search.trim()) {
    parts.push(sanitizeFileName(filters.search.trim()));
  }
  parts.push(dateStr);
  const pdfFileName = parts.join("_");

  printHtmlDocument(html, pdfFileName);
}

function escapeHtml(text?: string | number | null): string {
  if (text === undefined || text === null) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

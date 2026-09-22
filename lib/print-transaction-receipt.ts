import {
  InsuranceRecordItem,
  PaymentTransaction,
  BusinessSettings,
} from "@/lib/api";
import { formatDisplayDate } from "@/lib/date-utils";

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
function formatCurrency(val: number | string | undefined | null): string {
  if (val === undefined || val === null) return "₹0.00";
  const num = typeof val === "number" ? val : parseFloat(String(val)) || 0;
  return `₹${num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Dispatch an HTML document to an invisible iframe for native browser printing
 */
function printHtmlContent(htmlContent: string, title: string = "Print") {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.title = title;
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }, 300);
  }
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

  printHtmlContent(html, `Payment Statement - ${policyNum}`);
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
        <div class="value">${escapeHtml(customerPhone)}</div>
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

  printHtmlContent(html, `Payment Voucher - ${receiptRef}`);
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

  printHtmlContent(html, `Vehicle History - ${vehicleNumber}`);
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

"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  MessageSquare,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Send,
  RotateCw,
  Copy,
  Check,
  ExternalLink,
  BookOpen,
  Info,
  Phone,
  KeyRound,
  FileText,
  Sliders,
} from "lucide-react";
import {
  whatsAppService,
  WhatsAppConfig,
  WhatsAppMessageLog,
  WhatsAppTestPayload,
} from "@/lib/api";
import { ToastType } from "@/components/ui/toast";

interface WhatsAppSettingsTabProps {
  showToast: (type: ToastType, title: string, message?: string) => void;
}

export function WhatsAppSettingsTab({ showToast }: WhatsAppSettingsTabProps) {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  // Form states
  const [isEnabled, setIsEnabled] = useState(true);
  const [testMode, setTestMode] = useState(true);
  const [testPhone, setTestPhone] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [apiVersion, setApiVersion] = useState("v21.0");
  const [defaultCountryCode, setDefaultCountryCode] = useState("91");
  const [policyTemplate, setPolicyTemplate] = useState("insurance_policy_issued");
  const [paymentTemplate, setPaymentTemplate] = useState("payment_receipt_collected");
  const [webhookToken, setWebhookToken] = useState("insure_wa_webhook_secret_key");
  const [autoPolicy, setAutoPolicy] = useState(true);
  const [autoPayment, setAutoPayment] = useState(true);

  // Test message states
  const [testRecipient, setTestRecipient] = useState("");
  const [testType, setTestType] = useState<"direct_text" | "template_policy" | "template_payment">("direct_text");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    wamid?: string;
  } | null>(null);

  // Logs state
  const [logs, setLogs] = useState<WhatsAppMessageLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [resendingLogId, setResendingLogId] = useState<number | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Fetch Config
  const fetchConfig = useCallback(async () => {
    try {
      setLoadingConfig(true);
      const data = await whatsAppService.getConfig();
      setConfig(data);
      setIsEnabled(data.is_enabled);
      setTestMode(data.test_mode);
      setTestPhone(data.test_phone_number || "");
      setPhoneNumberId(data.phone_number_id || "");
      setWabaId(data.waba_id || "");
      setApiVersion(data.api_version || "v21.0");
      setDefaultCountryCode(data.default_country_code || "91");
      setPolicyTemplate(data.policy_template_name || "insurance_policy_issued");
      setPaymentTemplate(data.payment_template_name || "payment_receipt_collected");
      setWebhookToken(data.webhook_verify_token || "insure_wa_webhook_secret_key");
      setAutoPolicy(data.auto_send_policy_creation);
      setAutoPayment(data.auto_send_payment_receipt);

      // Pre-fill test recipient if empty
      if (!testRecipient && data.test_phone_number) {
        setTestRecipient(data.test_phone_number);
      }
    } catch {
      showToast("error", "Error", "Failed to load WhatsApp configuration.");
    } finally {
      setLoadingConfig(false);
    }
  }, [showToast, testRecipient]);

  // Fetch Delivery Logs
  const fetchLogs = useCallback(async () => {
    try {
      setLoadingLogs(true);
      const res = await whatsAppService.getLogs({ page_size: 15 });
      setLogs(res.results || []);
    } catch {
      // Non-critical, ignore
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchLogs();
  }, [fetchConfig, fetchLogs]);

  // Save Config
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const payload: Partial<WhatsAppConfig> = {
        is_enabled: isEnabled,
        test_mode: testMode,
        test_phone_number: testPhone.trim(),
        phone_number_id: phoneNumberId.trim(),
        waba_id: wabaId.trim(),
        api_version: apiVersion.trim(),
        default_country_code: defaultCountryCode.trim(),
        policy_template_name: policyTemplate.trim(),
        payment_template_name: paymentTemplate.trim(),
        webhook_verify_token: webhookToken.trim(),
        auto_send_policy_creation: autoPolicy,
        auto_send_payment_receipt: autoPayment,
      };

      if (accessToken.trim()) {
        payload.access_token = accessToken.trim();
      }

      const res = await whatsAppService.updateConfig(payload);
      setConfig(res.data);
      setAccessToken("");
      showToast("success", "Saved", "WhatsApp configuration updated successfully.");
      fetchLogs();
    } catch (err: unknown) {
      const errorMsg =
        err && typeof err === "object" && "response" in err
          ? JSON.stringify((err as { response?: { data?: unknown } }).response?.data)
          : "Failed to save WhatsApp settings.";
      showToast("error", "Save Failed", errorMsg);
    } finally {
      setSavingConfig(false);
    }
  };

  // Send Test Message
  const handleSendTest = async () => {
    if (!testRecipient.trim()) {
      showToast("error", "Recipient Required", "Please enter a test phone number.");
      return;
    }
    setSendingTest(true);
    setTestResult(null);
    try {
      const payload: WhatsAppTestPayload = {
        phone_number: testRecipient.trim(),
        test_type: testType,
      };
      const res = await whatsAppService.sendTestMessage(payload);
      setTestResult({
        success: res.success,
        message: res.message,
        wamid: res.log?.wamid,
      });
      if (res.success) {
        showToast("success", "Message Sent!", "WhatsApp test message sent successfully.");
      } else {
        showToast("error", "Sending Failed", res.message);
      }
      fetchLogs();
    } catch (err: unknown) {
      const errorDetail =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message || "Failed to send test message."
          : "Connection failed to WhatsApp API.";
      setTestResult({
        success: false,
        message: errorDetail,
      });
      showToast("error", "Error", errorDetail);
    } finally {
      setSendingTest(false);
    }
  };

  // Resend Log
  const handleResend = async (logId: number) => {
    setResendingLogId(logId);
    try {
      const res = await whatsAppService.resendLog(logId);
      if (res.success) {
        showToast("success", "Message Resent", "Message resent successfully via WhatsApp.");
      } else {
        showToast("error", "Resend Failed", res.message);
      }
      fetchLogs();
    } catch {
      showToast("error", "Error", "Failed to resend message.");
    } finally {
      setResendingLogId(null);
    }
  };

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/whatsapp/webhook/`
      : "https://your-domain.com/api/whatsapp/webhook/";

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
    showToast("info", "Copied", "Webhook URL copied to clipboard.");
  };

  if (loadingConfig) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700">Loading WhatsApp Configuration...</p>
      </div>
    );
  }

  const isConfigured = Boolean(config?.phone_number_id && config?.has_access_token);

  return (
    <div className="space-y-6">
      {/* 1. Status Banner */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          !isEnabled
            ? "bg-slate-50 border-slate-200 text-slate-700"
            : testMode
            ? "bg-amber-50/80 border-amber-200 text-amber-900"
            : isConfigured
            ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
            : "bg-red-50/80 border-red-200 text-red-900"
        }`}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              !isEnabled
                ? "bg-slate-200 text-slate-600"
                : testMode
                ? "bg-amber-100 text-amber-700"
                : isConfigured
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold">
                {!isEnabled
                  ? "WhatsApp Integration Disabled"
                  : testMode
                  ? "Safe Test Mode Active"
                  : isConfigured
                  ? "WhatsApp Cloud API Active (Live Mode)"
                  : "Meta WhatsApp Credentials Missing"}
              </h3>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  !isEnabled
                    ? "bg-slate-200 text-slate-700"
                    : testMode
                    ? "bg-amber-200 text-amber-900"
                    : isConfigured
                    ? "bg-emerald-200 text-emerald-900"
                    : "bg-red-200 text-red-900"
                }`}
              >
                {testMode ? "Test Mode" : isEnabled ? "Live" : "Disabled"}
              </span>
            </div>
            <p className="text-xs sm:text-sm mt-0.5 opacity-90 leading-relaxed">
              {testMode ? (
                <>
                  <strong>Your clients are 100% safe:</strong> All automated WhatsApp notifications for newly created policies and payments will be safely redirected to your Admin Test Phone Number (<strong>{config?.test_phone_number || "Not set yet"}</strong>).
                </>
              ) : isConfigured ? (
                "Automated policy notifications and payment receipts will be dispatched live to client WhatsApp numbers."
              ) : (
                "Please configure your Meta Phone Number ID and System User Access Token below to start sending."
              )}
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <a
            href="https://developers.facebook.com/apps/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <span>Meta Developer Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2. Main Configuration Form (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSaveConfig} className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <span>Meta WhatsApp Cloud API Settings</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Configure your official Meta Cloud API credentials, test mode redirection, and automation rules.
              </p>
            </div>

            {/* Test Mode & Redirection Box */}
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs sm:text-sm font-bold text-amber-950 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span>Enable Test Mode (Safeguard Clients)</span>
                  </label>
                  <p className="text-[11px] sm:text-xs text-amber-800 mt-0.5">
                    When active, messages are routed strictly to your admin phone for testing without notifying clients.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={testMode}
                  onChange={(e) => setTestMode(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Admin Test Phone Number (with Country Code)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="e.g. 919876543210"
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  All test messages and test-mode notifications will be sent to this phone number.
                </p>
              </div>
            </div>

            {/* Meta API Credentials */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Meta Developer Credentials
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                    placeholder="e.g. 523821034182930"
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Found in Meta App &gt; WhatsApp &gt; API Setup</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    WhatsApp Business Account ID (WABA ID)
                  </label>
                  <input
                    type="text"
                    value={wabaId}
                    onChange={(e) => setWabaId(e.target.value)}
                    placeholder="e.g. 483920194829381"
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Found in Meta App &gt; WhatsApp &gt; API Setup</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  System User Permanent Access Token
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder={config?.has_access_token ? `Current: ${config.masked_token} (enter to update)` : "Enter EAAB..."}
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Use the 24-hr Temporary Token for fast testing, or generate a Permanent System User Token.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Meta Graph API Version
                  </label>
                  <input
                    type="text"
                    value={apiVersion}
                    onChange={(e) => setApiVersion(e.target.value)}
                    placeholder="v21.0"
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">e.g. v21.0 or v22.0</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Default Country Code
                  </label>
                  <input
                    type="text"
                    value={defaultCountryCode}
                    onChange={(e) => setDefaultCountryCode(e.target.value)}
                    placeholder="91"
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Prepended to 10-digit Indian numbers automatically.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Webhook Verify Token
                  </label>
                  <input
                    type="text"
                    value={webhookToken}
                    onChange={(e) => setWebhookToken(e.target.value)}
                    placeholder="insure_wa_webhook_secret_key"
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Secret string set in Meta App &gt; Webhooks</p>
                </div>
              </div>
            </div>

            {/* Template Names */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Approved Message Templates
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Policy Created Template Name
                  </label>
                  <input
                    type="text"
                    value={policyTemplate}
                    onChange={(e) => setPolicyTemplate(e.target.value)}
                    placeholder="insurance_policy_issued"
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Default: insurance_policy_issued</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Receipt Template Name
                  </label>
                  <input
                    type="text"
                    value={paymentTemplate}
                    onChange={(e) => setPaymentTemplate(e.target.value)}
                    placeholder="payment_receipt_collected"
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Default: payment_receipt_collected</p>
                </div>
              </div>
            </div>

            {/* Automation Toggles */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Automation Toggles
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200/80 hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={autoPolicy}
                    onChange={(e) => setAutoPolicy(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Auto-send on Policy Creation</span>
                    <span className="text-[11px] text-slate-500">Sends WhatsApp message when insurance record is added or renewed</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200/80 hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={autoPayment}
                    onChange={(e) => setAutoPayment(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Auto-send on Payment</span>
                    <span className="text-[11px] text-slate-500">Sends WhatsApp receipt when a payment is collected</span>
                  </div>
                </label>
              </div>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200/80 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Master WhatsApp Sending Enable</span>
                  <span className="text-[11px] text-slate-500">Turn off to temporarily stop all outgoing WhatsApp notifications</span>
                </div>
              </label>
            </div>

            {/* Form Actions */}
            <div className="pt-3 flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={savingConfig}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {savingConfig && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Save WhatsApp Configuration</span>
              </button>
            </div>
          </form>

          {/* Webhook Configuration Information */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-600" />
                <span>Meta Webhook Endpoint Information</span>
              </h4>
              <button
                type="button"
                onClick={handleCopyWebhook}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
              >
                {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedWebhook ? "Copied!" : "Copy Webhook URL"}</span>
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              In Meta Developer App &gt; <strong>WhatsApp &gt; Configuration &gt; Webhook</strong>, set:
            </p>
            <div className="bg-white p-3 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 break-all select-all flex items-center justify-between">
              <span>{webhookUrl}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Verify Token: <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-slate-800">{webhookToken}</code>. Subscribe to the <code className="font-semibold text-slate-800">messages</code> event to receive real-time delivered and read receipts!
            </p>
          </div>
        </div>

        {/* 3. Live Test Message Sidebar Tool (1 Col) */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-600" />
                <span>Test WhatsApp Sending</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Send a real test message immediately to verify your credentials.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recipient Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    placeholder="e.g. 919876543210"
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Must be in your Meta Sandbox allowlist if using test number.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Message Type
                </label>
                <select
                  value={testType}
                  onChange={(e) => setTestType(e.target.value as "direct_text" | "template_policy" | "template_payment")}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
                >
                  <option value="direct_text">Direct Text Ping (Testing Sandbox)</option>
                  <option value="template_policy">Policy Issued Template Preview</option>
                  <option value="template_payment">Payment Receipt Template Preview</option>
                </select>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl border text-xs leading-relaxed ${
                    testResult.success
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold mb-0.5">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span>{testResult.success ? "Send Success" : "Send Failed"}</span>
                  </div>
                  <p>{testResult.message}</p>
                  {testResult.wamid && (
                    <p className="text-[10px] text-emerald-700 font-mono mt-1 break-all">
                      WAMID: {testResult.wamid}
                    </p>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleSendTest}
                disabled={sendingTest}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {sendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Send Live Test Message</span>
              </button>
            </div>
          </div>

          {/* Quick Guide Reference Card */}
          <div className="bg-blue-50/70 rounded-2xl border border-blue-200/80 p-5 space-y-3">
            <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>5-Step Setup Checklist</span>
            </h4>
            <ol className="text-xs text-blue-950 space-y-2 list-decimal list-inside leading-relaxed">
              <li>
                <strong>Create Meta App:</strong> Go to developers.facebook.com &gt; Create App &gt; Select &quot;Business&quot; &gt; Add WhatsApp.
              </li>
              <li>
                <strong>Sandbox Testing:</strong> Add your phone in &quot;API Setup&quot; to test immediately with free trial messages.
              </li>
              <li>
                <strong>Permanent Token:</strong> In Meta Business Settings &gt; System Users &gt; Generate token with <code className="font-mono bg-blue-100 px-1 py-0.5 rounded text-[11px]">whatsapp_business_messaging</code>.
              </li>
              <li>
                <strong>Create Templates:</strong> Submit <code className="font-mono bg-blue-100 px-1 py-0.5 rounded text-[11px]">insurance_policy_issued</code> and <code className="font-mono bg-blue-100 px-1 py-0.5 rounded text-[11px]">payment_receipt_collected</code> under Utility.
              </li>
              <li>
                <strong>Add Payment Card:</strong> In Meta Business Suite &gt; Billing &gt; Add card to enable live delivery to all customers.
              </li>
            </ol>
            <div className="pt-2 border-t border-blue-200/60">
              <p className="text-[11px] text-blue-800">
                Detailed step-by-step documentation is available in <code className="font-mono font-semibold">META_WHATSAPP_SETUP_GUIDE.md</code>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Delivery Logs & Audit Trail */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <RotateCw className="w-4 h-4 text-blue-600" />
              <span>Recent WhatsApp Delivery Logs</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time audit history of dispatched WhatsApp messages and delivery statuses.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchLogs}
            disabled={loadingLogs}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loadingLogs ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {loadingLogs ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            Loading delivery logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs sm:text-sm">
            No WhatsApp messages sent yet. Use the test tool above or create an insurance policy to test!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Customer / Record</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const isSent = log.status === "sent";
                  const isDelivered = log.status === "delivered";
                  const isRead = log.status === "read";
                  const isFailed = log.status === "failed";

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {log.formatted_date || log.created_at}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">{log.message_type}</span>
                        {log.is_test && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            TEST
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                        {log.recipient_phone}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {log.customer_name ? (
                          <div>
                            <span className="font-semibold text-slate-800">{log.customer_name}</span>
                            {log.policy_number && (
                              <span className="text-[11px] text-slate-400 ml-1.5">
                                ({log.policy_number})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[11px] ${
                            isRead
                              ? "bg-blue-100 text-blue-700"
                              : isDelivered
                              ? "bg-emerald-100 text-emerald-700"
                              : isSent
                              ? "bg-slate-100 text-slate-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {isRead && <CheckCircle2 className="w-3 h-3 text-blue-600" />}
                          {isDelivered && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {isFailed && <XCircle className="w-3 h-3 text-red-600" />}
                          <span className="capitalize">{log.status}</span>
                        </span>
                        {log.error_message && (
                          <p className="text-[10px] text-red-600 mt-0.5 max-w-xs truncate" title={log.error_message}>
                            {log.error_message}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleResend(log.id)}
                          disabled={resendingLogId === log.id}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer disabled:opacity-50"
                        >
                          {resendingLogId === log.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RotateCw className="w-3 h-3" />
                          )}
                          <span>Resend</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

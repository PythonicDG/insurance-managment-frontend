import { InsuranceRecordItem } from "@/lib/api";

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  current: {
    label: "Current",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  active: {
    label: "Current",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  expiring_today: {
    label: "Expiring Today",
    className: "bg-amber-50 text-amber-800 border-amber-300",
  },
  expiring_soon: {
    label: "Expiring Soon",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  expired: {
    label: "Needs Renewal",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
  scheduled: {
    label: "Scheduled",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  renewed: {
    label: "Renewed",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  inactive: {
    label: "Inactive",
    className: "bg-slate-100 text-slate-600 border-slate-200",
  },
};

export function getPolicyLifecycleStatus(record: InsuranceRecordItem): string {
  return (
    record.lifecycle_status ||
    (record.is_active ? record.status || "current" : record.status || "inactive")
  ).toLowerCase();
}

export function PolicyLifecycleBadge({
  record,
  compact = false,
}: {
  record: InsuranceRecordItem;
  compact?: boolean;
}) {
  const status = getPolicyLifecycleStatus(record);
  const config = STATUS_STYLES[status] || {
    label: status.replace(/_/g, " ") || "Unknown",
    className: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border font-semibold ${config.className} ${
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      }`}
    >
      {config.label}
    </span>
  );
}

"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function CustomersPage() {
  return (
    <DashboardLayout title="Customers">
      <div className="w-full min-h-[calc(100vh-10rem)] bg-white rounded-2xl border border-slate-200/60 shadow-xs" />
    </DashboardLayout>
  );
}

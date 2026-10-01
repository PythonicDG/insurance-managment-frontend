"use client";

import { type ReactNode } from "react";

interface KpiCardProps {
  title: string;
  value: string;
  className: string;
  children: ReactNode;
}

export function KpiCard({ title, value, className, children }: KpiCardProps) {
  return (
    <div className="relative min-w-0 hover:z-30 focus-within:z-30">
      {/* Preserve the original grid footprint while the visible card floats above it. */}
      <div aria-hidden="true" inert className={`${className} invisible h-full pointer-events-none`}>
        {children}
      </div>
      <div
        tabIndex={0}
        aria-label={`${title}: ${value}`}
        className={`${className} group/kpi absolute inset-x-0 top-0 min-h-full overflow-visible transition-[left,right,transform,box-shadow] duration-200 ease-out hover:-inset-x-2 sm:hover:-inset-x-4 lg:hover:-inset-x-8 hover:-translate-y-1.5 hover:min-h-[calc(100%+0.375rem)] hover:shadow-xl focus-visible:-inset-x-2 sm:focus-visible:-inset-x-4 lg:focus-visible:-inset-x-8 focus-visible:-translate-y-1.5 focus-visible:min-h-[calc(100%+0.375rem)] focus-visible:shadow-xl outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:transition-none`}
      >
        {children}
      </div>
    </div>
  );
}

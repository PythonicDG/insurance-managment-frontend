"use client";

import { useId } from "react";
import {
  INSURANCE_FILTER_MONTHS,
  getInsuranceFilterPeriod,
  getInsuranceFilterRange,
} from "@/lib/insurance-date-filter";

interface MonthYearFilterProps {
  fromDate: string;
  toDate: string;
  onChange: (range: { fromDate: string; toDate: string }) => void;
}

export function MonthYearFilter({ fromDate, toDate, onChange }: MonthYearFilterProps) {
  const id = useId();
  const { month, year } = getInsuranceFilterPeriod(fromDate, toDate);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 41 }, (_, index) => currentYear + 10 - index);
  if (year && !years.includes(Number(year))) years.push(Number(year));
  const inputClass = "w-full px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer";
  const labelClass = "block text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1";

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label htmlFor={`${id}-month`} className={labelClass}>Month</label>
        <select
          id={`${id}-month`}
          value={month}
          onChange={(event) => onChange(getInsuranceFilterRange(event.target.value, year || String(currentYear)))}
          className={inputClass}
        >
          <option value="">All months</option>
          {INSURANCE_FILTER_MONTHS.map((name, index) => (
            <option key={name} value={String(index + 1).padStart(2, "0")}>{name}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${id}-year`} className={labelClass}>Year</label>
        <select
          id={`${id}-year`}
          value={year}
          onChange={(event) => onChange(getInsuranceFilterRange(month, event.target.value))}
          className={inputClass}
        >
          <option value="">All time</option>
          {years.sort((a, b) => b - a).map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

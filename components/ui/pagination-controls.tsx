"use client";

import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export function PaginationControls({
  currentPage,
  pageSize,
  totalCount,
  itemLabel,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}: PaginationControlsProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startRecord = totalCount === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endRecord = Math.min(safeCurrentPage * pageSize, totalCount);

  const pages = useMemo<(number | "...")[]>(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }
    if (safeCurrentPage <= 3) {
      return [1, 2, 3, "...", totalPages];
    }
    if (safeCurrentPage >= totalPages - 2) {
      return [1, "...", totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", safeCurrentPage, "...", totalPages];
  }, [safeCurrentPage, totalPages]);

  return (
    <div className="p-4 sm:p-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-slate-500">
      <div className="flex flex-wrap items-center gap-3">
        <p>
          {totalCount === 0 ? (
            <span>Showing 0 of 0 {itemLabel}</span>
          ) : (
            <span>
              Showing <span className="font-semibold text-slate-800">{startRecord}-{endRecord}</span>{" "}
              of <span className="font-semibold text-slate-800">{totalCount.toLocaleString("en-IN")}</span>{" "}
              {itemLabel}
            </span>
          )}
        </p>

        {totalCount > pageSizeOptions[0] && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="text-slate-300">|</span>
            <label htmlFor={`page-size-${itemLabel.replace(/\s+/g, "-")}`}>Rows per page:</label>
            <select
              id={`page-size-${itemLabel.replace(/\s+/g, "-")}`}
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="px-2 py-1 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium cursor-pointer"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {totalPages > 1 && totalCount > 0 && (
        <nav className="flex items-center gap-1.5 self-end sm:self-auto select-none" aria-label={`${itemLabel} pagination`}>
          <button
            type="button"
            disabled={safeCurrentPage <= 1}
            onClick={() => onPageChange(safeCurrentPage - 1)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded-lg font-medium cursor-pointer transition-colors"
            title="Previous page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          {pages.map((page, index) =>
            typeof page === "number" ? (
              <button
                key={`page-${page}`}
                type="button"
                onClick={() => onPageChange(page)}
                aria-label={`Go to page ${page}`}
                aria-current={page === safeCurrentPage ? "page" : undefined}
                className={`w-7 h-7 rounded-lg font-semibold flex items-center justify-center cursor-pointer transition-colors ${
                  page === safeCurrentPage
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {page}
              </button>
            ) : (
              <span key={`dots-${index}`} className="px-1 text-slate-400" aria-hidden="true">...</span>
            )
          )}

          <button
            type="button"
            disabled={safeCurrentPage >= totalPages}
            onClick={() => onPageChange(safeCurrentPage + 1)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded-lg font-medium cursor-pointer transition-colors"
            title="Next page"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </nav>
      )}
    </div>
  );
}

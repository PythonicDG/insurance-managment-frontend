/**
 * Date Utility Functions
 *
 * Prevents UTC-midnight date shift issues by using the client's local calendar
 * methods (getFullYear, getMonth, getDate) instead of .toISOString() which converts to UTC.
 */

/**
 * Returns a date formatted as "YYYY-MM-DD" using local calendar time (not UTC).
 */
export function formatLocalDateISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Safely parses a "YYYY-MM-DD" string into a local Date object.
 * Avoids standard JS Date constructor interpreting date-only strings as UTC midnight.
 */
export function parseLocalDate(dateStr: string): Date {
  const cleanStr = dateStr.split("T")[0];
  const parts = cleanStr.split("-").map(Number);
  if (parts.length === 3 && parts[0] > 1000) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date(dateStr);
}

/**
 * Formats a "YYYY-MM-DD" or ISO date string into a user-friendly date format (e.g. "19 Sep 2026").
 */
export function formatDisplayDate(
  dateStr?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateStr) return "—";
  try {
    const cleanStr = dateStr.split("T")[0];
    const parts = cleanStr.split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString("en-GB", options || {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", options || {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Returns today's local date as "YYYY-MM-DD".
 */
export function getTodayDateString(): string {
  return formatLocalDateISO(new Date());
}

/**
 * Returns the date one year from now (or from baseDate) formatted as "YYYY-MM-DD".
 */
export function getNextYearDateString(baseDate: Date | string = new Date()): string {
  if (!baseDate) return "";
  const d = typeof baseDate === "string" ? parseLocalDate(baseDate) : new Date(baseDate);
  if (isNaN(d.getTime())) return "";
  const nextYear = new Date(d);
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  return formatLocalDateISO(nextYear);
}

export const INSURANCE_FILTER_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function getInsuranceFilterPeriod(fromDate: string, toDate: string) {
  const year = fromDate.slice(0, 4);
  const month = fromDate.slice(5, 7);
  const isFullYear = fromDate === `${year}-01-01` && toDate === `${year}-12-31`;
  return { year, month: isFullYear ? "" : month };
}

export function getInsuranceFilterRange(month: string, year: string) {
  if (!year) return { fromDate: "", toDate: "" };
  if (!month) return { fromDate: `${year}-01-01`, toDate: `${year}-12-31` };
  const lastDay = new Date(Number(year), Number(month), 0).getDate();
  return {
    fromDate: `${year}-${month}-01`,
    toDate: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function getInsuranceFilterLabel(fromDate: string, toDate: string) {
  const { month, year } = getInsuranceFilterPeriod(fromDate, toDate);
  if (!year) return "All time";
  return month ? `${INSURANCE_FILTER_MONTHS[Number(month) - 1]} ${year}` : `All months, ${year}`;
}

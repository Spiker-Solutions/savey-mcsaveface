/**
 * Format a monetary amount from minor units (e.g., cents) to display string
 */
export function formatMoney(
  amountInMinorUnits: number,
  currency: string = "USD",
  locale: string = "en-US",
): string {
  const amount = amountInMinorUnits / 100;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * Parse a display amount to minor units (e.g., $10.50 -> 1050)
 */
export function parseMoneyToMinorUnits(displayAmount: number): number {
  return Math.round(displayAmount * 100);
}

/**
 * Format a percentage from basis points (0-10000) to display string
 */
export function formatPercentage(
  basisPoints: number,
  locale: string = "en-US",
): string {
  const percentage = basisPoints / 100;
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(percentage / 100);
}

/**
 * Parse a percentage to basis points (e.g., 25% -> 2500)
 */
export function parsePercentageToBasisPoints(percentage: number): number {
  return Math.round(percentage * 100);
}

/**
 * Format a date for display in user's locale (treats dates as UTC to avoid timezone shifts)
 */
export function formatDate(
  date: Date | string,
  locale: string = "en-US",
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  },
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: "UTC",
  }).format(d);
}

/**
 * Normalize a local date to UTC noon to avoid timezone shift issues
 * This ensures the date stays the same regardless of timezone
 */
export function normalizeToUTCNoon(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}T12:00:00.000Z`;
}

/**
 * Format a date range for display (treats dates as UTC to avoid timezone shifts)
 */
export function formatDateRange(
  startDate: Date | string,
  endDate: Date | string,
  locale: string = "en-US",
): string {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;

  // Use UTC methods to avoid timezone conversion
  const formatter = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  const yearFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    timeZone: "UTC",
  });

  const startStr = formatter.format(start);
  const endStr = formatter.format(end);
  const year = yearFormatter.format(end);

  return `${startStr} - ${endStr}, ${year}`;
}

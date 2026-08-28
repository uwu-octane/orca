const DAY_MILLISECONDS = 86_400_000;

export function shiftGa4Date(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf())) throw new RangeError("Invalid GA4 date.");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// FORK: locale plugin — optional locale param (default keeps the original
// en-US padding guarantees for server-side date keys).
export function ga4DateInTimeZone(
  now: Date,
  timeZone: string,
  locale: string = "en-US",
): string {
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const byType = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${byType.year}-${byType.month}-${byType.day}`;
}

export function inclusiveGa4Days(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  return Math.round((end.valueOf() - start.valueOf()) / DAY_MILLISECONDS) + 1;
}

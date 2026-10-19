import { getIntlLocale, readActiveLocale } from "@/plugins/locale";
import { translate } from "@/plugins/locale";
const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
];

/** "3 hours ago" for an ISO timestamp; "just now" under a minute. */
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = then - Date.now();
  const absolute = Math.abs(diff);
  const formatter = new Intl.RelativeTimeFormat(
    getIntlLocale(readActiveLocale()),
    { numeric: "auto" },
  );
  for (const [unit, ms] of RELATIVE_UNITS) {
    if (absolute >= ms) return formatter.format(Math.round(diff / ms), unit);
  }
  return translate("just now");
}

import { zh, type ShellKey } from "./locales/shell";

/** Translation function: `{name}` interpolation, English passthrough on
 *  miss. The ShellKey overload type-checks static string literals; dynamic
 *  keys (nav labels, error codes) resolve at runtime and are covered by
 *  tests instead. */
export type T = (
  key: string,
  params?: Record<string, string | number>,
) => string;

export function translate(
  key: ShellKey,
  params?: Record<string, string | number>,
): string;
export function translate(
  key: string,
  params?: Record<string, string | number>,
): string;
export function translate(
  key: string,
  params?: Record<string, string | number>,
): string {
  const template = isShellKey(key) ? zh[key] : key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match: string, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

function isShellKey(key: string): key is ShellKey {
  return key in zh;
}

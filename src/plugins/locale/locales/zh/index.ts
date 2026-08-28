import { shellZh } from "./shell";
import { dashboardZh } from "./dashboard";
import { domainZh } from "./domain";

/**
 * zh dictionary — the merged key set across every dictionary the locale
 * plugin carries. The shell scope lives in shell.ts; feature dictionaries
 * join here as their pages are translated (one file per feature, keys are
 * the English source strings — there is no separate en dictionary because
 * English IS the keys).
 *
 * Every dictionary added here extends `ShellKey`, so static `t("literal")`
 * call sites get compile-time checking for its keys automatically.
 */
export const zh = { ...shellZh, ...dashboardZh, ...domainZh } as const;

export type ShellKey = keyof typeof zh;

import { shellZh } from "./shell";
import { dashboardZh } from "./dashboard";
import { domainZh } from "./domain";
import { auditZh } from "./audit";
import { keywordsZh } from "./keywords";
import { savedKeywordsZh } from "./saved-keywords";
import { backlinksZh } from "./backlinks";
import { rankTrackingZh } from "./rank-tracking";
import { gscZh } from "./gsc";
import { searchPerformanceZh } from "./search-performance";
import { lighthouseZh } from "./lighthouse";
import { aiSearchZh } from "./ai-search";
import { billingZh } from "./billing";
import { projectsZh } from "./projects";
import { onboardingZh } from "./onboarding";
import { samZh } from "./sam";
import { ga4Zh } from "./ga4";
import { routesZh } from "./routes";

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
export const zh = {
  ...shellZh,
  ...dashboardZh,
  ...domainZh,
  ...auditZh,
  ...keywordsZh,
  ...savedKeywordsZh,
  ...backlinksZh,
  ...rankTrackingZh,
  ...gscZh,
  ...searchPerformanceZh,
  ...lighthouseZh,
  ...aiSearchZh,
  ...billingZh,
  ...projectsZh,
  ...onboardingZh,
  ...samZh,
  ...ga4Zh,
  ...routesZh,
} as const;

export type ShellKey = keyof typeof zh;

import type { LocaleService } from "@/plugins/locale";

/** Service typings shared by both sides. Each plugin declares its service on
 *  the cordis Context here (billing/seoData/mcp are seams in
 *  docs/PLUGINS.md, not yet provided). */
declare module "cordis" {
  interface Context {
    locale: LocaleService;
  }
}

import type { LocaleService } from "@/plugins/locale";

/** Locale is shared by both sides. Server capability declarations live with
 * their owning plugins so this module does not import server implementations. */
declare module "cordis" {
  interface Context {
    locale: LocaleService;
  }
}

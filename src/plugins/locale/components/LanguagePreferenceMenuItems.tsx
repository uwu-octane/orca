import { Languages } from "lucide-react";
import { useLocale } from "@/plugins/client/context";
import type { LocalePreference } from "@/plugins/locale";

/**
 * Language radio group for the sidebar user menu, mounted next to
 * ThemePreferenceMenuItems. Locale options are self-described (中文 /
 * English — dsh convention, never translated); the system option uses the
 * dict like the theme group.
 */
const LANGUAGE_OPTIONS: {
  value: LocalePreference;
  selfDescribed: boolean;
  label: string;
}[] = [
  { value: "system", selfDescribed: false, label: "System" },
  { value: "zh", selfDescribed: true, label: "中文" },
  { value: "en", selfDescribed: true, label: "English" },
];

export function LanguagePreferenceMenuItems() {
  const { t, preference, setPreference } = useLocale();

  return (
    <>
      <li className="menu-title pt-2">
        <span>{t("Language")}</span>
      </li>

      <li>
        <div
          role="radiogroup"
          aria-label={t("Language")}
          className="flex gap-0.5 rounded-lg bg-base-200 p-0.5"
        >
          {LANGUAGE_OPTIONS.map((option) => {
            const isActive = option.value === preference;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isActive}
                aria-label={
                  option.selfDescribed ? option.label : t(option.label)
                }
                className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                  isActive
                    ? "bg-base-100 text-base-content shadow-sm"
                    : "text-base-content/50 hover:text-base-content/80"
                }`}
                onClick={() => setPreference(option.value)}
              >
                <Languages className="size-3.5" />
                {option.selfDescribed ? option.label : t(option.label)}
              </button>
            );
          })}
        </div>
      </li>
    </>
  );
}

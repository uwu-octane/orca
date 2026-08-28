import { useLocale } from "@/plugins/client/context";
import type { LocalePreference } from "@/plugins/locale";

const OPTIONS: {
  value: LocalePreference;
  selfDescribed: boolean;
  label: string;
}[] = [
  { value: "system", selfDescribed: false, label: "System" },
  { value: "zh", selfDescribed: true, label: "中文" },
  { value: "en", selfDescribed: true, label: "English" },
];

/** Language selector row for the settings page, beside Appearance. */
export function LanguageSettingsSection() {
  const { t, preference, setPreference } = useLocale();

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold">{t("Language")}</h2>
      <div className="flex gap-1 rounded-lg bg-base-200 p-0.5 w-fit">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`btn btn-sm px-3 ${
              option.value === preference ? "btn-active" : "btn-ghost"
            }`}
            onClick={() => setPreference(option.value)}
          >
            {option.selfDescribed ? option.label : t(option.label)}
          </button>
        ))}
      </div>
    </div>
  );
}

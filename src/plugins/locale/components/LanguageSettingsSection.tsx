import { useLocale } from "@/plugins/client/context";
import { LanguagePreferenceRadio } from "./LanguagePreferenceMenuItems";

export function LanguageSettingsSection() {
  const { t } = useLocale();
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="text-sm">{t("Language")}</span>
      <LanguagePreferenceRadio />
    </div>
  );
}

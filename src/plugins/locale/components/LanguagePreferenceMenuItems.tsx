import { Languages } from "lucide-react";
import { SegmentedToggle } from "@/client/components/SegmentedToggle";
import {
  DropdownMenuGroup,
  DropdownMenuLabel,
} from "@/client/components/ui/dropdown-menu";
import { useLocale } from "@/plugins/client/context";
import type { LocalePreference } from "@/plugins/locale";

const OPTIONS: { value: LocalePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "zh", label: "中文" },
  { value: "en", label: "English" },
];

export function LanguagePreferenceRadio() {
  const { t, preference, setPreference } = useLocale();
  return (
    <SegmentedToggle
      items={OPTIONS.map((option) => ({
        ...option,
        label: option.value === "system" ? t(option.label) : option.label,
        icon: <Languages />,
      }))}
      value={preference}
      onChange={setPreference}
      showLabels
    />
  );
}

export function LanguagePreferenceMenuItems() {
  const { t } = useLocale();
  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel>{t("Language")}</DropdownMenuLabel>
      <div className="px-1 pb-1">
        <LanguagePreferenceRadio />
      </div>
    </DropdownMenuGroup>
  );
}

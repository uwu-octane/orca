// FORK: retain locale subscriptions across upstream component changes.
import { useLocale } from "@/plugins/client/context";
import type { ReactNode } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { SegmentedToggle } from "@/client/components/SegmentedToggle";
import {
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/client/components/ui/dropdown-menu";
import { type ThemePreference, useThemePreference } from "@/client/lib/theme";

const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: ReactNode;
}[] = [
  { value: "system", label: "System", icon: <Monitor /> },
  { value: "light", label: "Light", icon: <Sun /> },
  { value: "dark", label: "Dark", icon: <Moon /> },
];

/** System / Light / Dark segmented radio, shared by Settings and account menus. */
export function ThemePreferenceRadio() {
  const { t } = useLocale();
  const { themePreference, setThemePreference } = useThemePreference();

  return (
    <SegmentedToggle
      items={THEME_OPTIONS.map((option) => ({
        ...option,
        label: t(option.label),
      }))}
      value={themePreference}
      onChange={setThemePreference}
    />
  );
}

export function ThemePreferenceDropdownItems() {
  const { t } = useLocale();

  const { themePreference, setThemePreference } = useThemePreference();

  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel>{t("Theme")}</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={themePreference}
        onValueChange={(value) => {
          const option = THEME_OPTIONS.find((item) => item.value === value);
          if (option) setThemePreference(option.value);
        }}
      >
        {THEME_OPTIONS.map(({ value, label, icon }) => (
          <DropdownMenuRadioItem key={value} value={value}>
            {icon} {label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenuGroup>
  );
}

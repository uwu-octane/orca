import { useLocale } from "@/plugins/client/context";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/client/components/ui/combobox";
import type { GoogleKeywordLanguage } from "@/types/schemas/google-keyword-targeting";

export function GoogleLanguageSelect({
  options,
  value,
  onChange,
  disabled,
  loading,
}: {
  options: GoogleKeywordLanguage[];
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  loading: boolean;
}) {
  const { t } = useLocale();
  return (
    <Combobox
      items={options.filter((item) => item.targetable)}
      value={options.find((item) => item.id === value) ?? null}
      disabled={disabled}
      itemToStringLabel={(item) => t(item.name)}
      isItemEqualToValue={(item, selected) => item.id === selected.id}
      filter={(item, query) =>
        `${t(item.name)} ${item.name} ${item.code}`
          .toLowerCase()
          .includes(query.trim().toLowerCase())
      }
      autoHighlight
      onValueChange={(item) => onChange(item?.id ?? "")}
    >
      <ComboboxInput
        className="col-span-2 h-10 w-full lg:w-44 lg:shrink-0"
        placeholder={loading ? t("Loading languages…") : t("Language")}
        aria-label={t("Language")}
        aria-busy={loading}
        disabled={disabled}
      />
      <ComboboxContent>
        <ComboboxEmpty>{t("No languages found.")}</ComboboxEmpty>
        <ComboboxList>
          {(item: GoogleKeywordLanguage) => (
            <ComboboxItem key={item.id} value={item}>
              {t(item.name)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

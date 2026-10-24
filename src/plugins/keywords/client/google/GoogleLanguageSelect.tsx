import { useMemo, useState } from "react";
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
import { searchGoogleLanguages } from "./googleTargetingSearch";

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
  const [query, setQuery] = useState("");
  const items = useMemo(
    () => searchGoogleLanguages(options, query, t),
    [options, query, t],
  );
  return (
    <Combobox
      items={items}
      value={options.find((item) => item.id === value) ?? null}
      disabled={disabled}
      itemToStringLabel={(item) => t(item.name)}
      isItemEqualToValue={(item, selected) => item.id === selected.id}
      filter={null}
      onInputValueChange={(text, details) => {
        if (details.reason === "input-change") setQuery(text);
        if (details.reason === "input-clear") setQuery("");
      }}
      onOpenChange={(open) => {
        if (!open) setQuery("");
      }}
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

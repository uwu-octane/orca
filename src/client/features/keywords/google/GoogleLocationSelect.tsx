import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "@/plugins/client/context";
import { useDebouncedDraft } from "@/client/hooks/useDebouncedDraft";
import { Button } from "@/client/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/client/components/ui/combobox";
import { searchGoogleKeywordLocations } from "@/serverFunctions/googleKeywords";
import type { GoogleKeywordLocation } from "@/types/schemas/google-keyword-targeting";

export function GoogleLocationSelect({
  projectId,
  options,
  value,
  onChange,
  disabled,
  loading,
}: {
  projectId: string;
  options: GoogleKeywordLocation[];
  value: GoogleKeywordLocation[];
  onChange: (value: GoogleKeywordLocation[]) => void;
  disabled: boolean;
  loading: boolean;
}) {
  const { t, active } = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useDebouncedDraft(query, setQuery, (text) =>
    text.trim(),
  );
  const search = useQuery({
    queryKey: ["googleKeywordLocations", projectId, active, query],
    queryFn: () =>
      searchGoogleKeywordLocations({
        data: { projectId, query, locale: active },
      }),
    enabled: open && !disabled && query !== "" && draft.trim() === query,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });
  const searching =
    draft.trim() !== "" && (draft.trim() !== query || search.isFetching);
  const items = draft.trim()
    ? searching
      ? []
      : (search.data ?? [])
    : [
        ...new Map(
          [
            ...value,
            ...options.filter(
              (item) =>
                item.targetType === "Country" && item.status === "ENABLED",
            ),
          ].map((item) => [item.id, item]),
        ).values(),
      ];
  const selectedLabel = value.map((item) => t(item.name)).join(", ");
  const label = loading
    ? t("Loading locations…")
    : value.length === 1
      ? selectedLabel
      : value.length
        ? t("{count} locations", { count: value.length })
        : t("Locations");

  return (
    <Combobox
      multiple
      items={items}
      value={value}
      disabled={disabled}
      open={open}
      onOpenChange={setOpen}
      filter={null}
      itemToStringLabel={(item: GoogleKeywordLocation) => t(item.name)}
      isItemEqualToValue={(item, selected) => item.id === selected.id}
      onValueChange={(next) => {
        if (next.length <= 10) onChange(next);
      }}
    >
      <ComboboxTrigger
        render={<Button type="button" variant="outline" />}
        className="col-span-2 h-10 w-full min-w-0 justify-between font-normal shadow-none lg:w-44 lg:shrink-0"
        aria-label={t("Locations")}
        aria-busy={loading}
        title={selectedLabel || undefined}
      >
        <span className="truncate">{label}</span>
      </ComboboxTrigger>
      <ComboboxContent className="w-80">
        <ComboboxInput
          placeholder={t("Search countries, regions, or cities")}
          aria-label={t("Search locations")}
          showTrigger={false}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <ComboboxEmpty>
          {searching
            ? t("Searching...")
            : search.isError && draft.trim()
              ? null
              : t("No locations found.")}
        </ComboboxEmpty>
        {draft.trim() && !searching && search.isError ? (
          <div role="alert" className="p-3 text-sm">
            {t("Unable to load locations")}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void search.refetch()}
            >
              {t("Retry")}
            </Button>
          </div>
        ) : null}
        <ComboboxList>
          {(item: GoogleKeywordLocation) => (
            <ComboboxItem
              key={item.id}
              value={item}
              disabled={
                value.length >= 10 &&
                !value.some((selected) => selected.id === item.id)
              }
            >
              <span className="min-w-0">
                <span className="block truncate">{t(item.name)}</span>
                {item.targetType !== "Country" ? (
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.canonicalName}
                  </span>
                ) : null}
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
        {value.length >= 10 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">
            {t("Up to 10 locations")}
          </p>
        ) : null}
      </ComboboxContent>
    </Combobox>
  );
}

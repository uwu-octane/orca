import type { ComponentProps } from "react";
import { Search } from "lucide-react";
import { RecentSearches } from "@/client/components/RecentSearches";
import { QueryError } from "@/client/components/QueryState";
import { SkeletonCard } from "@/client/components/SkeletonPresets";
import type { useGoogleKeywordHistory } from "./useGoogleKeywordHistory";
import { useLocale } from "@/plugins/client/context";
import type { GoogleKeywordIdeasInput } from "@/types/schemas/google-keywords";
import type {
  GoogleKeywordLocation,
  GoogleKeywordLanguage,
} from "@/types/schemas/google-keyword-targeting";

function GoogleKeywordHistoryLabel({
  input,
  options,
  failed,
}: {
  input: GoogleKeywordIdeasInput;
  options:
    | { locations: GoogleKeywordLocation[]; languages: GoogleKeywordLanguage[] }
    | undefined;
  failed: boolean;
}) {
  const { t } = useLocale();
  if (!options)
    return failed
      ? t("Unable to load locations and languages.")
      : t("Loading locations…");
  const locations = input.geoTargetIds.map((id) => {
    const location = options.locations.find((option) => option.id === id);
    if (!location) return t("Location unavailable");
    return location.targetType === "Country"
      ? t(location.name)
      : location.canonicalName;
  });
  const language = options.languages.find(
    (option) => option.id === input.languageId,
  );
  return `${locations.join(", ")} · ${language ? t(language.name) : t("Language unavailable")}`;
}

export function GoogleKeywordHistory({
  history,
  options,
  failed,
  configured,
  openSearch,
  repeatSearch,
}: {
  history: ReturnType<typeof useGoogleKeywordHistory>;
  options: ComponentProps<typeof GoogleKeywordHistoryLabel>["options"];
  failed: boolean;
  configured: boolean;
  openSearch: (id: string) => void;
  repeatSearch: (input: GoogleKeywordIdeasInput) => void;
}) {
  const { t } = useLocale();
  if (history.saved.isError)
    return (
      <QueryError
        error={history.saved.error}
        fallback={t("Failed to load keywords.")}
        onRetry={() => void history.saved.refetch()}
        isRetrying={history.saved.isFetching}
      />
    );
  if (!history.isLoaded) return <SkeletonCard />;
  return (
    <RecentSearches
      items={history.history}
      loaded={history.isLoaded}
      onRemove={history.removeItem}
      canRemove={(item) => !item.searchId}
      getKey={(item) => item.searchId ?? item.timestamp}
      emptyIcon={Search}
      emptyTitle={t("Enter a keyword to get started")}
      getTitle={(item) => item.input.keywords.join(", ")}
      getSubtitle={(item) =>
        configured ? (
          <GoogleKeywordHistoryLabel
            input={item.input}
            options={options}
            failed={failed}
          />
        ) : null
      }
      renderLink={(item, props) => (
        <button
          {...props}
          type="button"
          disabled={!item.searchId && (!configured || !options || failed)}
          onClick={() =>
            item.searchId ? openSearch(item.searchId) : repeatSearch(item.input)
          }
        />
      )}
    />
  );
}

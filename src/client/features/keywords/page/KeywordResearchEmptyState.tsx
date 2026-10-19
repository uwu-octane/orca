// FORK: retain locale subscriptions across upstream component changes.
import { useLocale } from "@/plugins/client/context";
import { Link } from "@tanstack/react-router";
import { Globe, Search } from "lucide-react";
import { EmptyState } from "@/client/components/EmptyState";
import { RecentSearches } from "@/client/components/RecentSearches";
import { LOCATIONS } from "@/client/features/keywords/utils";
import type { KeywordResearchControllerState } from "./types";

type Props = {
  controller: KeywordResearchControllerState;
  projectId: string;
};

export function KeywordResearchEmptyState({ controller, projectId }: Props) {
  // The page renders loading and error states before this component.
  if (controller.hasSearched) {
    return <NoResultsState controller={controller} />;
  }

  return <SearchHistoryState controller={controller} projectId={projectId} />;
}

function NoResultsState({
  controller,
}: {
  controller: KeywordResearchControllerState;
}) {
  const { t } = useLocale();

  const { lastSearchKeyword, lastSearchLocationCode } = controller;

  return (
    <div className="mx-auto w-full max-w-2xl pt-1">
      <EmptyState
        variant="card"
        icon={Globe}
        title={t("Not enough keyword data for this query yet")}
        description={t(
          "We could not find keyword opportunities for {keyword} in {location}.",
          {
            keyword: lastSearchKeyword,
            location: LOCATIONS[lastSearchLocationCode] || t("this location"),
          },
        )}
      />
    </div>
  );
}

function SearchHistoryState({
  controller,
  projectId,
}: {
  controller: KeywordResearchControllerState;
  projectId: string;
}) {
  const { t } = useLocale();

  return (
    <div className="pt-1">
      <RecentSearches
        items={controller.history}
        loaded={controller.historyLoaded}
        onRemove={controller.removeHistoryItem}
        emptyIcon={Search}
        emptyTitle={t("Enter a keyword to get started")}
        emptyDescription={t(
          "Search for any keyword to see volume, difficulty, CPC, and related keyword ideas.",
        )}
        getTitle={(item) => item.keyword}
        getSubtitle={(item) => item.locationName}
        renderLink={(item, props) => (
          <Link
            from="/p/$projectId/keywords"
            to="/p/$projectId/keywords"
            params={{ projectId }}
            search={{
              q: item.keyword,
              loc: item.locationCode,
              locName: item.localLocationName,
              grp: controller.preferredGroupKeywords ? true : undefined,
            }}
            replace
            {...props}
          />
        )}
      />
    </div>
  );
}

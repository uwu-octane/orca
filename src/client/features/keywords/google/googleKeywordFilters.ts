import { parseTerms } from "@/client/features/keywords/utils";
import type { GoogleKeywordResult } from "@/types/schemas/google-keywords";

export const EMPTY_GOOGLE_KEYWORD_FILTERS = {
  include: "",
  exclude: "",
  minVol: "",
  maxVol: "",
  minCpc: "",
  maxCpc: "",
  minCompetition: "",
  maxCompetition: "",
};

function inRange(value: number | null, min: string, max: string) {
  if (!min.trim() && !max.trim()) return true;
  // Missing metrics must not masquerade as zero in a range filter.
  if (value === null) return false;
  return (
    (!min.trim() || value >= Number(min)) &&
    (!max.trim() || value <= Number(max))
  );
}

export function filterGoogleKeywords(
  rows: GoogleKeywordResult["rows"],
  filters: typeof EMPTY_GOOGLE_KEYWORD_FILTERS,
) {
  const include = parseTerms(filters.include);
  const exclude = parseTerms(filters.exclude);
  return rows.filter((row) => {
    const keyword = row.keyword.toLowerCase();
    return (
      include.every((term) => keyword.includes(term)) &&
      !exclude.some((term) => keyword.includes(term)) &&
      inRange(row.searchVolume, filters.minVol, filters.maxVol) &&
      inRange(row.cpc, filters.minCpc, filters.maxCpc) &&
      inRange(row.competition, filters.minCompetition, filters.maxCompetition)
    );
  });
}

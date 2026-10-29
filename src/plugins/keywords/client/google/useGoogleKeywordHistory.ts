import { z } from "zod";
import { sortBy } from "remeda";
import { useQuery } from "@tanstack/react-query";
import { listGoogleKeywordSearches } from "@/serverFunctions/keywordDimensions";
import { useLocalHistoryStore } from "@/client/hooks/useLocalHistoryStore";
import { jsonCodec } from "@/shared/json";
import {
  googleKeywordIdeasSchema,
  type GoogleKeywordIdeasInput,
} from "@/types/schemas/google-keywords";

const historyCodec = jsonCodec(
  z.array(
    z.object({
      input: googleKeywordIdeasSchema.omit({ pageToken: true }),
      timestamp: z.number(),
      searchId: z.string().optional(),
    }),
  ),
);
type HistoryItem = z.infer<typeof historyCodec>[number];

export function useGoogleKeywordHistory(projectId: string) {
  const saved = useQuery({
    queryKey: ["googleKeywordHistory", projectId],
    queryFn: () => listGoogleKeywordSearches({ data: { projectId } }),
    retry: false,
  });
  const local = useLocalHistoryStore<
    HistoryItem,
    GoogleKeywordIdeasInput & { searchId?: string }
  >({
    storageKey: `google-keyword-history:${projectId}`,
    maxItems: 20,
    parse: (raw) => {
      const result = historyCodec.safeParse(raw);
      return result.success
        ? result.data.filter((item) => item.input.projectId === projectId)
        : null;
    },
    isSameItem: (item, input) =>
      JSON.stringify(item.input) ===
      JSON.stringify({ ...input, pageToken: undefined, searchId: undefined }),
    createItem: (input) => {
      const { pageToken: _pageToken, searchId, ...query } = input;
      return { input: query, timestamp: Date.now(), searchId };
    },
    getItemKey: (item) => item.timestamp,
  });
  const persisted: HistoryItem[] = (saved.data ?? []).map(
    ({ searchId, fetchedAt, ...input }) => ({
      input: googleKeywordIdeasSchema.parse({ ...input, projectId }),
      timestamp: Date.parse(fetchedAt),
      searchId,
    }),
  );
  // SQL is the source of saved searches across origins and devices. Keep old
  // browser-only entries as explicit repeat-search actions, not replacements
  // for missing snapshots. Do not erase those entries during this transition.
  const legacy = local.history.filter(
    (item) =>
      !persisted.some(
        (savedItem) =>
          savedItem.searchId === item.searchId ||
          JSON.stringify(savedItem.input) === JSON.stringify(item.input),
      ),
  );
  return {
    history: sortBy(
      [...persisted, ...legacy],
      [(item) => item.timestamp, "desc"],
    ),
    isLoaded: local.isLoaded && !saved.isPending,
    removeItem: local.removeItem,
    saved,
  };
}

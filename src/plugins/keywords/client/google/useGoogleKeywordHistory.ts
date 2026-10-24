import { z } from "zod";
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
    }),
  ),
);
type HistoryItem = z.infer<typeof historyCodec>[number];

export function useGoogleKeywordHistory(projectId: string) {
  return useLocalHistoryStore<HistoryItem, GoogleKeywordIdeasInput>({
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
      JSON.stringify({ ...input, pageToken: undefined }),
    createItem: (input) => {
      const { pageToken: _pageToken, ...query } = input;
      return { input: query, timestamp: Date.now() };
    },
    getItemKey: (item) => item.timestamp,
  });
}

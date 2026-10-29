import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { getGoogleAdsConnection } from "@/serverFunctions/googleAds";
import { researchGoogleKeywords } from "@/serverFunctions/googleKeywords";
import { getGoogleKeywordSearch } from "@/serverFunctions/keywordDimensions";
import type { GoogleKeywordIdeasInput } from "@/types/schemas/google-keywords";
import { useGoogleKeywordHistory } from "./useGoogleKeywordHistory";

export function useGoogleKeywordSearch(projectId: string, searchId?: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const history = useGoogleKeywordHistory(projectId);
  const savedSearch = useQuery({
    queryKey: ["googleKeywordSearch", projectId, searchId],
    queryFn: () =>
      getGoogleKeywordSearch({ data: { projectId, searchId: searchId! } }),
    enabled: Boolean(searchId),
    retry: false,
  });
  function openSearch(id: string) {
    void navigate({
      to: "/p/$projectId/keywords",
      params: { projectId },
      search: { provider: "google_ads", searchId: id },
    });
  }
  const research = useMutation({
    mutationFn: async (input: GoogleKeywordIdeasInput) => {
      // Explicit research checks the current binding and supplier cache. Opening
      // a saved snapshot above only reads the project's stored result.
      const connection = await getGoogleAdsConnection({ data: { projectId } });
      const result = await queryClient.fetchQuery({
        queryKey: [
          "googleKeywordIdeas",
          projectId,
          connection.connectionKey,
          input,
        ],
        queryFn: () => researchGoogleKeywords({ data: input }),
        staleTime: 0,
        retry: false,
      });
      return { input, result };
    },
    retry: false,
  });
  function runSearch(input: GoogleKeywordIdeasInput) {
    research.mutate(input, {
      // Per-call callbacks only run for the current mounted observer, so a
      // completed search cannot navigate back after a project/account switch.
      onSuccess: (data) => {
        queryClient.setQueryData(
          ["googleKeywordSearch", projectId, data.result.searchId],
          data,
        );
        openSearch(data.result.searchId);
        void queryClient.invalidateQueries({
          queryKey: ["googleKeywordHistory", projectId],
        });
      },
    });
  }
  return {
    savedSearch,
    current: savedSearch.data ?? null,
    research,
    runSearch,
    openSearch,
    history,
  };
}

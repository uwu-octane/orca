import type { z } from "zod";
import type { GoogleAdsCredentials } from "@/plugins/google-oauth/contracts";
import type {
  GoogleKeywordIdeasInput,
  GoogleKeywordResult,
} from "@/types/schemas/google-keywords";
import type {
  GoogleKeywordLocation,
  GoogleKeywordLanguage,
  googleTargetingOptionsInputSchema,
  googleLocationSearchInputSchema,
} from "@/types/schemas/google-keyword-targeting";

type ProjectScope = { projectId: string; organizationId: string };

/** Google Ads capabilities; IDs and targeting semantics stay provider-native. */
export interface GoogleAdsService {
  options(
    input: z.infer<typeof googleTargetingOptionsInputSchema>,
    scope: ProjectScope,
  ): Promise<{
    locations: GoogleKeywordLocation[];
    languages: GoogleKeywordLanguage[];
  }>;
  searchLocations(
    input: z.infer<typeof googleLocationSearchInputSchema>,
    scope: ProjectScope,
  ): Promise<GoogleKeywordLocation[]>;
  keywordIdeas(
    input: GoogleKeywordIdeasInput,
    credentials: GoogleAdsCredentials,
  ): Promise<GoogleKeywordResult>;
}

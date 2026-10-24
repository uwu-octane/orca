import { z } from "zod";

export const serpItemSchema = z
  .object({
    type: z.string().nullable().optional(),
    rank: z.number().nullable(),
    // Optional: rows cached before this field existed don't carry it.
    organicRank: z.number().nullable().optional(),
    title: z.string().nullable(),
    url: z.string().nullable(),
    domain: z.string().nullable(),
    description: z.string().nullable(),
  })
  .passthrough();

export type SerpItem = z.infer<typeof serpItemSchema>;

export type SerpResultsInput = {
  projectId: string;
  depth: number;
  queries: Array<{
    keyword: string;
    locationCode: number;
    languageCode: string;
    locationName?: string;
    device?: "desktop" | "mobile";
  }>;
};

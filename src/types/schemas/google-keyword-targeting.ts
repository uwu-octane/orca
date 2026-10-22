import { z } from "zod";

const googleId = z.string().regex(/^\d{1,20}$/);
export const googleTargetingOptionsInputSchema = z.object({
  projectId: z.string().min(1),
  locationIds: z.array(googleId).max(200),
});
export const googleLocationSearchInputSchema = z.object({
  projectId: z.string().min(1),
  query: z.string().trim().min(1).max(100),
  locale: z.enum(["en", "zh"]),
});
export const googleLocationSchema = z.object({
  id: googleId,
  name: z.string().min(1),
  canonicalName: z.string().min(1),
  countryCode: z.string(),
  targetType: z.string(),
  status: z.string(),
});
export const googleLanguageSchema = z.object({
  id: googleId,
  name: z.string().min(1),
  code: z.string().min(1),
  targetable: z.boolean(),
});
export type GoogleKeywordLocation = z.infer<typeof googleLocationSchema>;
export type GoogleKeywordLanguage = z.infer<typeof googleLanguageSchema>;

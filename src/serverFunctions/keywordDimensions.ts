import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireProjectContext } from "./middleware";
import {
  keywordSearchIdentitySchema,
  saveKeywordDimensionsSchema,
  generateSavedKeywordDimensionsSchema,
} from "@/types/schemas/keyword-dimensions";
// FORK: business operations resolve the installed Keywords domain.
import { getKeywords } from "@/plugins/server/context";

export const generateKeywordDimensions = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(generateSavedKeywordDimensionsSchema)
  .handler(async ({ data, context }) =>
    (await getKeywords()).generateSavedDimensions(data, context),
  );

export const getKeywordDimensions = createServerFn({ method: "GET" })
  .middleware(requireProjectContext)
  .validator(keywordSearchIdentitySchema)
  .handler(async ({ data, context }) =>
    (await getKeywords()).getSavedDimensions(data.searchId, context),
  );
export const saveKeywordDimensions = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(saveKeywordDimensionsSchema)
  .handler(async ({ data, context }) =>
    (await getKeywords()).saveDimensions(data, context),
  );
export const getGoogleKeywordSearch = createServerFn({ method: "GET" })
  .middleware(requireProjectContext)
  .validator(keywordSearchIdentitySchema)
  .handler(async ({ data, context }) =>
    (await getKeywords()).getGoogleSearch(data.searchId, context),
  );

export const listGoogleKeywordSearches = createServerFn({ method: "GET" })
  .middleware(requireProjectContext)
  .validator(z.object({ projectId: z.string().min(1) }))
  .handler(async ({ context }) =>
    (await getKeywords()).listGoogleSearches(context),
  );

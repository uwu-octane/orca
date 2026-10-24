import { createServerFn } from "@tanstack/react-start";
import { requireProjectContext } from "./middleware";
import { generateKeywordDimensionsSchema } from "@/types/schemas/keyword-dimensions";
// FORK: business operations resolve the installed Keywords domain.
import { getKeywords } from "@/plugins/server/context";

export const generateKeywordDimensions = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(generateKeywordDimensionsSchema)
  .handler(async ({ data, context }) =>
    (await getKeywords()).generateDimensions(data, context),
  );

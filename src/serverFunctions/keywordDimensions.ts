import { createServerFn } from "@tanstack/react-start";
import { requireProjectContext } from "./middleware";
import { generateKeywordDimensionsSchema } from "@/types/schemas/keyword-dimensions";
import { KeywordDimensionService } from "@/server/features/keywords/services/KeywordDimensionService";

export const generateKeywordDimensions = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(generateKeywordDimensionsSchema)
  .handler(({ data, context }) =>
    KeywordDimensionService.generate(data, context),
  );

// FORK: Keywords owns intent decisions and persistence; this is a transport adapter.
import { createServerFn } from "@tanstack/react-start";
import { requireProjectContext } from "./middleware";
import { getKeywords } from "@/plugins/server/context";
import { classifyKeywordIntentSchema } from "@/types/schemas/keyword-intent";

export const classifyKeywordIntent = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(classifyKeywordIntentSchema)
  .handler(async ({ data, context }) =>
    (await getKeywords()).classifyIntent(data, context),
  );

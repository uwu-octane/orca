import { createServerFn } from "@tanstack/react-start";
// FORK: the AI domain owns decision validation and provider selection.
import { getAi } from "@/plugins/server/context";
import { requireProjectContext } from "./middleware";
import { decisionRequestSchema } from "@/types/schemas/decision";
export const runDecision = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(decisionRequestSchema)
  .handler(async ({ data, context }) =>
    (await getAi()).decide(data.input, context, data.selection),
  );

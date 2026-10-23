import { createServerFn } from "@tanstack/react-start";
import { DecisionService } from "@/server/features/decision/DecisionService";
import { requireProjectContext } from "./middleware";
import { decisionRequestSchema } from "@/types/schemas/decision";
export const runDecision = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(decisionRequestSchema)
  .handler(({ data, context }) =>
    DecisionService.decide(data.input, context, data.selection),
  );

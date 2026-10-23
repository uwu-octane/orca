import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireProjectContext } from "./middleware";
import { GatewayModelService } from "@/server/features/ai/GatewayModelService";

export const getGatewayModels = createServerFn({ method: "GET" })
  .middleware(requireProjectContext)
  .validator(z.object({ projectId: z.string().min(1) }))
  .handler(() => GatewayModelService.list());

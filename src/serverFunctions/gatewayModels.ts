import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireProjectContext } from "./middleware";
// FORK: model catalogs resolve through the installed AI provider.
import { getAi } from "@/plugins/server/context";

export const getGatewayModels = createServerFn({ method: "GET" })
  .middleware(requireProjectContext)
  .validator(z.object({ projectId: z.string().min(1) }))
  .handler(async () => (await getAi()).listModels("vercel_gateway"));

// FORK: SAM and keyword agents share the project's saved Gateway connection.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireProjectContext } from "@/serverFunctions/middleware";
// FORK: configuration is owned by the installed AI domain.
import { getAi } from "@/plugins/server/context";

export const getSamAccessSetupStatus = createServerFn({ method: "GET" })
  .middleware(requireProjectContext)
  .validator(z.object({ projectId: z.string().min(1) }))
  .handler(async ({ context }) => {
    const config = await (
      await getAi()
    ).configuration.getConfig(context, "vercel_gateway");
    const enabled = config?.hasApiKey === true;
    return {
      enabled,
      errorMessage: enabled ? null : "AI_PROVIDER_NOT_CONFIGURED",
    };
  });

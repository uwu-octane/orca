// FORK: SAM and keyword agents share the project's saved Gateway connection.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireProjectContext } from "@/serverFunctions/middleware";
import { AiProviderConfigService } from "@/server/features/ai/AiProviderConfigService";

export const getSamAccessSetupStatus = createServerFn({ method: "GET" })
  .middleware(requireProjectContext)
  .validator(z.object({ projectId: z.string().min(1) }))
  .handler(async ({ context }) => {
    const config = await AiProviderConfigService.getConfig(
      context,
      "vercel_gateway",
    );
    const enabled = config?.hasApiKey === true;
    return {
      enabled,
      errorMessage: enabled ? null : "AI_PROVIDER_NOT_CONFIGURED",
    };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { hasOrgPermission } from "@/lib/org-permissions";
import { requireOrgPermission } from "@/server/auth/org-gate";
// FORK: configuration is owned by the installed AI domain.
import { getAi } from "@/plugins/server/context";
import { requireProjectContext } from "./middleware";
import {
  aiProviderSchema,
  saveAiProviderConfigSchema,
} from "@/types/schemas/ai-provider";

export const getAiProviderConfig = createServerFn({ method: "GET" })
  .middleware(requireProjectContext)
  .validator(
    z.object({ projectId: z.string().min(1), provider: aiProviderSchema }),
  )
  .handler(async ({ data, context }) => ({
    config: await (
      await getAi()
    ).configuration.getConfig(context, data.provider),
    canManage: hasOrgPermission(context.role, { integration: ["manage"] }),
  }));

export const saveAiProviderConfig = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(saveAiProviderConfigSchema)
  .handler(async ({ data, context }) => {
    requireOrgPermission(context, { integration: ["manage"] });
    return (await getAi()).configuration.saveConfig(data, context);
  });

export const removeAiProviderConfig = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(
    z.object({
      projectId: z.string().min(1),
      revision: z.string().min(1),
      provider: aiProviderSchema,
    }),
  )
  .handler(async ({ data, context }) => {
    requireOrgPermission(context, { integration: ["manage"] });
    await (
      await getAi()
    ).configuration.removeConfig(context, data.provider, data.revision);
    return { success: true };
  });

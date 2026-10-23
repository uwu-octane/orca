import { getAiAgents } from "@/plugins/server/context";
import {
  generateKeywordDimensionsSchema,
  type GenerateKeywordDimensionsInput,
} from "@/types/schemas/keyword-dimensions";
import { ProjectRepository } from "@/server/features/projects/repositories/ProjectRepository";
import type { AiProviderScope } from "@/plugins/ai/contracts";
import { AppError } from "@/server/lib/errors";

async function generate(
  input: GenerateKeywordDimensionsInput,
  context: AiProviderScope,
) {
  const request = generateKeywordDimensionsSchema.parse({
    ...input,
    projectId: context.projectId,
  });
  const project = await ProjectRepository.getProjectForOrganization(
    context.projectId,
    context.organizationId,
  );
  if (!project) throw new AppError("NOT_FOUND");
  return (await getAiAgents()).generateKeywordDimensions(request, context);
}

export const KeywordDimensionService = { generate };

import type { z } from "zod";
import type { Context } from "cordis";
import type {
  GenerateKeywordDimensionsInput,
  keywordDimensionsSchema,
} from "@/types/schemas/keyword-dimensions";

/** Project identity is authorized by the application or MCP transport. */
export type KeywordScope = { projectId: string; organizationId: string };
export type DimensionGenerator = (
  input: GenerateKeywordDimensionsInput,
  scope: KeywordScope,
  signal?: AbortSignal,
) => Promise<z.infer<typeof keywordDimensionsSchema>>;

/** Tool transports bind the installed domain of their own runtime. */
export type KeywordToolResolver<K extends keyof Context["keywords"]> = () =>
  | Pick<Context["keywords"], K>
  | Promise<Pick<Context["keywords"], K>>;

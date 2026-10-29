import type { LanguageModel } from "ai";
import type {
  AiProvider,
  AiProviderConfigSummary,
} from "@/types/schemas/ai-provider";
import type { DecisionInput, DecisionResponse } from "@/types/schemas/decision";
import type {
  GatewayModel,
  GatewayModelKind,
} from "@/types/schemas/gateway-model";

export interface GatewayModelPickerProps {
  projectId: string;
  kind: GatewayModelKind;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  id?: string;
  disabled?: boolean;
  className?: string;
}

export type AiProviderScope = { organizationId: string; projectId: string };
export type TextModel = Extract<LanguageModel, { specificationVersion: "v3" }>;

/** Server-only, scoped to one configuration revision and provider activation. */
export interface AiExecution {
  connection: AiProviderConfigSummary & { apiKey?: string };
  signal: AbortSignal;
  beforeRequest(): Promise<void>;
}

export interface AiProviderDefinition {
  id: AiProvider;
  languageModel?(execution: AiExecution, modelId: string): Promise<TextModel>;
  decide?(
    input: DecisionInput,
    execution: AiExecution,
    modelId: string,
  ): Promise<DecisionResponse & { durationMs: number }>;
  listModels?(signal: AbortSignal): Promise<GatewayModel[]>;
}

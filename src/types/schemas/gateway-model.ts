import { z } from "zod";

export const gatewayModelKindSchema = z.enum(["language", "evaluation"]);
export type GatewayModelKind = z.infer<typeof gatewayModelKindSchema>;
export type GatewayModel = {
  id: string;
  name: string;
  kind: GatewayModelKind;
  creator: string;
  inputPrice: number | null;
  outputPrice: number | null;
  contextWindow: number | null;
  capabilities: string[];
  released: number | null;
  zeroDataRetention: "all" | "some" | "none" | null;
  noTraining: "all" | "some" | "none" | null;
};

import type { Tool } from "ai";
import type { ToolAuthContext } from "@/server/mcp/context";

export type SamUserScope = { userId: string; organizationId: string };
export type SamProjectScope = SamUserScope & { projectId: string };
export type SamSessionSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};
export type SamToolContext = {
  auth: ToolAuthContext;
  project: { id: string; domain: string | null };
  turnId?: string;
};
export type SamToolFactory = (context: SamToolContext) => Tool | Promise<Tool>;

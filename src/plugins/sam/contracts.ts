import type { z, ZodRawShape } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/server";
import type { ToolAuthContext, ToolContext } from "@/server/mcp/context";
import type { Tool } from "ai";

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

/** Shared tool contract for domain contributions to SAM and external MCP. */
export type SamMcpToolDefinition<Shape extends ZodRawShape> = {
  name: string;
  config: { description: string; inputSchema: Shape };
  handler: (
    args: z.infer<z.ZodObject<Shape>>,
    context: ToolContext,
  ) => Promise<CallToolResult>;
};

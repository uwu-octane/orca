// FORK: SAM owns session operations; this file is the authenticated transport.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  requireAuthenticatedContext,
  requireProjectContext,
} from "@/serverFunctions/middleware";
import { getSam } from "@/plugins/server/context";

const projectScopedSchema = z.object({ projectId: z.string().min(1) });
export const listSamSessions = createServerFn({ method: "GET" })
  .middleware(requireProjectContext)
  .validator(projectScopedSchema)
  .handler(async ({ context }) => (await getSam()).sessions.list(context));
export const createSamSession = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(projectScopedSchema)
  .handler(async ({ context }) => (await getSam()).sessions.create(context));
export const archiveSamSession = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .validator(z.object({ sessionId: z.string().min(1) }))
  .handler(async ({ data, context }) =>
    (await getSam()).sessions.archive(data.sessionId, context),
  );

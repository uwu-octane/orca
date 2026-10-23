// FORK: SAM and keyword agents share the project's saved Gateway connection.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireProjectContext } from "@/serverFunctions/middleware";
// FORK: SAM resolves setup through its injected AI service.
import { getSam } from "@/plugins/server/context";

export const getSamAccessSetupStatus = createServerFn({ method: "GET" })
  .middleware(requireProjectContext)
  .validator(z.object({ projectId: z.string().min(1) }))
  .handler(async ({ context }) => (await getSam()).setup(context));

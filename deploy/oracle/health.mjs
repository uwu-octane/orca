import { z } from "zod";
const response = await fetch(
  `http://127.0.0.1:${process.env.PORT || 8989}/api/health`,
  {
    signal: AbortSignal.timeout(8000),
  },
);
const body = z
  .object({ status: z.literal("ok"), authMode: z.literal("cloudflare_access") })
  .safeParse(await response.json());
process.exit(response.ok && body.success ? 0 : 1);

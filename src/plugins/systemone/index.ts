import type { Context } from "cordis";

export const name = "systemone";
export const inject = ["ai"];

export function apply(ctx: Context) {
  for (const id of ["typesafe", "systemone"] as const) {
    ctx.ai.register({
      id,
      decide: async (input, execution, model) =>
        (await import("@/plugins/shared/systemone")).executeSystemOneDecision(
          input,
          execution,
          model,
          execution.connection.endpoint,
        ),
    });
  }
}

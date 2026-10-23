import type { Context } from "cordis";

export const name = "systemone";
export const inject = ["aiModels"];

export function apply(ctx: Context) {
  for (const id of ["typesafe", "systemone"] as const) {
    ctx.aiModels.register({
      id,
      decide: async (input, scope, selection) =>
        (
          await import("@/server/features/decision/systemOneRequest")
        ).executeSystemOneDecision(input, scope, {
          ...selection,
          provider: id,
        }),
    });
  }
}

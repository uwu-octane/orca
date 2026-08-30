// FORK: the upstream `new Function` evaluator is banned in workerd ("Code
// generation from strings disallowed" at module load, regardless of use).
// `!js` expressions are unsupported on this platform — callers that reach
// this path (e.g. an entry whose `disabled` is a !!js expression) get an
// explicit error. See docs/PLUGINS.md.

/** Evaluate a JavaScript expression against a loader context scope. */
export function evaluate(_ctx: object, _expr: string): never {
  throw new Error(
    "!js expressions are unsupported on this platform (see docs/PLUGINS.md)",
  );
}

/** Return true when a value is a serialized loader JavaScript expression. */
export function isJsExpr(value: any): value is JsExpr {
  return value instanceof Object && "__jsExpr" in value;
}

/** Serialized JavaScript expression produced by the include YAML tag. */
export interface JsExpr {
  __jsExpr: string;
}

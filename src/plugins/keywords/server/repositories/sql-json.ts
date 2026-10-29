import { sql, type SQL } from "drizzle-orm";
import { getDatabaseProvider } from "@/db/provider";

// JSON is only the bound transport for bulk inserts, never the stored model.
// Set-based writes keep a 500-keyword page below D1's query/parameter limits.
export function jsonRows(value: SQL) {
  return getDatabaseProvider() === "postgres"
    ? sql`jsonb_array_elements(${value}::jsonb)`
    : sql`json_each(${value})`;
}

export function jsonField(
  value: SQL,
  key: string,
  type: "text" | "bigint" | "double precision" | "json" | "boolean" = "text",
) {
  if (getDatabaseProvider() !== "postgres")
    return sql`json_extract(${value}, ${`$.${key}`})`;
  if (type === "json") return sql`(${value} -> ${key})`;
  return sql`cast(${value} ->> ${key} as ${sql.raw(type)})`;
}

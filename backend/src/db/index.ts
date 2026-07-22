import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema"

export function createDb<TSchema extends Record<string, unknown>>(
  sqlitePath: string,
  dbSchema: TSchema,
) {
  const sqlite = new Database(sqlitePath);
  return drizzle({ client: sqlite })
}

export const db = createDb(process.env.DB_FILE_NAME!, schema)

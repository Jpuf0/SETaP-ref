import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { relations } from "./relations";
import * as schema from "./schema";

export function createDb(
  sqlitePath: string,
) {
  const sqlite = new Database(sqlitePath);
  return drizzle({ client: sqlite, relations: { ...relations, ...schema.authRelations } })
}

export const db = createDb(process.env.DB_FILE_NAME!)

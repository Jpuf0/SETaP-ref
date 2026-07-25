import Database from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { relations } from "../src/db/relations";
import * as schema from "../src/db/schema";

export function createTestDb() {
  // const sqlite = new Database("test.db");
  const sqlite = new Database(":memory:");
  sqlite.run("PRAGMA foreign_keys = ON;");
  const db = drizzle({ client: sqlite, relations: { ...relations, ...schema.authRelations } });
  migrate(db, { migrationsFolder: "./drizzle" });
  return db;
}

export type TestDb = ReturnType<typeof createTestDb>;

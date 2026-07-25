import { mock } from "bun:test";
import { createTestDb } from "./setup";

export const dbHolder: { current: ReturnType<typeof createTestDb> } = {
  current: createTestDb(),
}

// bun's mock.module() calls the factory once and snapshots the returned
// object's properties, so a plain `get db()` accessor is only ever read a
// single time. Using a Proxy instead means every property/method access on
// `db` is forwarded to whatever `dbHolder.current` is *at that moment*, so
// reassigning it in beforeEach() actually takes effect.
const dbProxy = new Proxy({} as ReturnType<typeof createTestDb>, {
  get(_target, prop, _receiver) {
    const current = dbHolder.current as unknown as Record<PropertyKey, unknown>;
    const value = current[prop];
    return typeof value === "function" ? value.bind(current) : value;
  },
});

mock.module("@/db", () => ({
  db: dbProxy,
}));

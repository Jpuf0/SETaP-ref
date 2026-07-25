import { beforeEach, describe, expect, it } from "bun:test";
import { dbHolder } from "./db.mock";
import { createTestDb } from "./setup";
import { areaOfInterest, user } from "../src/db/schema";
import { db } from "@/db";

beforeEach(() => {
  dbHolder.current = createTestDb();
});

describe("test db setup", () => {
  it("applies migrations and can insert/query a row", async () => {
    const [staff] = await db
      .insert(user)
      .values({
        id: "staff-1",
        name: "John Doe",
        email: "john@example.com",
        emailVerified: false,
        role: "staff",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    await db.insert(areaOfInterest).values({
      staffId: staff.id,
      label: "Graph Theory",
    });

    const rows = await db.query.areaOfInterest.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].staffId).toBe(staff.id);
    expect(rows[0].label).toBe("Graph Theory");
  });
})

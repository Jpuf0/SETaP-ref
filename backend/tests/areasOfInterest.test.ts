import { beforeEach, describe, expect, it } from "bun:test";
import { dbHolder } from "./db.mock";
import * as schema from "../src/db/schema";
import { createTestDb } from "./setup";
import * as service from "../src/services/areasOfInterest.service";
import { db } from "@/db";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";

async function insertUser(id: string, role: "staff" | "student" = "staff") {
  await db.insert(schema.user).values({
    id,
    name: id,
    email: `${id}@example.com`,
    emailVerified: false,
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

beforeEach(async () => {
  dbHolder.current = createTestDb();

  await insertUser("staff-1");
  await insertUser("staff-2");
});

describe("areasOfInterest.service", () => {
  describe("list", () => {
    it("returns an empty array when none exist", async () => {
      expect(await service.list("staff-1")).toEqual([]);
    });

    it("only returns rows for the given staffId", async () => {
      await service.create("staff-1", { label: "Graph Theory" })
      await service.create("staff-2", { label: "Machine Learning" })

      const rows = await service.list("staff-1");
      expect(rows).toHaveLength(1);
      expect(rows[0].label).toBe("Graph Theory")
    });
  });

  describe("create", () => {
    it("succeeds with a valid label", async () => {
      const row = await service.create("staff-1", { label: "Graph Theory"})
      expect(row).toBeDefined();
      expect(row.staffId).toBe("staff-1");
      expect(row.label).toBe("Graph Theory");
    })

    it("rejects with an empty label", async () => {
      await expect(service.create("staff-1", { label: "" })).rejects.toThrow(ValidationError);
    })

    it("rejects with a over-length label", async () => {
      await expect(service.create("staff-1", { label: "a".repeat(101) })).rejects.toThrow(ValidationError);
    })
  })

  describe("update", () => {
    it("succeeds as owner", async () => {
      const row = await service.create("staff-1", { label: "Graph Theory" })
      const updated = await service.update("staff-1", row.id, { label: "Graphs" })
      expect(updated).toBeDefined();
      expect(updated.staffId).toBe("staff-1");
      expect(updated.label).toBe("Graphs");
    })

    it("throws ForbiddenError for a non-owner", async () => {
      const row = await service.create("staff-1", { label: "Graph Theory" })
      await expect(service.update("staff-2", row.id, { label: "Graphs" })).rejects.toThrow(ForbiddenError);
    })

    it("throws ValidationError on an invalid label", async () => {
      const row = await service.create("staff-1", { label: "Graph Theory" })
      await expect(service.update("staff-1", row.id, { label: "" })).rejects.toThrow(ValidationError);
    })

    it("throws NotFoundError for an unknown id", async () => {
      await expect(service.update("staff-1", "does-not-exist", { label: "Graphs" })).rejects.toThrow(NotFoundError);
    })
  })

  describe.todo("remove", () => {
    it("deletes an untagged interest", async () => {})

    it("returns a 'tagged' rejection and deletes nothing when tagged and confirm is omitted", async () => {})

    it("deletes join rows and the interest when confirm is true, idea itself survives untagged", async () => {})

    it("throws ForbiddenError for a non-owner", async () => {})

    it("throws NotFoundError for an unknown id", async () => {})
  })
})

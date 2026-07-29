import { beforeEach, describe, expect, it } from "bun:test";
import { dbHolder } from "./db.mock";
import * as schema from "../src/db/schema";
import { createTestDb } from "./setup";
import { insertUser } from "./helpers";
import * as service from "../src/services/areasOfInterest.service";
import { db } from "@/db";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";

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

  describe("remove", () => {
    it("deletes an untagged interest", async () => {
      const area = await service.create("staff-1", { label: "Graph Theory" });

      const result = await service.remove("staff-1", area.id);

      expect(result).toEqual({ ok: true });
      expect(await service.list("staff-1")).toEqual([]);
    });

    it("returns a 'tagged' rejection and deletes nothing when tagged and confirm is omitted", async () => {
      const area = await service.create("staff-1", { label: "Graph Theory" });
      const [idea] = await db
        .insert(schema.projectIdea)
        .values({ staffId: "staff-1", title: "Idea", description: "Description" })
        .returning();
      await db
        .insert(schema.projectIdeaInterest)
        .values({ projectIdeaId: idea.id, areaOfInterestId: area.id });

      const result = await service.remove("staff-1", area.id);

      expect(result).toEqual({
        ok: false,
        reason: "tagged",
        taggedIdeas: [{ id: idea.id, title: idea.title }],
      });
      expect(await service.list("staff-1")).toHaveLength(1);
    });

    it("deletes join rows and the interest when confirm is true, idea itself survives untagged", async () => {
      const area = await service.create("staff-1", { label: "Graph Theory" });
      const [idea] = await db
        .insert(schema.projectIdea)
        .values({ staffId: "staff-1", title: "Idea", description: "Description" })
        .returning();
      await db
        .insert(schema.projectIdeaInterest)
        .values({ projectIdeaId: idea.id, areaOfInterestId: area.id });

      const result = await service.remove("staff-1", area.id, { confirm: true });

      expect(result).toEqual({ ok: true });
      expect(await service.list("staff-1")).toEqual([]);

      const survivingIdea = await db.query.projectIdea.findFirst({ where: { id: idea.id } });
      expect(survivingIdea).toBeDefined();

      const joins = await db.query.projectIdeaInterest.findMany({
        where: { projectIdeaId: idea.id },
      });
      expect(joins).toHaveLength(0);
    });

    it("throws ForbiddenError for a non-owner", async () => {
      const area = await service.create("staff-1", { label: "Graph Theory" });
      await expect(service.remove("staff-2", area.id)).rejects.toThrow(ForbiddenError);
    });

    it("throws NotFoundError for an unknown id", async () => {
      await expect(service.remove("staff-1", "does-not-exist")).rejects.toThrow(NotFoundError);
    });
  })
})

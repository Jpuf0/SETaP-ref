import { beforeEach, describe, expect, it } from "bun:test";
import { dbHolder } from "./db.mock";
import { createTestDb } from "./setup";
import { insertUser } from "./helpers";
import * as service from "../src/services/projectIdeas.service";
import * as areasService from "../src/services/areasOfInterest.service";
import { NotFoundError, ValidationError } from "@/lib/errors";

beforeEach(async () => {
  dbHolder.current = createTestDb();

  await insertUser("staff-1");
  await insertUser("staff-2");
});

describe("projectIdeas.service", () => {
  describe("listForStaff", () => {
    it("returns an empty array when none exist", async () => {
      expect(await service.listForStaff("staff-1")).toEqual([]);
    });

    it("only returns ideas for the given staffId, with interests attached", async () => {
      const area = await areasService.create("staff-1", { label: "Graph Theory" });
      await service.create("staff-1", {
        title: "Idea A",
        description: "Desc A",
        interestIds: [area.id],
      });
      await service.create("staff-2", { title: "Idea B", description: "Desc B" });

      const rows = await service.listForStaff("staff-1");
      expect(rows).toHaveLength(1);
      expect(rows[0].title).toBe("Idea A");
      expect(rows[0].interests.map((i) => i.id)).toEqual([area.id]);
    });
  });

  describe("getById", () => {
    it("throws NotFoundError for an unknown id", async () => {
      await expect(service.getById("does-not-exist")).rejects.toThrow(NotFoundError);
    });

    it("returns the idea with interests attached", async () => {
      const area = await areasService.create("staff-1", { label: "Graph Theory" });
      const idea = await service.create("staff-1", {
        title: "Idea A",
        description: "Desc A",
        interestIds: [area.id],
      });

      const result = await service.getById(idea.id);
      expect(result.title).toBe("Idea A");
      expect(result.interests.map((i) => i.id)).toEqual([area.id]);
    });
  });

  describe("create", () => {
    it("succeeds with valid input", async () => {
      const idea = await service.create("staff-1", { title: "Idea A", description: "Desc A" });
      expect(idea.staffId).toBe("staff-1");
      expect(idea.title).toBe("Idea A");
      expect(idea.status).toBe("open");
    });

    it("rejects an empty title", async () => {
      await expect(
        service.create("staff-1", { title: "  ", description: "Desc A" }),
      ).rejects.toThrow(ValidationError);
    });

    it("rejects an over-length title", async () => {
      await expect(
        service.create("staff-1", { title: "a".repeat(151), description: "Desc A" }),
      ).rejects.toThrow(ValidationError);
    });

    it("succeeds with a title at exactly the 150-character upper boundary", async () => {
      const idea = await service.create("staff-1", {
        title: "a".repeat(150),
        description: "Desc A",
      });
      expect(idea.title).toHaveLength(150);
    });

    it("rejects an empty description", async () => {
      await expect(
        service.create("staff-1", { title: "Idea A", description: " " }),
      ).rejects.toThrow(ValidationError);
    });

    it("rejects an over-length description", async () => {
      await expect(
        service.create("staff-1", { title: "Idea A", description: "a".repeat(2001) }),
      ).rejects.toThrow(ValidationError);
    });

    it("succeeds with a description at exactly the 2000-character upper boundary", async () => {
      const idea = await service.create("staff-1", {
        title: "Idea A",
        description: "a".repeat(2000),
      });
      expect(idea.description).toHaveLength(2000);
    });

    it("rejects interestIds not owned by the staff member", async () => {
      const foreignArea = await areasService.create("staff-2", { label: "ML" });
      await expect(
        service.create("staff-1", {
          title: "Idea A",
          description: "Desc A",
          interestIds: [foreignArea.id],
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("update", () => {
    it("succeeds as owner, keeping unspecified fields", async () => {
      const idea = await service.create("staff-1", { title: "Idea A", description: "Desc A" });
      const updated = await service.update("staff-1", idea.id, { title: "Idea A2" });
      expect(updated.title).toBe("Idea A2");
      expect(updated.description).toBe("Desc A");
    });

    it("throws NotFoundError for a non-owner", async () => {
      // getOwned() filters by staffId in the query itself, so a mismatched
      // owner looks identical to a missing row - it never reaches the
      // ForbiddenError check below.
      const idea = await service.create("staff-1", { title: "Idea A", description: "Desc A" });
      await expect(service.update("staff-2", idea.id, { title: "New" })).rejects.toThrow(
        NotFoundError,
      );
    });

    it("throws NotFoundError for an unknown id", async () => {
      await expect(service.update("staff-1", "does-not-exist", { title: "New" })).rejects.toThrow(
        NotFoundError,
      );
    });

    it("throws ValidationError on an invalid title", async () => {
      const idea = await service.create("staff-1", { title: "Idea A", description: "Desc A" });
      await expect(service.update("staff-1", idea.id, { title: "" })).rejects.toThrow(
        ValidationError,
      );
    });

    it("rejects interestIds not owned by the staff member", async () => {
      const idea = await service.create("staff-1", { title: "Idea A", description: "Desc A" });
      const foreignArea = await areasService.create("staff-2", { label: "ML" });
      await expect(
        service.update("staff-1", idea.id, { interestIds: [foreignArea.id] }),
      ).rejects.toThrow(ValidationError);
    });

    it("replaces interest tags when interestIds is provided", async () => {
      const areaA = await areasService.create("staff-1", { label: "Graph Theory" });
      const areaB = await areasService.create("staff-1", { label: "ML" });
      const idea = await service.create("staff-1", {
        title: "Idea A",
        description: "Desc A",
        interestIds: [areaA.id],
      });

      await service.update("staff-1", idea.id, { interestIds: [areaB.id] });

      const result = await service.getById(idea.id);
      expect(result.interests.map((i) => i.id)).toEqual([areaB.id]);
    });

    it("leaves interest tags unchanged when interestIds is omitted", async () => {
      const area = await areasService.create("staff-1", { label: "Graph Theory" });
      const idea = await service.create("staff-1", {
        title: "Idea A",
        description: "Desc A",
        interestIds: [area.id],
      });

      await service.update("staff-1", idea.id, { title: "Idea A2" });

      const result = await service.getById(idea.id);
      expect(result.interests.map((i) => i.id)).toEqual([area.id]);
    });
  });

  describe("setAvailability", () => {
    it("updates status as owner", async () => {
      const idea = await service.create("staff-1", { title: "Idea A", description: "Desc A" });
      const updated = await service.setAvailability("staff-1", idea.id, "taken");
      expect(updated.status).toBe("taken");
    });

    it("throws NotFoundError for a non-owner", async () => {
      const idea = await service.create("staff-1", { title: "Idea A", description: "Desc A" });
      await expect(service.setAvailability("staff-2", idea.id, "taken")).rejects.toThrow(
        NotFoundError,
      );
    });

    it("throws NotFoundError for an unknown id", async () => {
      await expect(service.setAvailability("staff-1", "does-not-exist", "taken")).rejects.toThrow(
        NotFoundError,
      );
    });

    it("throws ValidationError for an invalid status", async () => {
      const idea = await service.create("staff-1", { title: "Idea A", description: "Desc A" });
      await expect(
        service.setAvailability("staff-1", idea.id, "bogus" as never),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("remove", () => {
    it("deletes the idea as owner", async () => {
      const idea = await service.create("staff-1", { title: "Idea A", description: "Desc A" });
      await service.remove("staff-1", idea.id);
      await expect(service.getById(idea.id)).rejects.toThrow(NotFoundError);
    });

    it("throws NotFoundError for a non-owner", async () => {
      const idea = await service.create("staff-1", { title: "Idea A", description: "Desc A" });
      await expect(service.remove("staff-2", idea.id)).rejects.toThrow(NotFoundError);
    });

    it("throws NotFoundError for an unknown id", async () => {
      await expect(service.remove("staff-1", "does-not-exist")).rejects.toThrow(NotFoundError);
    });
  });
});

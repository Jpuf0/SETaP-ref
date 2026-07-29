import { beforeEach, describe, expect, it } from "bun:test";
import { dbHolder } from "./db.mock";
import { createTestDb } from "./setup";
import { insertUser } from "./helpers";
import * as service from "../src/services/expressionsOfInterest.service";
import * as ideasService from "../src/services/projectIdeas.service";

beforeEach(async () => {
  dbHolder.current = createTestDb();

  await insertUser("staff-1");
  await insertUser("student-1", "student");
  await insertUser("student-2", "student");
});

describe("expressionsOfInterest.service", () => {
  describe("register", () => {
    it("succeeds for an open idea", async () => {
      const idea = await ideasService.create("staff-1", { title: "Idea", description: "Desc" });

      const result = await service.register("student-1", idea.id);

      expect(result).toEqual({ ok: true, id: expect.any(String) });
    });

    it("returns idea-not-found for an unknown idea id", async () => {
      const result = await service.register("student-1", "does-not-exist");
      expect(result).toEqual({ ok: false, reason: "idea-not-found" });
    });

    it("returns idea-taken when the idea is not open", async () => {
      const idea = await ideasService.create("staff-1", { title: "Idea", description: "Desc" });
      await ideasService.setAvailability("staff-1", idea.id, "taken");

      const result = await service.register("student-1", idea.id);

      expect(result).toEqual({ ok: false, reason: "idea-taken" });
    });

    it("returns already-registered for a duplicate registration", async () => {
      const idea = await ideasService.create("staff-1", { title: "Idea", description: "Desc" });
      await service.register("student-1", idea.id);

      const result = await service.register("student-1", idea.id);

      expect(result).toEqual({ ok: false, reason: "already-registered" });
    });
  });

  describe("listForStaffIdeas", () => {
    it("returns an empty array when there are no registrations", async () => {
      expect(await service.listForStaffIdeas("staff-1")).toEqual([]);
    });

    it("only returns registrations for the given staff member's ideas", async () => {
      const idea = await ideasService.create("staff-1", { title: "Idea", description: "Desc" });
      await insertUser("staff-2");
      const otherIdea = await ideasService.create("staff-2", {
        title: "Other Idea",
        description: "Desc",
      });

      await service.register("student-1", idea.id);
      await service.register("student-2", otherIdea.id);

      const rows = await service.listForStaffIdeas("staff-1");
      expect(rows).toHaveLength(1);
      expect(rows[0].projectIdeaId).toBe(idea.id);
      expect(rows[0].studentId).toBe("student-1");
    });
  });
});

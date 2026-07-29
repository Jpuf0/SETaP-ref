import { beforeEach, describe, expect, it } from "bun:test";
import { dbHolder } from "./db.mock";
import { createTestDb } from "./setup";
import { insertUser } from "./helpers";
import * as service from "../src/services/staff.service";
import * as areasService from "../src/services/areasOfInterest.service";
import * as ideasService from "../src/services/projectIdeas.service";
import { NotFoundError } from "@/lib/errors";

beforeEach(() => {
  dbHolder.current = createTestDb();
});

describe("staff.service", () => {
  describe("list", () => {
    it("returns an empty array when there are no staff users", async () => {
      expect(await service.list()).toEqual([]);
    });

    it("excludes non-staff users", async () => {
      await insertUser("student-1", "student");
      expect(await service.list()).toEqual([]);
    });

    it("returns staff with their areas of interest attached", async () => {
      await insertUser("staff-1");
      const area = await areasService.create("staff-1", { label: "Graph Theory" });

      const rows = await service.list();

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe("staff-1");
      expect(rows[0].areasOfInterest.map((a) => a.id)).toEqual([area.id]);
    });

    it("falls back to createdAt for lastUpdated when there are no areas or ideas", async () => {
      const staffUser = await insertUser("staff-1");

      const rows = await service.list();

      expect(rows[0].lastUpdated).toEqual(staffUser.createdAt);
    });

    it("filters by label, case-insensitively", async () => {
      await insertUser("staff-1");
      await insertUser("staff-2");
      await areasService.create("staff-1", { label: "Graph Theory" });
      await areasService.create("staff-2", { label: "Machine Learning" });

      const rows = await service.list({ label: "graph" });

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe("staff-1");
    });

    it("returns an empty array when the label filter matches no staff", async () => {
      await insertUser("staff-1");
      await areasService.create("staff-1", { label: "Graph Theory" });

      const rows = await service.list({ label: "underwater basket weaving" });

      expect(rows).toEqual([]);
    });
  });

  describe("getStaffProfile", () => {
    it("throws NotFoundError for an unknown id", async () => {
      await expect(service.getStaffProfile("does-not-exist")).rejects.toThrow(NotFoundError);
    });

    it("throws NotFoundError for a non-staff user", async () => {
      await insertUser("student-1", "student");
      await expect(service.getStaffProfile("student-1")).rejects.toThrow(NotFoundError);
    });

    it("returns the profile with areas and project ideas", async () => {
      await insertUser("staff-1");
      const area = await areasService.create("staff-1", { label: "Graph Theory" });
      const idea = await ideasService.create("staff-1", { title: "Idea", description: "Desc" });

      const profile = await service.getStaffProfile("staff-1");

      expect(profile.id).toBe("staff-1");
      expect(profile.areasOfInterest.map((a) => a.id)).toEqual([area.id]);
      expect(profile.projectIdeas.map((i) => i.id)).toEqual([idea.id]);
    });
  });
});

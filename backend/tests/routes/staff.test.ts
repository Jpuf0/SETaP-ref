import { beforeEach, describe, expect, it } from "bun:test";
import { dbHolder } from "../db.mock";
import { createTestDb } from "../setup";
import { signInAs, signOut } from "../auth.mock";
import { insertUser } from "../helpers";
import { createApp } from "../../src/app";

const app = createApp();

beforeEach(async () => {
  dbHolder.current = createTestDb();
  signOut();
  await insertUser("staff-1");
  await insertUser("student-1", "student");
});

describe("GET /staff", () => {
  it("is rejected without a session", async () => {
    const response = await app.handle(new Request("http://localhost/staff"));
    expect(response.status).toBe(403);
  });

  it("is viewable by any authenticated role", async () => {
    signInAs({ id: "student-1", role: "student" });
    const response = await app.handle(new Request("http://localhost/staff"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe("staff-1");
  });

  it("passes the label query param through to the filter", async () => {
    signInAs({ id: "student-1", role: "student" });
    const response = await app.handle(new Request("http://localhost/staff?label=graph"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });
});

describe("GET /staff/:id", () => {
  it("is rejected without a session", async () => {
    const response = await app.handle(new Request("http://localhost/staff/staff-1"));
    expect(response.status).toBe(403);
  });

  it("returns 404 for an unknown id", async () => {
    signInAs({ id: "student-1", role: "student" });
    const response = await app.handle(new Request("http://localhost/staff/does-not-exist"));
    expect(response.status).toBe(404);
  });

  it("returns the staff profile", async () => {
    signInAs({ id: "student-1", role: "student" });
    const response = await app.handle(new Request("http://localhost/staff/staff-1"));
    expect(response.status).toBe(200);
    expect((await response.json()).id).toBe("staff-1");
  });
});

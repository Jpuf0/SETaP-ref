import { beforeEach, describe, expect, it } from "bun:test";
import { dbHolder } from "../db.mock";
import { createTestDb } from "../setup";
import { signInAs, signOut } from "../auth.mock";
import { insertUser } from "../helpers";
import { createApp } from "../../src/app";

const app = createApp();

async function postIdeaAsStaff1(title = "Idea") {
  signInAs({ id: "staff-1", role: "staff" });
  const response = await app.handle(
    new Request("http://localhost/project-ideas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, description: "Description" }),
    }),
  );
  return response.json() as Promise<{ id: string }>;
}

beforeEach(async () => {
  dbHolder.current = createTestDb();
  signOut();
  await insertUser("staff-1");
  await insertUser("student-1", "student");
  await insertUser("student-2", "student");
});

describe("GET /expressions-of-interest/mine", () => {
  it("is rejected without a session", async () => {
    const response = await app.handle(
      new Request("http://localhost/expressions-of-interest/mine"),
    );
    expect(response.status).toBe(403);
  });

  it("is rejected for a student", async () => {
    signInAs({ id: "student-1", role: "student" });
    const response = await app.handle(
      new Request("http://localhost/expressions-of-interest/mine"),
    );
    expect(response.status).toBe(403);
  });

  it("returns registrations for the signed-in staff member's ideas", async () => {
    const idea = await postIdeaAsStaff1();

    signInAs({ id: "student-1", role: "student" });
    await app.handle(
      new Request("http://localhost/expressions-of-interest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectIdeaId: idea.id }),
      }),
    );

    signInAs({ id: "staff-1", role: "staff" });
    const response = await app.handle(
      new Request("http://localhost/expressions-of-interest/mine"),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveLength(1);
    expect(body[0].studentId).toBe("student-1");
  });
});

describe("POST /expressions-of-interest", () => {
  it("is rejected without a session", async () => {
    const idea = await postIdeaAsStaff1();
    const response = await app.handle(
      new Request("http://localhost/expressions-of-interest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectIdeaId: idea.id }),
      }),
    );
    expect(response.status).toBe(403);
  });

  it("is rejected for staff", async () => {
    const idea = await postIdeaAsStaff1();
    signInAs({ id: "staff-1", role: "staff" });
    const response = await app.handle(
      new Request("http://localhost/expressions-of-interest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectIdeaId: idea.id }),
      }),
    );
    expect(response.status).toBe(403);
  });

  it("rejects a malformed body with 422", async () => {
    signInAs({ id: "student-1", role: "student" });
    const response = await app.handle(
      new Request("http://localhost/expressions-of-interest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    expect(response.status).toBe(422);
  });

  it("succeeds (200) for an open idea", async () => {
    const idea = await postIdeaAsStaff1();
    signInAs({ id: "student-1", role: "student" });

    const response = await app.handle(
      new Request("http://localhost/expressions-of-interest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectIdeaId: idea.id }),
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, id: expect.any(String) });
  });

  it("returns a 200 with a rejection reason for an unknown idea id, not a 404", async () => {
    // register() is a business-rule outcome, not an HTTP-level error - the
    // service returns a discriminated union rather than throwing.
    signInAs({ id: "student-1", role: "student" });
    const response = await app.handle(
      new Request("http://localhost/expressions-of-interest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectIdeaId: "does-not-exist" }),
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: false, reason: "idea-not-found" });
  });
});

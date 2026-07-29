import { beforeEach, describe, expect, it } from "bun:test";
import { dbHolder } from "../db.mock";
import { createTestDb } from "../setup";
import { signInAs, signOut } from "../auth.mock";
import { insertUser } from "../helpers";
import { createApp } from "../../src/app";
import * as schema from "../../src/db/schema";
import { db } from "@/db";

const app = createApp();

async function postInterest(label: string) {
  const response = await app.handle(
    new Request("http://localhost/interests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label }),
    }),
  );
  return response.json() as Promise<{ id: string; staffId: string; label: string }>;
}

beforeEach(async () => {
  dbHolder.current = createTestDb();
  signOut();
  await insertUser("staff-1");
  await insertUser("staff-2");
  await insertUser("student-1", "student");
});

describe("GET /interests", () => {
  it("is rejected without a session", async () => {
    const response = await app.handle(new Request("http://localhost/interests"));
    expect(response.status).toBe(403);
  });

  it("is rejected for a student", async () => {
    signInAs({ id: "student-1", role: "student" });
    const response = await app.handle(new Request("http://localhost/interests"));
    expect(response.status).toBe(403);
  });

  it("returns the signed-in staff member's own areas of interest", async () => {
    signInAs({ id: "staff-1", role: "staff" });
    await postInterest("Graph Theory");

    signInAs({ id: "staff-2", role: "staff" });
    await postInterest("Machine Learning");

    signInAs({ id: "staff-1", role: "staff" });
    const response = await app.handle(new Request("http://localhost/interests"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveLength(1);
    expect(body[0].label).toBe("Graph Theory");
  });
});

describe("POST /interests", () => {
  it("is rejected without a session", async () => {
    const response = await app.handle(
      new Request("http://localhost/interests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label: "Graph Theory" }),
      }),
    );
    expect(response.status).toBe(403);
  });

  it("rejects a malformed body with 422", async () => {
    signInAs({ id: "staff-1", role: "staff" });
    const response = await app.handle(
      new Request("http://localhost/interests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    expect(response.status).toBe(422);
  });

  it("rejects an empty label with the domain 400, not a 500", async () => {
    signInAs({ id: "staff-1", role: "staff" });
    const response = await app.handle(
      new Request("http://localhost/interests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label: "" }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("creates and returns the new row for a signed-in staff member", async () => {
    signInAs({ id: "staff-1", role: "staff" });
    const response = await app.handle(
      new Request("http://localhost/interests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label: "Graph Theory" }),
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.staffId).toBe("staff-1");
    expect(body.label).toBe("Graph Theory");
  });
});

describe("PUT /interests/:id", () => {
  it("returns 404 for an unknown id", async () => {
    signInAs({ id: "staff-1", role: "staff" });
    const response = await app.handle(
      new Request("http://localhost/interests/does-not-exist", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label: "New" }),
      }),
    );
    expect(response.status).toBe(404);
  });

  it("returns 403 for a non-owner", async () => {
    signInAs({ id: "staff-1", role: "staff" });
    const created = await postInterest("Graph Theory");

    signInAs({ id: "staff-2", role: "staff" });
    const response = await app.handle(
      new Request(`http://localhost/interests/${created.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label: "Hijacked" }),
      }),
    );
    expect(response.status).toBe(403);
  });

  it("updates the label for the owner", async () => {
    signInAs({ id: "staff-1", role: "staff" });
    const created = await postInterest("Graph Theory");

    const response = await app.handle(
      new Request(`http://localhost/interests/${created.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label: "Graphs" }),
      }),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).label).toBe("Graphs");
  });
});

describe("DELETE /interests/:id", () => {
  it("returns 404 for an unknown id", async () => {
    signInAs({ id: "staff-1", role: "staff" });
    const response = await app.handle(
      new Request("http://localhost/interests/does-not-exist", { method: "DELETE" }),
    );
    expect(response.status).toBe(404);
  });

  it("deletes an untagged interest", async () => {
    signInAs({ id: "staff-1", role: "staff" });
    const created = await postInterest("Graph Theory");

    const response = await app.handle(
      new Request(`http://localhost/interests/${created.id}`, { method: "DELETE" }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("returns a 'tagged' rejection (still 200) when the area is tagged and confirm is omitted", async () => {
    signInAs({ id: "staff-1", role: "staff" });
    const created = await postInterest("Graph Theory");
    const [idea] = await db
      .insert(schema.projectIdea)
      .values({ staffId: "staff-1", title: "Idea", description: "Description" })
      .returning();
    await db
      .insert(schema.projectIdeaInterest)
      .values({ projectIdeaId: idea.id, areaOfInterestId: created.id });

    const response = await app.handle(
      new Request(`http://localhost/interests/${created.id}`, { method: "DELETE" }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "tagged",
      taggedIdeas: [{ id: idea.id, title: idea.title }],
    });
  });

  it("deletes when confirm=true is passed as a query param", async () => {
    signInAs({ id: "staff-1", role: "staff" });
    const created = await postInterest("Graph Theory");
    const [idea] = await db
      .insert(schema.projectIdea)
      .values({ staffId: "staff-1", title: "Idea", description: "Description" })
      .returning();
    await db
      .insert(schema.projectIdeaInterest)
      .values({ projectIdeaId: idea.id, areaOfInterestId: created.id });

    const response = await app.handle(
      new Request(`http://localhost/interests/${created.id}?confirm=true`, {
        method: "DELETE",
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});

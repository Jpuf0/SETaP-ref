import { beforeEach, describe, expect, it } from "bun:test";
import { dbHolder } from "../db.mock";
import { createTestDb } from "../setup";
import { signInAs, signOut } from "../auth.mock";
import { insertUser } from "../helpers";
import { createApp } from "../../src/app";

const app = createApp();

async function postIdea(title: string, description = "Description") {
  const response = await app.handle(
    new Request("http://localhost/project-ideas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, description }),
    }),
  );
  return response.json() as Promise<{ id: string; staffId: string; title: string; status: string }>;
}

beforeEach(async () => {
  dbHolder.current = createTestDb();
  signOut();
  await insertUser("staff-1");
  await insertUser("staff-2");
  await insertUser("student-1", "student");
});

describe("GET /project-ideas/mine", () => {
  it("is rejected without a session", async () => {
    const response = await app.handle(new Request("http://localhost/project-ideas/mine"));
    expect(response.status).toBe(403);
  });

  it("is rejected for a student", async () => {
    signInAs({ id: "student-1", role: "student" });
    const response = await app.handle(new Request("http://localhost/project-ideas/mine"));
    expect(response.status).toBe(403);
  });

  it("returns the signed-in staff member's own ideas", async () => {
    signInAs({ id: "staff-1", role: "staff" });
    await postIdea("Idea A");

    signInAs({ id: "staff-2", role: "staff" });
    await postIdea("Idea B");

    signInAs({ id: "staff-1", role: "staff" });
    const response = await app.handle(new Request("http://localhost/project-ideas/mine"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe("Idea A");
  });
});

describe("GET /project-ideas/:id", () => {
  it("is rejected without a session", async () => {
    const response = await app.handle(new Request("http://localhost/project-ideas/does-not-exist"));
    expect(response.status).toBe(403);
  });

  it("returns 404 for an unknown id", async () => {
    signInAs({ id: "student-1", role: "student" });
    const response = await app.handle(new Request("http://localhost/project-ideas/does-not-exist"));
    expect(response.status).toBe(404);
  });

  it("is viewable by any authenticated role", async () => {
    signInAs({ id: "staff-1", role: "staff" });
    const idea = await postIdea("Idea A");

    signInAs({ id: "student-1", role: "student" });
    const response = await app.handle(new Request(`http://localhost/project-ideas/${idea.id}`));
    expect(response.status).toBe(200);
    expect((await response.json()).title).toBe("Idea A");
  });
});

describe("POST /project-ideas", () => {
  it("is rejected without a session", async () => {
    const response = await app.handle(
      new Request("http://localhost/project-ideas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Idea A", description: "Description" }),
      }),
    );
    expect(response.status).toBe(403);
  });

  it("is rejected for a student", async () => {
    signInAs({ id: "student-1", role: "student" });
    const response = await app.handle(
      new Request("http://localhost/project-ideas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Idea A", description: "Description" }),
      }),
    );
    expect(response.status).toBe(403);
  });

  it("rejects a malformed body with 422", async () => {
    signInAs({ id: "staff-1", role: "staff" });
    const response = await app.handle(
      new Request("http://localhost/project-ideas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Idea A" }),
      }),
    );
    expect(response.status).toBe(422);
  });

  it("rejects an empty title with the domain 400, not a 500", async () => {
    signInAs({ id: "staff-1", role: "staff" });
    const response = await app.handle(
      new Request("http://localhost/project-ideas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "  ", description: "Description" }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("creates and returns the new idea for a signed-in staff member", async () => {
    signInAs({ id: "staff-1", role: "staff" });
    const response = await app.handle(
      new Request("http://localhost/project-ideas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Idea A", description: "Description" }),
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.staffId).toBe("staff-1");
    expect(body.status).toBe("open");
  });
});

describe("PUT /project-ideas/:id", () => {
  it("returns 404 for an unknown id", async () => {
    signInAs({ id: "staff-1", role: "staff" });
    const response = await app.handle(
      new Request("http://localhost/project-ideas/does-not-exist", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "New" }),
      }),
    );
    expect(response.status).toBe(404);
  });

  it("applies a partial update for the owner", async () => {
    signInAs({ id: "staff-1", role: "staff" });
    const idea = await postIdea("Idea A");

    const response = await app.handle(
      new Request(`http://localhost/project-ideas/${idea.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Idea A2" }),
      }),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).title).toBe("Idea A2");
  });
});

describe("PATCH /project-ideas/:id/availability", () => {
  it("rejects a status outside the open/taken enum with 422", async () => {
    signInAs({ id: "staff-1", role: "staff" });
    const idea = await postIdea("Idea A");

    const response = await app.handle(
      new Request(`http://localhost/project-ideas/${idea.id}/availability`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "bogus" }),
      }),
    );
    expect(response.status).toBe(422);
  });

  it("updates the status for the owner", async () => {
    signInAs({ id: "staff-1", role: "staff" });
    const idea = await postIdea("Idea A");

    const response = await app.handle(
      new Request(`http://localhost/project-ideas/${idea.id}/availability`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "taken" }),
      }),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).status).toBe("taken");
  });
});

describe("DELETE /project-ideas/:id", () => {
  it("returns 404 for an unknown id", async () => {
    signInAs({ id: "staff-1", role: "staff" });
    const response = await app.handle(
      new Request("http://localhost/project-ideas/does-not-exist", { method: "DELETE" }),
    );
    expect(response.status).toBe(404);
  });

  it("deletes the idea for the owner", async () => {
    signInAs({ id: "staff-1", role: "staff" });
    const idea = await postIdea("Idea A");

    const response = await app.handle(
      new Request(`http://localhost/project-ideas/${idea.id}`, { method: "DELETE" }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});

import { beforeEach, describe, expect, it } from "bun:test";
import { dbHolder } from "../db.mock";
import { createTestDb } from "../setup";
import { signOut } from "../auth.mock";
import { createApp } from "../../src/app";

const app = createApp();

beforeEach(() => {
  dbHolder.current = createTestDb();
  signOut();
});

describe("app", () => {
  it("GET / returns a plain OK health check", async () => {
    const response = await app.handle(new Request("http://localhost/"));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK");
  });

  it("returns Elysia's default 404 shape for an unmatched route", async () => {
    const response = await app.handle(new Request("http://localhost/does-not-exist"));
    expect(response.status).toBe(404);
  });

  it("maps a malformed request body to a 422, not a 500", async () => {
    // Regression check: the onError handler must defer to Elysia's own
    // built-in ValidationError status, or every bad request body becomes a 500.
    const response = await app.handle(
      new Request("http://localhost/interests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    expect(response.status).toBe(422);
  });
});

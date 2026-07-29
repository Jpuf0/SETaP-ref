import { mock } from "bun:test";

export type FakeUser = { id: string; role: "staff" | "student"; [key: string]: unknown };
export type FakeSession = { session: Record<string, unknown>; user: FakeUser } | null;

export const sessionHolder: { current: FakeSession } = {
  current: null,
};

export function signInAs(user: FakeUser) {
  sessionHolder.current = {
    session: { id: `test-session-${user.id}`, userId: user.id },
    user,
  };
}

export function signOut() {
  sessionHolder.current = null;
}

// Unlike db.mock.ts, no Proxy is needed here: mock.module() only snapshots
// the *object* returned by the factory once, but `getSession` itself reads
// `sessionHolder.current` fresh on every call, so reassigning it per-test
// (e.g. via signInAs/signOut) is picked up without re-registering the mock.
mock.module("@/auth", () => ({
  auth: {
    api: {
      getSession: async () => sessionHolder.current,
    },
    handler: async () => new Response("auth.handler is not mocked in tests", { status: 501 }),
  },
}));

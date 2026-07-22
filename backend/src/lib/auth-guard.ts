import Elysia from "elysia";
import { auth } from "../auth";
import { ForbiddenError } from "./errors";

export type Role = "staff" | "student";

export const sessionContext = new Elysia().derive(
  { as: "scoped" },
  async ({ request }: { request: Request }) => {
    const result = await auth.api.getSession({ headers: request.headers });
    return { session: result };
  }
);

type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

export function requireAuth(session: Session) {
  if (!session) throw new ForbiddenError("Authentication required");
  return session;
}

export function requireRole(session: Session, role: Role) {
  const authed = requireAuth(session);
  if ((authed.user as { role: Role }).role !== role) {
    throw new ForbiddenError(`Role '${role}' required`)
  }
  return authed;
}

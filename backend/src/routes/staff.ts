import { Elysia, t } from "elysia";
import { requireAuth, sessionContext } from "../lib/auth-guard";
import { getStaffProfile, list } from "../services/staff.service";

export const staffRoutes = new Elysia({ prefix: "/staff" })
  .use(sessionContext)
  .get("/", async ({ session, query }) => {
    requireAuth(session);
    return list({ label: query.label });
  }, {
    query: t.Object({
      label: t.Optional(t.String()),
    }),
  })
  .get("/:id", async ({ session, params }) => {
    requireAuth(session);
    return getStaffProfile(params.id)
  })

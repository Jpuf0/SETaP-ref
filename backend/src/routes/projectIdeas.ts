import { Elysia, t } from "elysia";
import { sessionContext, requireRole, requireAuth } from "@/lib/auth-guard";
import * as projectIdeas from "@/services/projectIdeas.service";

export const projectIdeasRoutes = new Elysia({ prefix: "/project-ideas" })
  .use(sessionContext)
  .get("/mine", async ({ session }) => {
    const { user } = requireRole(session, "staff");
    return projectIdeas.listForStaff(user.id);
  })
  .get("/:id", async ({ session, params }) => {
    requireAuth(session);
    return projectIdeas.getById(params.id);
  })
  .post(
    "/",
    async ({ session, body }) => {
      const { user } = requireRole(session, "staff");
      return projectIdeas.create(user.id, body);
    },
    {
      body: t.Object({
        title: t.String(),
        description: t.String(),
        interestIds: t.Optional(t.Array(t.String())),
      }),
    },
  )
  .put(
    "/:id",
    async ({ session, params, body }) => {
      const { user } = requireRole(session, "staff");
      return projectIdeas.update(user.id, params.id, body);
    },
    {
      body: t.Object({
        title: t.Optional(t.String()),
        description: t.Optional(t.String()),
        interestIds: t.Optional(t.Array(t.String())),
      }),
    },
  )
  .patch(
    "/:id/availability",
    async ({ session, params, body }) => {
      const { user } = requireRole(session, "staff");
      return projectIdeas.setAvailability(user.id, params.id, body.status);
    },
    { body: t.Object({ status: t.Union([t.Literal("open"), t.Literal("taken")]) }) },
  )
  .delete("/:id", async ({ session, params }) => {
    const { user } = requireRole(session, "staff");
    await projectIdeas.remove(user.id, params.id);
    return { ok: true };
  });

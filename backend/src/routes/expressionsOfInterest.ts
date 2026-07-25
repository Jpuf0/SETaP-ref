import { Elysia, t } from "elysia";
import { sessionContext, requireRole } from "@/lib/auth-guard";
import * as expressionsOfInterest from "@/services/expressionsOfInterest.service";

export const expressionsOfInterestRoutes = new Elysia({
  prefix: "/expressions-of-interest",
})
  .use(sessionContext)
  .get("/mine", async ({ session }) => {
    const { user } = requireRole(session, "staff");
    return expressionsOfInterest.listForStaffIdeas(user.id);
  })
  .post(
    "/",
    async ({ session, body }) => {
      const { user } = requireRole(session, "student");
      return expressionsOfInterest.register(user.id, body.projectIdeaId);
    },
    { body: t.Object({ projectIdeaId: t.String() }) },
  );

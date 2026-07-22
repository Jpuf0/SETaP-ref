import Elysia, { t } from "elysia";
import { requireRole, sessionContext } from "../lib/auth-guard";
import { create, list, remove, update } from "../services/areasOfInterest.service";

export const interestsRoutes = new Elysia({ prefix: "/interests" })
	.use(sessionContext)
	.get("/", async ({ session }) => {
		const { user } = requireRole(session, "staff");
		return list(user.id);
	})
	.post(
		"/",
		async ({ session, body }) => {
			const { user } = requireRole(session, "staff");
			return create(user.id, body);
		},
		{
			body: t.Object({ label: t.String() }),
		},
	)
	.put(
		"/:id",
		async ({ session, params, body }) => {
			const { user } = requireRole(session, "staff");
			return update(user.id, params.id, body);
		},
		{
			body: t.Object({ label: t.String() }),
		},
	)
	.delete(
		"/:id",
		async ({ session, params, query }) => {
      const { user } = requireRole(session, "staff");
			return remove(user.id, params.id, { confirm: query.confirm === true });
		},
		{
			query: t.Object({ confirm: t.Optional(t.Boolean()) }),
		},
	)

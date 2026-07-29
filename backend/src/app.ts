import { auth } from "@/auth";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { expressionsOfInterestRoutes } from "@/routes/expressionsOfInterest";
import { interestsRoutes } from "@/routes/interests";
import { projectIdeasRoutes } from "@/routes/projectIdeas";
import { staffRoutes } from "@/routes/staff";
import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";

const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";

export function createApp() {
  return new Elysia()
    .use(
      cors({
        origin: FRONTEND_URL,
        credentials: true,
      }),
    )
    .all("/api/auth/*", ({ request }) => auth.handler(request))
    .onError(({ error, set }) => {
      if (
        error instanceof NotFoundError ||
        error instanceof ForbiddenError ||
        error instanceof ValidationError
      ) {
        set.status = error.status;
        return { error: error.message };
      }
      // Elysia's own framework errors (e.g. its built-in ValidationError for
      // failed `t.Object` schemas) already carry a sensible HTTP status -
      // defer to it instead of masking every one of them as a 500.
      if ("status" in error && typeof error.status === "number") {
        set.status = error.status;
        return { error: error.message };
      }
      set.status = 500;
      return { error: "Internal Server Error" };
    })
    .get("/", () => "OK")
    .use(interestsRoutes)
    .use(projectIdeasRoutes)
    .use(staffRoutes)
    .use(expressionsOfInterestRoutes);
}

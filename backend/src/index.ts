import cors from "@elysiajs/cors";
import { Elysia } from "elysia";
import { auth } from "./auth";
import { ForbiddenError, NotFoundError, ValidationError } from "./lib/errors";

const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";
const PORT = process.env.PORT ?? 3000;

const app = new Elysia()
  .use(cors({
    origin: FRONTEND_URL,
    credentials: true,
  }))
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
    set.status = 500;
    return { error: "Internal Server Error" };
  })
  .get("/", () => "OK")
  .listen(PORT);

export type App = typeof app;

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

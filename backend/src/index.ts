import { createApp } from "@/app";

const PORT = process.env.PORT ?? 3000;

const app = createApp().listen(PORT);

export type App = typeof app;

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

import { treaty } from "@elysiajs/eden";
import type { App } from "@/index";

export const api = treaty<App>(import.meta.env.VITE_BACKEND_URL, {
  fetcher: ((url: string, options: RequestInit) => fetch(url, { ...options, credentials: "include" })) as typeof fetch,
})

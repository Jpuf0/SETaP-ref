//@ts-expect-error relations-v2 does exist.
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { betterAuth } from "better-auth";
import { db } from "./db";
import * as schema from "./db/schema";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema
  }),
  baseURL: BACKEND_URL,
  trustedOrigins: [FRONTEND_URL],
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        input: true,
      },
    },
  },
})

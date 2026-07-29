import { db } from "@/db";
import * as schema from "../src/db/schema";

export async function insertUser(id: string, role: "staff" | "student" = "staff") {
  const [row] = await db
    .insert(schema.user)
    .values({
      id,
      name: id,
      email: `${id}@example.com`,
      emailVerified: false,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return row;
}

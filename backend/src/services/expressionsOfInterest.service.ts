import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "../db/schema";

export type RegisterResult =
  | { ok: true; id: string }
  | { ok: false; reason: "idea-not-found" | "idea-taken" | "already-registered" };

export async function register(
  studentId: string,
  projectIdeaId: string,
): Promise<RegisterResult> {
  const id = crypto.randomUUID();
  const createdAtSeconds = Math.floor(Date.now() / 1000);

  const inserted = db.get<{ id: string }>(sql`
    INSERT INTO expression_of_interest (id, student_id, project_idea_id, created_at)
    SELECT ${id}, ${studentId}, ${projectIdeaId}, ${createdAtSeconds}
    WHERE EXISTS (
      SELECT 1 FROM project_idea WHERE id = ${projectIdeaId} AND status = 'open'
    )
    AND NOT EXISTS (
      SELECT 1 FROM expression_of_interest
      WHERE student_id = ${studentId} AND project_idea_id = ${projectIdeaId}
    )
    RETURNING id
  `);

  if (inserted) {
    return { ok: true, id: inserted.id };
  }

  // Read-only follow-up purely to produce an accurate rejection reason;
  // correctness was already established by the atomic insert above.
  const idea = await db.query.projectIdea.findFirst({
    where: {
      id: projectIdeaId,
    },
  });
  if (!idea) return { ok: false, reason: "idea-not-found" };
  if (idea.status !== "open") return { ok: false, reason: "idea-taken" };
  return { ok: false, reason: "already-registered" };
}

export async function listForStaffIdeas(staffId: string) {
  return db
    .select({
      id: schema.expressionOfInterest.id,
      createdAt: schema.expressionOfInterest.createdAt,
      projectIdeaId: schema.projectIdea.id,
      projectIdeaTitle: schema.projectIdea.title,
      studentId: schema.user.id,
      studentName: schema.user.name,
      studentEmail: schema.user.email,
    })
    .from(schema.expressionOfInterest)
    .innerJoin(
      schema.projectIdea,
      eq(schema.expressionOfInterest.projectIdeaId, schema.projectIdea.id),
    )
    .innerJoin(schema.user, eq(schema.expressionOfInterest.studentId, schema.user.id))
    .where(eq(schema.projectIdea.staffId, staffId));
}

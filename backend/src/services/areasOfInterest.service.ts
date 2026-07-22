import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { areaOfInterest, projectIdea, projectIdeaInterest } from "../db/schema";
import { ForbiddenError, NotFoundError } from "../lib/errors";

const labelSchema = z.object({ label: z.string().max(100) });

const validateOwn = async (staffId: string, areaId: string) => {
  const row = await db.query.areaOfInterest.findFirst({
    where: { id: areaId },
  });

  if (!row) throw new NotFoundError("Area of interest not found")
  if (row.staffId !== staffId) throw new ForbiddenError("You do not have permission to access this area of interest")

  return row;
};

export async function list(staffId: string) {
  return db.query.areaOfInterest.findMany({
    // where: eq(areaOfInterest.staffId, staffId),
    where: { staffId },
    orderBy: (area, { asc }) => [asc(area.createdAt)]
  });
}

export async function create(staffId: string, input: z.infer<typeof labelSchema>) {
  const label = labelSchema.parse(input).label;
  const [res] = await db
    .insert(areaOfInterest)
    .values({ staffId, label })
    .returning();

  return res;
}

export async function update(staffId: string, areaId: string, input: z.infer<typeof labelSchema>) {
  await validateOwn(staffId, areaId);
  const label = labelSchema.parse(input).label;
  const [res] = await db
    .update(areaOfInterest)
    .set({ label })
    .where(eq(areaOfInterest.id, areaId))
    .returning();

  return res;
}

export async function remove(staffId: string, areaId: string, options: { confirm?: boolean }) {
  await validateOwn(staffId, areaId);

  const taggedIdeas = await db
    .select({ id: projectIdea.id, titel: projectIdea.title })
    .from(projectIdeaInterest)
    .innerJoin(projectIdea, eq(projectIdeaInterest.projectIdeaId, projectIdea.id))
    .where(eq(projectIdeaInterest.areaOfInterestId, areaId))

  if (taggedIdeas.length > 0 && !options.confirm) {
    return { ok: false, reason: "tagged", taggedIdeas };
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(projectIdeaInterest)
      .where(eq(projectIdeaInterest.areaOfInterestId, areaId))
    await tx
      .delete(areaOfInterest)
      .where(and(eq(areaOfInterest.id, areaId), eq(areaOfInterest.staffId, staffId)))
  });
}

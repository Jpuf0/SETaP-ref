import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { areaOfInterest, projectIdea, projectIdeaInterest } from "@/db/schema";
import { ForbiddenError, NotFoundError, parseOrThrow } from "../lib/errors";

export type RemoveAreaResult =
  | { ok: true }
  | { ok: false; reason: "tagged"; taggedIdeas: { id: string; title: string }[] };

const labelSchema = z.object({
  label: z
    .string()
    .nonempty("Label must not be empty")
    .max(100, "Label must be at most 100 characters"),
});

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
  const label = parseOrThrow(labelSchema, input).label;
  const [res] = await db
    .insert(areaOfInterest)
    .values({ staffId, label })
    .returning();

  return res;
}

export async function update(staffId: string, areaId: string, input: z.infer<typeof labelSchema>) {
  await validateOwn(staffId, areaId);
  const label = parseOrThrow(labelSchema, input).label;
  const [res] = await db
    .update(areaOfInterest)
    .set({ label })
    .where(eq(areaOfInterest.id, areaId))
    .returning();

  return res;
}

export async function remove(
  staffId: string,
  areaId: string,
  options: { confirm?: boolean } = {},
): Promise<RemoveAreaResult> {
  await validateOwn(staffId, areaId);

  const taggedIdeas = await db
    .select({ id: projectIdea.id, title: projectIdea.title })
    .from(projectIdeaInterest)
    .innerJoin(
      projectIdea,
      eq(projectIdeaInterest.projectIdeaId, projectIdea.id),
    )
    .where(eq(projectIdeaInterest.areaOfInterestId, areaId));

  if (taggedIdeas.length > 0 && !options.confirm) {
    return { ok: false, reason: "tagged", taggedIdeas };
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(projectIdeaInterest)
      .where(eq(projectIdeaInterest.areaOfInterestId, areaId));
    await tx
      .delete(areaOfInterest)
      .where(
        and(eq(areaOfInterest.id, areaId), eq(areaOfInterest.staffId, staffId)),
      );
  });

  return { ok: true };
}

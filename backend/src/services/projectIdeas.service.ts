import { and, eq, inArray } from "drizzle-orm";
import * as schema from "../db/schema";
import { NotFoundError, ForbiddenError, ValidationError } from "../lib/errors";
import { db } from "@/db";

const TITLE_MAX_LENGTH = 150;
const DESCRIPTION_MAX_LENGTH = 2000;

function validateTitleAndDescription(title: string, description: string) {
  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();
  if (trimmedTitle.length === 0) throw new ValidationError("Title must not be empty");
  if (trimmedTitle.length > TITLE_MAX_LENGTH) {
    throw new ValidationError(`Title must be at most ${TITLE_MAX_LENGTH} characters`);
  }
  if (trimmedDescription.length === 0) {
    throw new ValidationError("Description must not be empty");
  }
  if (trimmedDescription.length > DESCRIPTION_MAX_LENGTH) {
    throw new ValidationError(
      `Description must be at most ${DESCRIPTION_MAX_LENGTH} characters`,
    );
  }
  return { title: trimmedTitle, description: trimmedDescription };
}

async function attachInterests<T extends { id: string }>(ideas: T[]) {
  if (ideas.length === 0) return [] as (T & { interests: schema.AreaOfInterest[] })[];
  const ideaIds = ideas.map((idea) => idea.id);
  const joins = await db
    .select({
      projectIdeaId: schema.projectIdeaInterest.projectIdeaId,
      interest: schema.areaOfInterest,
    })
    .from(schema.projectIdeaInterest)
    .innerJoin(
      schema.areaOfInterest,
      eq(schema.projectIdeaInterest.areaOfInterestId, schema.areaOfInterest.id),
    )
    .where(inArray(schema.projectIdeaInterest.projectIdeaId, ideaIds));

  const byIdea = new Map<string, schema.AreaOfInterest[]>();
  for (const join of joins) {
    const list = byIdea.get(join.projectIdeaId) ?? [];
    list.push(join.interest);
    byIdea.set(join.projectIdeaId, list);
  }

  return ideas.map((idea) => ({ ...idea, interests: byIdea.get(idea.id) ?? [] }));
}

async function verifyInterestsOwnedByStaff(staffId: string, interestIds: string[]) {
  if (interestIds.length === 0) return;
  const owned = await db.query.areaOfInterest.findMany({
    where: {
      id: { in: interestIds },
      staffId,
    },
  });
  if (owned.length !== interestIds.length) {
    throw new ValidationError("One or more areas of interest do not belong to this staff member");
  }
}

async function setInterestTags(
  ideaId: string,
  interestIds: string[] | undefined,
) {
  if (interestIds === undefined) return;
  await db.delete(schema.projectIdeaInterest).where(eq(schema.projectIdeaInterest.projectIdeaId, ideaId));
  if (interestIds.length > 0) {
    await db
      .insert(schema.projectIdeaInterest)
      .values(interestIds.map((areaOfInterestId) => ({ projectIdeaId: ideaId, areaOfInterestId })));
  }
}

export async function listForStaff(staffId: string) {
  const ideas = await db.query.projectIdea.findMany({
    where: {
      staffId,
    },
    orderBy: (idea, { asc }) => [asc(idea.createdAt)],
  });
  return attachInterests(ideas);
}

export async function getById(ideaId: string) {
  const idea = await db.query.projectIdea.findFirst({
    where: {
      id: ideaId,
    },
    with: { staff: true },
  });
  if (!idea) throw new NotFoundError("Project idea not found");
  const [withInterests] = await attachInterests([idea]);
  return withInterests;
}

async function getOwned(staffId: string, ideaId: string) {
  const row = await db.query.projectIdea.findFirst({ where: { id: ideaId, staffId } });
  if (!row) throw new NotFoundError("Project idea not found");
  if (row.staffId !== staffId) throw new ForbiddenError("You do not own this project idea");
  return row;
}

export async function create(
  staffId: string,
  input: { title: string; description: string; interestIds?: string[] },
) {
  const { title, description } = validateTitleAndDescription(input.title, input.description);
  await verifyInterestsOwnedByStaff(staffId, input.interestIds ?? []);

  return db.transaction(async (tx) => {
    const [idea] = await tx
      .insert(schema.projectIdea)
      .values({ staffId, title, description, status: "open" })
      .returning();
    if (input.interestIds?.length) {
      await tx
        .insert(schema.projectIdeaInterest)
        .values(input.interestIds.map((areaOfInterestId) => ({ projectIdeaId: idea.id, areaOfInterestId })));
    }
    return idea;
  });
}

export async function update(
  staffId: string,
  ideaId: string,
  input: { title?: string; description?: string; interestIds?: string[] },
) {
  const existing = await getOwned(staffId, ideaId);
  const title = input.title ?? existing.title;
  const description = input.description ?? existing.description;
  const validated = validateTitleAndDescription(title, description);
  await verifyInterestsOwnedByStaff(staffId, input.interestIds ?? []);

  return db.transaction(async (tx) => {
    const [idea] = await tx
      .update(schema.projectIdea)
      .set(validated)
      .where(eq(schema.projectIdea.id, ideaId))
      .returning();
    await setInterestTags(ideaId, input.interestIds);
    return idea;
  });
}

export async function setAvailability(
  staffId: string,
  ideaId: string,
  status: "open" | "taken",
) {
  await getOwned(staffId, ideaId);
  if (status !== "open" && status !== "taken") {
    throw new ValidationError("Status must be 'open' or 'taken'");
  }
  const [idea] = await db
    .update(schema.projectIdea)
    .set({ status })
    .where(and(eq(schema.projectIdea.id, ideaId), eq(schema.projectIdea.staffId, staffId)))
    .returning();
  return idea;
}

export async function remove(staffId: string, ideaId: string) {
  await getOwned(staffId, ideaId);
  await db
    .delete(schema.projectIdea)
    .where(and(eq(schema.projectIdea.id, ideaId), eq(schema.projectIdea.staffId, staffId)));
}

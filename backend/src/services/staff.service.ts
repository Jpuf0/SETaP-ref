import { db } from "@/db";
import type { AreaOfInterest } from "@/db/schema";
import { NotFoundError } from "@/lib/errors";

export async function list(filter?: { label?: string }) {
  const staffUsers = await db.query.user.findMany({
    where: { role: "staff" }
  });

  if (staffUsers.length === 0) return [];

  const staffIds = staffUsers.map((u) => u.id);

  const areas = await db.query.areaOfInterest.findMany({
    where: {
      staffId: {
        in: staffIds
      }
    }
  })

  const ideas = await db.query.projectIdea.findMany({
    where: {
      staffId: {
        in: staffIds
      }
    }
  })

  const areasByStaff = new Map<string, AreaOfInterest[]>();
  const lastUpdatedByStaff = new Map<string, Date>();

  const bumpLastUpdated = (staffId: string, updateAt: Date) => {
    const current = lastUpdatedByStaff.get(staffId);
    if (!current || updateAt > current) lastUpdatedByStaff.set(staffId, updateAt);
  };

  for (const area of areas) {
    const list = areasByStaff.get(area.staffId) ?? [];
    list.push(area);
    areasByStaff.set(area.staffId, list);
    bumpLastUpdated(area.staffId, area.updatedAt)
  }

  for (const idea of ideas) {
    bumpLastUpdated(idea.staffId, idea.updatedAt)
  }

  const labelFilter = filter?.label?.trim().toLowerCase();

  return staffUsers
    .filter((staffUser) => {
      if (!labelFilter) return true;
      const staffAreas = areasByStaff.get(staffUser.id) ?? [];
      return staffAreas.some((area) =>
        area.label.toLowerCase().includes(labelFilter),
      );
    })
    .map((staffUser) => ({
      id: staffUser.id,
      name: staffUser.name,
      email: staffUser.email,
      areasOfInterest: areasByStaff.get(staffUser.id) ?? [],
      lastUpdated: lastUpdatedByStaff.get(staffUser.id) ?? staffUser.createdAt,
    }));
}

export async function getStaffProfile(staffId: string) {
  const staffUser = await db.query.user.findFirst({
    where: { id: staffId }
  });

  if (!staffUser || staffUser.role !== "staff") {
    throw new NotFoundError("Staff profile not found");
  }

  const areas = await db.query.areaOfInterest.findMany({
    where: { staffId: staffId }
  });
  const ideas = await db.query.projectIdea.findMany({
    where: { staffId: staffId }
  });

  const lastUpdated = [...areas, ...ideas].reduce((latest, row) => (row.updatedAt > latest ? row.updatedAt : latest), staffUser.createdAt);

  return {
    id: staffUser.id,
    name: staffUser.name,
    email: staffUser.email,
    areasOfInterest: areas,
    projectIdeas: ideas,
    lastUpdated,
  }
}

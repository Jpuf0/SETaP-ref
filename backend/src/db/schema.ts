import { int, integer, primaryKey, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";

export * from "./auth-schema";

export const areaOfInterest = sqliteTable("area_of_interest", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  staffId: text("staff_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  label: text("label")
    .notNull(),
  createdAt: int("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: int("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
})

export const projectIdea = sqliteTable("project_idea", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  staffId: text("staff_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status", { enum: ["open", "taken"] })
    .notNull()
    .default("open"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export const projectIdeaInterest = sqliteTable(
  "project_idea_interest",
  {
    projectIdeaId: text("project_idea_id")
      .notNull()
      .references(() => projectIdea.id, { onDelete: "cascade" }),
    areaOfInterestId: text("area_of_interest_id")
      .notNull()
      .references(() => areaOfInterest.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.projectIdeaId, table.areaOfInterestId] }),
  ],
);

export const expressionOfInterest = sqliteTable(
  "expression_of_interest",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    studentId: text("student_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    projectIdeaId: text("project_idea_id")
      .notNull()
      .references(() => projectIdea.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    unique("expression_of_interest_student_idea_unique").on(
      table.studentId,
      table.projectIdeaId,
    ),
  ],
);

export type User = typeof user.$inferSelect;
export type AreaOfInterest = typeof areaOfInterest.$inferSelect;
export type ProjectIdea = typeof projectIdea.$inferSelect;
export type ExpressionOfInterest = typeof expressionOfInterest.$inferSelect;

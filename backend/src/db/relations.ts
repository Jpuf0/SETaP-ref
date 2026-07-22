import { defineRelations } from "drizzle-orm/relations";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
	user: {
		areasOfInterest: r.many.areaOfInterest(),
		projectIdeas: r.many.projectIdea(),
		expressionsOfInterest: r.many.expressionOfInterest(),
	},
	areaOfInterest: {
		staff: r.one.user({
			from: r.areaOfInterest.staffId,
			to: r.user.id,
		}),
		projectIdeaInterests: r.many.projectIdeaInterest(),
	},
	projectIdea: {
		staff: r.one.user({
			from: r.projectIdea.staffId,
			to: r.user.id,
		}),
		projectIdeaInterests: r.many.projectIdeaInterest(),
		expressionsOfInterest: r.many.expressionOfInterest(),
  },
  projectIdeaInterest: {
    projectIdea: r.one.projectIdea({
      from: r.projectIdeaInterest.projectIdeaId,
      to: r.projectIdea.id
    }),
    areaOfInterest: r.one.areaOfInterest({
      from: r.projectIdeaInterest.areaOfInterestId,
      to: r.areaOfInterest.id,
    })
  },
  expressionOfInterest: {
    student: r.one.user({
      from: r.expressionOfInterest.studentId,
      to: r.user.id,
    }),
    projectIdea: r.one.projectIdea({
      from: r.expressionOfInterest.projectIdeaId,
      to: r.projectIdea.id,
    })
  }
}));

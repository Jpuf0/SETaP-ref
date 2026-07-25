import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ProjectIdeaCard } from "#/components/ProjectIdeaCard";
import { api } from "#/lib/api";

export const Route = createFileRoute("/staff/$staffId")({
  component: StaffProfile,
});

function StaffProfile() {
  const { staffId } = Route.useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["staff", staffId],
    queryFn: async () => {
      const { data, error } = await api.staff({ id: staffId }).get();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading)
    return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (error || !data)
    return <div className="p-8 text-destructive">Staff profile not found.</div>;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">{data.name}</h1>
      <p className="text-sm text-muted-foreground">
        Last updated {new Date(data.lastUpdated).toLocaleDateString()}
      </p>

      <h2 className="mt-6 text-sm font-semibold uppercase text-muted-foreground">
        Areas of Interest
      </h2>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {data.areasOfInterest.length === 0 ? (
          <span className="text-sm text-muted-foreground">None listed</span>
        ) : (
          data.areasOfInterest.map((area) => (
            <span
              key={area.id}
              className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
            >
              {area.label}
            </span>
          ))
        )}
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase text-muted-foreground">
        Project Ideas
      </h2>
      <div className="mt-2 space-y-3">
        {data.projectIdeas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No project ideas listed yet.
          </p>
        ) : (
          data.projectIdeas.map((idea) => (
            <ProjectIdeaCard key={idea.id} idea={idea} />
          ))
        )}
      </div>
    </div>
  );
}

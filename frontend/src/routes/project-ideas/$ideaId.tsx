import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { api } from "#/lib/api";
import { authClient } from "#/lib/auth-client";

const REJECTION_MESSAGES: Record<string, string> = {
  "idea-taken":
    "This project is no longer available — it was taken by someone else.",
  "already-registered":
    "You've already registered interest in this project idea.",
  "idea-not-found": "This project idea no longer exists.",
};

export const Route = createFileRoute("/project-ideas/$ideaId")({
  component: ProjectIdeaDetail,
});

function ProjectIdeaDetail() {
  const { ideaId } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const [message, setMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["project-idea", ideaId],
    queryFn: async () => {
      const { data, error } = await api["project-ideas"]({ id: ideaId }).get();
      if (error) throw error;
      return data;
    },
  });

  const registerInterest = useMutation({
    mutationFn: async () => {
      const { data, error } = await api["expressions-of-interest"].post({
        projectIdeaId: ideaId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (result) => {
      if (result.ok) {
        setMessage({
          kind: "success",
          text: "Your interest has been registered.",
        });
      } else {
        setMessage({
          kind: "error",
          text:
            REJECTION_MESSAGES[result.reason] ?? "Could not register interest.",
        });
        queryClient.invalidateQueries({ queryKey: ["project-idea", ideaId] });
      }
    },
  });

  if (isLoading)
    return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (error || !data)
    return <div className="p-8 text-destructive">Project idea not found.</div>;

  const canRegisterInterest =
    session?.user.role === "student" && data.status === "open";

  return (
    <div className="mx-auto max-w-2xl p-8">
      <Link
        to="/staff/$staffId"
        params={{ staffId: data.staffId }}
        className="text-sm text-muted-foreground hover:underline"
      >
        &larr; {data.staff?.name}'s profile
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{data.title}</h1>
        <span
          className={
            data.status === "open"
              ? "rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900 dark:text-green-200"
              : "rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
          }
        >
          {data.status === "open" ? "Open" : "Taken"}
        </span>
      </div>

      <p className="mt-4 whitespace-pre-wrap">{data.description}</p>

      {data.interests.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {data.interests.map((area) => (
            <span
              key={area.id}
              className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
            >
              {area.label}
            </span>
          ))}
        </div>
      )}

      {canRegisterInterest && (
        <Button
          className="mt-6"
          onClick={() => registerInterest.mutate()}
          disabled={registerInterest.isPending}
        >
          {registerInterest.isPending ? "Registering…" : "Register Interest"}
        </Button>
      )}

      {message && (
        <p
          className={
            message.kind === "success"
              ? "mt-4 text-sm text-green-700 dark:text-green-400"
              : "mt-4 text-sm text-destructive"
          }
        >
          {message.text}
        </p>
      )}
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Textarea } from "#/components/ui/textarea";
import { api } from "#/lib/api";
import { authClient } from "#/lib/auth-client";

type IdeaFormState = {
  title: string;
  description: string;
  interestIds: string[];
};
const emptyForm: IdeaFormState = {
  title: "",
  description: "",
  interestIds: [],
};

export const Route = createFileRoute("/profile/project-ideas")({
  component: ManageProjectIdeas,
});

function ManageProjectIdeas() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<IdeaFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: ideas, isLoading } = useQuery({
    queryKey: ["my-project-ideas"],
    queryFn: async () => {
      const { data, error } = await api["project-ideas"].mine.get();
      if (error) throw error;
      return data;
    },
    enabled: session?.user.role === "staff",
  });

  const { data: myInterests } = useQuery({
    queryKey: ["my-interests"],
    queryFn: async () => {
      const { data, error } = await api.interests.get();
      if (error) throw error;
      return data;
    },
    enabled: session?.user.role === "staff",
  });

  const { data: expressions } = useQuery({
    queryKey: ["my-expressions-of-interest"],
    queryFn: async () => {
      const { data, error } = await api["expressions-of-interest"].mine.get();
      if (error) throw error;
      return data;
    },
    enabled: session?.user.role === "staff",
  });

  const invalidateIdeas = () =>
    queryClient.invalidateQueries({ queryKey: ["my-project-ideas"] });

  const createMutation = useMutation({
    mutationFn: async (input: IdeaFormState) => {
      const { error } = await api["project-ideas"].post(input);
      if (error) throw error;
    },
    onSuccess: () => {
      setForm(emptyForm);
      invalidateIdeas();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: IdeaFormState }) => {
      const { error } = await api["project-ideas"]({ id }).put(input);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingId(null);
      setForm(emptyForm);
      invalidateIdeas();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api["project-ideas"]({ id }).delete();
      if (error) throw error;
    },
    onSuccess: invalidateIdeas,
  });

  const availabilityMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "open" | "taken";
    }) => {
      const { error } = await api["project-ideas"]({ id }).availability.patch({
        status,
      });
      if (error) throw error;
    },
    onSuccess: invalidateIdeas,
  });

  if (sessionPending)
    return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (session?.user.role !== "staff") {
    return (
      <div className="p-8 text-destructive">
        This page is only available to staff.
      </div>
    );
  }

  function toggleInterest(id: string) {
    setForm((f) => ({
      ...f,
      interestIds: f.interestIds.includes(id)
        ? f.interestIds.filter((i) => i !== id)
        : [...f.interestIds, id],
    }));
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">My Project Ideas</h1>

      <form
        className="mt-6 space-y-3 rounded-md border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (editingId) {
            updateMutation.mutate({ id: editingId, input: form });
          } else {
            createMutation.mutate(form);
          }
        }}
      >
        <h2 className="font-semibold">
          {editingId ? "Edit project idea" : "New project idea"}
        </h2>
        <Input
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          required
        />
        <Textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
          required
        />
        {myInterests && myInterests.length > 0 && (
          <div>
            <p className="mb-1 text-sm text-muted-foreground">
              Tag areas of interest:
            </p>
            <div className="flex flex-wrap gap-2">
              {myInterests.map((area) => (
                <label
                  key={area.id}
                  className="flex items-center gap-1.5 rounded-full border px-2 py-1 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={form.interestIds.includes(area.id)}
                    onChange={() => toggleInterest(area.id)}
                  />
                  {area.label}
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {editingId ? "Save changes" : "Create project idea"}
          </Button>
          {editingId && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {ideas?.length === 0 && (
          <p className="text-muted-foreground">
            You haven't added any project ideas yet.
          </p>
        )}
        {ideas?.map((idea) => {
          const interested =
            expressions?.filter((e) => e.projectIdeaId === idea.id) ?? [];
          return (
            <div key={idea.id} className="rounded-md border p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{idea.title}</h3>
                    <span
                      className={
                        idea.status === "open"
                          ? "rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                      }
                    >
                      {idea.status === "open" ? "Open" : "Taken"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {idea.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {idea.interests.map((area) => (
                      <span
                        key={area.id}
                        className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                      >
                        {area.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      availabilityMutation.mutate({
                        id: idea.id,
                        status: idea.status === "open" ? "taken" : "open",
                      })
                    }
                  >
                    Mark as {idea.status === "open" ? "Taken" : "Open"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingId(idea.id);
                      setForm({
                        title: idea.title,
                        description: idea.description,
                        interestIds: idea.interests.map((a) => a.id),
                      });
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteMutation.mutate(idea.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              <button
                type="button"
                className="mt-3 text-sm text-muted-foreground underline"
                onClick={() =>
                  setExpandedId(expandedId === idea.id ? null : idea.id)
                }
              >
                {interested.length} student{interested.length === 1 ? "" : "s"}{" "}
                interested
              </button>
              {expandedId === idea.id && (
                <ul className="mt-2 space-y-1 text-sm">
                  {interested.length === 0 && (
                    <li className="text-muted-foreground">
                      No one has registered interest yet.
                    </li>
                  )}
                  {interested.map((e) => (
                    <li key={e.id}>
                      {e.studentName} ({e.studentEmail})
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

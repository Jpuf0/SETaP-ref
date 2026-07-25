import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ConfirmDialog } from "#/components/ConfirmDialog";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { api } from "#/lib/api";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/profile/interests")({
  component: ManageInterests,
});

function ManageInterests() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const queryClient = useQueryClient();
  const [newLabel, setNewLabel] = useState("");
  const [editing, setEditing] = useState<{ id: string; label: string } | null>(
    null,
  );
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    taggedIdeas: { id: string; title: string }[];
  } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["my-interests"],
    queryFn: async () => {
      const { data, error } = await api.interests.get();
      if (error) throw error;
      return data;
    },
    enabled: session?.user.role === "staff",
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["my-interests"] });

  const createMutation = useMutation({
    mutationFn: async (label: string) => {
      const { error } = await api.interests.post({ label });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewLabel("");
      invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, label }: { id: string; label: string }) => {
      const { error } = await api.interests({ id }).put({ label });
      if (error) throw error;
    },
    onSuccess: () => {
      setEditing(null);
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, confirm }: { id: string; confirm: boolean }) => {
      const { data, error } = await api.interests({ id }).delete(undefined, {
        query: { confirm: confirm ? true : undefined },
      });
      if (error) throw error;
      return { id, result: data };
    },
    onSuccess: ({ id, result }) => {
      if (result.ok) {
        setPendingDelete(null);
        invalidate();
      } else {
        setPendingDelete({ id, taggedIdeas: result.taggedIdeas });
      }
    },
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

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">My Areas of Interest</h1>

      <form
        className="mt-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (newLabel.trim()) createMutation.mutate(newLabel);
        }}
      >
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="e.g. Graph Theory"
        />
        <Button type="submit" disabled={createMutation.isPending}>
          Add
        </Button>
      </form>

      <div className="mt-6 space-y-2">
        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {data?.length === 0 && (
          <p className="text-muted-foreground">
            You haven't added any areas of interest yet.
          </p>
        )}
        {data?.map((area) =>
          editing?.id === area.id ? (
            <form
              key={area.id}
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate({
                  id: area.id,
                  label: editing?.label ?? "",
                });
              }}
            >
              <Input
                value={editing?.label}
                onChange={(e) =>
                  setEditing({ id: area.id, label: e.target.value })
                }
                autoFocus
              />
              <Button type="submit" size="sm">
                Save
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditing(null)}
              >
                Cancel
              </Button>
            </form>
          ) : (
            <div
              key={area.id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <span>{area.label}</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing({ id: area.id, label: area.label })}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    deleteMutation.mutate({ id: area.id, confirm: false })
                  }
                >
                  Delete
                </Button>
              </div>
            </div>
          ),
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="This area of interest is tagged to existing project ideas"
        description={
          <>
            Deleting it will remove the tag from:{" "}
            {pendingDelete?.taggedIdeas.map((idea) => idea.title).join(", ")}.
            The project ideas themselves will not be deleted.
          </>
        }
        onConfirm={() => {
          if (pendingDelete)
            deleteMutation.mutate({ id: pendingDelete.id, confirm: true });
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

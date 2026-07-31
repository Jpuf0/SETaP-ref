import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { StaffCard } from "#/components/StaffCard";
import { Input } from "#/components/ui/input";
import { Spinner } from "#/components/ui/spinner";
import { api } from "#/lib/api";

export const Route = createFileRoute("/staff/")({
  component: StaffList,
});

function StaffList() {
  const [label, setLabel] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["staff", label],
    retry: 1,
    queryFn: async () => {
      const { data, error } = await api.staff.get({
        query: { label: label || undefined },
      });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold mb-4">Browse Staff Profiles</h1>
      <Input
        placeholder="Filter by area of interest..."
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="mt-4 max-w-sm"
      />
      <div className="mt-6 space-y-3">
        {isLoading && <Spinner className="size-8" />}
        {error && (
          <p className="text-red-500">
            Failed to load staff profiles, Please sign in.
          </p>
        )}
        {data?.length === 0 && (
          <p className="text-muted-foreground">No staff profiles found.</p>
        )}
        {data?.map((staff) => (
          <StaffCard key={staff.id} staff={staff} />
        ))}
      </div>
    </div>
  );
}

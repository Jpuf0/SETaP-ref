import { Link } from "@tanstack/react-router";

export function StaffCard({
  staff,
}: {
  staff: {
    id: string;
    name: string;
    email: string;
    areasOfInterest: { id: string; label: string }[];
    lastUpdated: Date;
  }
  }) {
  return (
    <Link
      to="/staff/$staffId"
      params={{ staffId: staff.id }}
      className="block rounded-md border p-4 hover:bg-accent"
    >
      <h3 className="font-semibold">{staff.name}</h3>
      <p className="text-xs text-muted-foreground">
        Last updated {new Date(staff.lastUpdated).toLocaleDateString()}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {staff.areasOfInterest.length === 0 ? (
          <span className="text-sm text-muted-foreground">No areas of interest listed</span>
        ) : (
          staff.areasOfInterest.map((area) => (
            <span
              key={area.id}
              className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
            >
              {area.label}
            </span>
          ))
        )}
      </div>
    </Link>
  )
}

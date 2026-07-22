import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="text-3xl font-bold">Final Year Project Matching</h1>
      <p className="mt-4 text-muted-foreground">
        Browse staff profiles, find a supervisor whose interests match your own, and
        register interest in a specific project idea &mdash; or, if you're a member of
        staff, manage the areas of interest and project ideas on your own profile.
      </p>
      <Link to="/staff" className="mt-6 inline-block underline">
        Browse staff profiles &rarr;
      </Link>
    </div>
  )
}

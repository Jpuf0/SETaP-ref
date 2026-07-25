import { Link } from '@tanstack/react-router';

export function ProjectIdeaCard({
  idea,
}: {
  idea: { id: string; title: string; description: string; status: 'open' | 'taken' }
}) {
  return (
    <Link
      to="/project-ideas/$ideaId"
      params={{ ideaId: idea.id }}
      className="block rounded-md border p-4 hover:bg-accent"
    >
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{idea.title}</h4>
        <span
          className={
            idea.status === 'open'
              ? 'rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
          }
        >
          {idea.status === 'open' ? 'Open' : 'Taken'}
        </span>
      </div>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{idea.description}</p>
    </Link>
  )
}

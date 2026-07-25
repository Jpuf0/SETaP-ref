import { Button } from '#/components/ui/button'

export function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  description: React.ReactNode
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-md border bg-background p-6">
        <h2 className="font-semibold">{title}</h2>
        <div className="mt-2 text-sm text-muted-foreground">{description}</div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>
            Delete anyway
          </Button>
        </div>
      </div>
    </div>
  )
}

import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/staff/')({
  component: StaffList,
})

function StaffList() {
  return <div>Hello "/staff/"!</div>
}

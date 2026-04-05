import ErrorScreen from '@/components/ui/error-screen'

export default function NotFound() {
  return (
    <ErrorScreen
      code="404"
      title="Page not found"
      description="That page seems to have wandered off. It might have moved, been removed, or never existed in the first place."
      tone="default"
    />
  )
}

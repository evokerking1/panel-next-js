import ErrorScreen from '@/components/ui/error-screen'

export default function ForbiddenPage() {
  return (
    <ErrorScreen
      code="403"
      title="Access denied"
      description="Nope, this page is members-only and your badge did not scan. Head back or ask an admin if this looks wrong."
      tone="warning"
    />
  )
}

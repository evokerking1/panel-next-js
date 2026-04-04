import ErrorScreen from '@/components/ui/ErrorScreen'

export default function UnauthorizedPage() {
  return (
    <ErrorScreen
      code="401"
      title="Authentication required"
      description="You need to sign in before this page will take you seriously. Your session may have quietly clocked out."
      tone="warning"
    />
  )
}

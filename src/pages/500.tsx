import ErrorScreen from '@/components/ui/ErrorScreen'

export default function Custom500Page() {
  return (
    <ErrorScreen
      code="500"
      title="Internal server error"
      description="The server fumbled that request. Give it a second, then try again like nothing happened."
      tone="danger"
    />
  )
}

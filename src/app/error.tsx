'use client'

import { useEffect } from 'react'
import ErrorScreen from '@/components/ui/error-screen'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <ErrorScreen
      code="500"
      title="Something went wrong"
      description="Well, that page tripped over itself. Give it another shot, or head somewhere a little less dramatic."
      tone="danger"
      onRetry={reset}
      retryLabel="Retry page"
    />
  )
}

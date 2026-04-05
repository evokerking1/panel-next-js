'use client'

import ErrorScreen from '@/components/ui/error-screen'

export default function GlobalError() {
  return (
    <html lang="en">
      <body>
        <ErrorScreen
          code="500"
          title="Application error"
          description="The app had a full-on moment before it could finish loading. A reload usually talks it back into behaving."
          tone="danger"
          onRetry={() => window.location.reload()}
          retryLabel="Reload app"
        />
      </body>
    </html>
  )
}

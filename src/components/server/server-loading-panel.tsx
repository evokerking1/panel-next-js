import PanelLayout from '@/components/layout/panel-layout'

export default function ServerLoadingPanel({
  actionSkeletons = 0,
}: {
  actionSkeletons?: number
}) {
  return (
    <PanelLayout>
      <div className="animate-fade-in-up px-4 py-5 lg:px-8">
        <div className="space-y-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 px-4 py-3"
            >
              <div className="skeleton h-4 w-40 mb-2" />
              <div className="skeleton h-3 w-24 mb-3" />
              {actionSkeletons > 0 ? (
                <div className="flex gap-2">
                  {Array.from({ length: actionSkeletons }, (_, actionIndex) => (
                    <div key={actionIndex} className="skeleton h-9 w-24" />
                  ))}
                </div>
              ) : (
                <div className="skeleton h-12 w-full" />
              )}
            </div>
          ))}
        </div>
      </div>
    </PanelLayout>
  )
}

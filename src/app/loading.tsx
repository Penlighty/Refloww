export default function Loading() {
    return (
        <div className="w-full h-full min-h-[400px] flex flex-col space-y-6 animate-pulse p-2 sm:p-4">
            {/* Header Skeleton */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-line/60">
                <div className="space-y-2">
                    <div className="h-7 w-48 bg-neutral-200 dark:bg-neutral-800 rounded-lg"></div>
                    <div className="h-4 w-72 bg-neutral-100 dark:bg-neutral-800/60 rounded"></div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-9 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-lg"></div>
                    <div className="h-9 w-28 bg-blue-500/20 dark:bg-blue-500/10 rounded-lg"></div>
                </div>
            </div>

            {/* Quick Metrics / Cards Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-4 rounded-xl border border-line bg-paper shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
                            <div className="size-6 bg-neutral-100 dark:bg-neutral-800/80 rounded-full"></div>
                        </div>
                        <div className="h-6 w-28 bg-neutral-300 dark:bg-neutral-700 rounded-md"></div>
                    </div>
                ))}
            </div>

            {/* Table / Content Panel Skeleton */}
            <div className="flex-1 rounded-xl border border-line bg-paper shadow-xs overflow-hidden p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-line/40">
                    <div className="h-4 w-36 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
                    <div className="h-8 w-48 bg-neutral-100 dark:bg-neutral-800/60 rounded-lg"></div>
                </div>
                <div className="space-y-3 pt-2">
                    {[1, 2, 3, 4, 5].map((row) => (
                        <div key={row} className="flex items-center justify-between py-2 border-b border-line/30">
                            <div className="flex items-center gap-3">
                                <div className="size-8 bg-neutral-200 dark:bg-neutral-800 rounded-full shrink-0"></div>
                                <div className="space-y-1.5">
                                    <div className="h-3.5 w-32 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
                                    <div className="h-3 w-20 bg-neutral-100 dark:bg-neutral-800/60 rounded"></div>
                                </div>
                            </div>
                            <div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

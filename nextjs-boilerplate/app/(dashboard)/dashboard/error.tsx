// app/(dashboard)/dashboard/error.tsx
"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-destructive">오류가 발생했습니다.</p>
      <button onClick={reset} className="text-sm underline">
        다시 시도
      </button>
    </div>
  )
}

/** In-page loader — keeps header/footer visible (no full-screen flash). */
export function PageSpinner({ className = 'py-20' }: { className?: string }) {
  return (
    <div className={`flex justify-center ${className}`}>
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
    </div>
  )
}

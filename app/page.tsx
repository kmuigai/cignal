import { Suspense } from "react"
import AuthHandler from "./auth-handler"

// Loading fallback for Suspense
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 p-8">
        <h1 className="text-4xl font-bold text-foreground">CIGNAL Dashboard</h1>
        <p className="text-xl text-muted-foreground">Initializing application...</p>
        <div className="mt-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    </div>
  )
}

// Server component that wraps the client component
export default function HomePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthHandler />
    </Suspense>
  )
}

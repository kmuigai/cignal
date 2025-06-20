import { createRouteHandlerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const origin = requestUrl.origin

  if (code) {
    try {
      const cookieStore = cookies()
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error("Error exchanging code for session:", error)
        return NextResponse.redirect(`${origin}/?error=auth_callback_error`)
      }

      console.log("Successfully exchanged code for session")

      // Redirect to home page - the app will handle routing based on auth state
      return NextResponse.redirect(`${origin}/`)
    } catch (error) {
      console.error("Error in auth callback:", error)
      return NextResponse.redirect(`${origin}/?error=auth_callback_error`)
    }
  }

  // If no code, redirect to home
  return NextResponse.redirect(`${origin}/`)
}

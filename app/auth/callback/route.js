import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/auth/reset'

  if (code) {
    return NextResponse.redirect(`${origin}${next}?code=${code}`)
  }

  return NextResponse.redirect(`${origin}/auth/login?error=reset_failed`)
}

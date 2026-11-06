import config from '@payload-config'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

export async function GET() {
  const payload = await getPayload({ config })
  const auth = await payload.auth({ headers: await headers() })

  if (!auth.user || auth.user.collection !== 'customers') {
    return NextResponse.json({ user: null }, { status: 200 })
  }

  return NextResponse.json({ user: { id: auth.user.id, email: auth.user.email } })
}

import config from '@payload-config'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

type CartItemInput = { product: string; size: 'S' | 'M' | 'L' | 'XL'; quantity: number }

async function getOrCreateOpenCart(payload: Awaited<ReturnType<typeof getPayload>>, customerId: string) {
  const existing = await payload.find({
    collection: 'carts',
    where: { customer: { equals: customerId }, status: { equals: 'abierto' } },
    limit: 1,
    overrideAccess: true,
  })
  if (existing.docs[0]) return existing.docs[0]

  return payload.create({
    collection: 'carts',
    overrideAccess: true,
    data: { customer: customerId, items: [], status: 'abierto' },
  })
}

export async function GET() {
  const payload = await getPayload({ config })
  const auth = await payload.auth({ headers: await headers() })
  if (!auth.user || auth.user.collection !== 'customers') {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const cart = await getOrCreateOpenCart(payload, auth.user.id)
  return NextResponse.json({ cart })
}

/** Reemplaza el carrito del servidor por la lista de items que manda el cliente (merge desde localStorage al iniciar sesión). */
export async function PUT(request: Request) {
  const payload = await getPayload({ config })
  const auth = await payload.auth({ headers: await headers() })
  if (!auth.user || auth.user.collection !== 'customers') {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { items } = (await request.json()) as { items: CartItemInput[] }
  const cart = await getOrCreateOpenCart(payload, auth.user.id)

  const updated = await payload.update({
    collection: 'carts',
    id: cart.id,
    overrideAccess: true,
    data: { items },
  })

  return NextResponse.json({ cart: updated })
}

import config from '@payload-config'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import { buildIntegritySignature, getWompiPublicKey } from '@/lib/wompi'

type CheckoutBody = {
  addressIndex: number
  shippingCost?: number
}

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const auth = await payload.auth({ headers: await headers() })

  if (!auth.user || auth.user.collection !== 'customers') {
    return NextResponse.json({ error: 'Debes iniciar sesión para pagar.' }, { status: 401 })
  }

  const body = (await request.json()) as CheckoutBody
  const customer = await payload.findByID({
    collection: 'customers',
    id: auth.user.id,
    overrideAccess: false,
    user: auth.user,
  })
  const address = customer.addresses?.[body.addressIndex]
  if (!address) {
    return NextResponse.json({ error: 'Selecciona una dirección de envío válida.' }, { status: 400 })
  }

  const cartResult = await payload.find({
    collection: 'carts',
    where: { customer: { equals: auth.user.id }, status: { equals: 'abierto' } },
    limit: 1,
    depth: 1,
    overrideAccess: false,
    user: auth.user,
  })
  const cart = cartResult.docs[0]
  const cartItems = cart?.items ?? []
  if (cartItems.length === 0) {
    return NextResponse.json({ error: 'Tu carrito está vacío.' }, { status: 400 })
  }

  // Nunca confiar en precios que mande el cliente: se releen desde Products en el servidor.
  const items = await Promise.all(
    cartItems.map(async (item) => {
      const product =
        typeof item.product === 'object' ? item.product : await payload.findByID({ collection: 'products', id: item.product })
      return {
        product: product.id,
        productName: product.name,
        size: item.size,
        quantity: item.quantity,
        unitPrice: product.price ?? 0,
      }
    }),
  )

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const shippingCost = body.shippingCost ?? 0
  const total = subtotal + shippingCost
  const reference = `MLO-${Date.now()}-${auth.user.id}`

  // overrideAccess: true porque `Orders.access.create` solo permite admins — el checkout es la única
  // vía autorizada para crear pedidos, y ya validamos arriba que hay sesión de cliente real.
  const order = await payload.create({
    collection: 'orders',
    overrideAccess: true,
    data: {
      customer: auth.user.id,
      items,
      shippingAddress: {
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        department: address.department,
        phone: address.phone,
      },
      subtotal,
      shippingCost,
      total,
      status: 'pendiente_pago',
      payment: { provider: 'wompi', wompiReference: reference, status: 'pendiente' },
    },
  })

  await payload.update({
    collection: 'carts',
    // cart is guaranteed defined here: cartItems.length === 0 already returned above when cart is undefined.
    id: cart!.id,
    overrideAccess: true,
    data: { status: 'convertido' },
  })

  const amountInCents = Math.round(total * 100)
  const signature = buildIntegritySignature({ reference, amountInCents, currency: 'COP' })

  return NextResponse.json({
    orderId: order.id,
    orderNumber: order.orderNumber,
    wompi: {
      publicKey: getWompiPublicKey(),
      reference,
      amountInCents,
      currency: 'COP',
      signature,
    },
  })
}

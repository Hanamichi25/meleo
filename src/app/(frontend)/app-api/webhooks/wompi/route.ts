import config from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import { verifyWebhookSignature } from '@/lib/wompi'

type WompiEvent = {
  event: string
  data: {
    transaction: {
      id: string
      reference: string
      status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'ERROR'
    }
  }
  signature: { checksum: string; properties: string[] }
  timestamp: number
}

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const event = (await request.json()) as WompiEvent

  const isValid = verifyWebhookSignature({
    signature: event.signature,
    data: event.data as unknown as Record<string, unknown>,
    timestamp: event.timestamp,
  })
  if (!isValid) {
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
  }

  const { transaction } = event.data
  const orderResult = await payload.find({
    collection: 'orders',
    where: { 'payment.wompiReference': { equals: transaction.reference } },
    limit: 1,
    overrideAccess: true,
  })
  const order = orderResult.docs[0]
  if (!order) {
    return NextResponse.json({ error: 'Pedido no encontrado para esta referencia' }, { status: 404 })
  }

  const paymentStatus = transaction.status === 'APPROVED' ? 'aprobado' : transaction.status === 'DECLINED' ? 'declinado' : 'pendiente'
  const orderStatus = paymentStatus === 'aprobado' ? 'pagado' : paymentStatus === 'declinado' ? 'cancelado' : order.status

  await payload.update({
    collection: 'orders',
    id: order.id,
    overrideAccess: true,
    data: {
      status: orderStatus,
      payment: {
        ...order.payment,
        wompiTransactionId: transaction.id,
        status: paymentStatus,
        rawWebhookPayload: event,
      },
    },
  })

  // Si el pago fue declinado, se devuelve el stock reservado al crear el pedido.
  if (paymentStatus === 'declinado') {
    for (const item of order.items) {
      const stockKey = item.size.toLowerCase() as 's' | 'm' | 'l' | 'xl'
      const product =
        typeof item.product === 'object' ? item.product : await payload.findByID({ collection: 'products', id: item.product })
      await payload.update({
        collection: 'products',
        id: product.id,
        overrideAccess: true,
        data: {
          stock: {
            ...product.stock,
            [stockKey]: Number(product.stock?.[stockKey] ?? 0) + item.quantity,
          },
        },
      })
    }
  }

  return NextResponse.json({ ok: true })
}

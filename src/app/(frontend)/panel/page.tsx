import config from '@payload-config'
import { getPayload } from 'payload'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { OwnerPanel } from './panel'

export const dynamic = 'force-dynamic'

export default async function PanelPage() {
  const payload = await getPayload({ config })
  const auth = await payload.auth({ headers: await headers() })
  if (!auth.user || auth.user.collection !== 'admins') redirect('/admin')

  const [products, customers, orders] = await Promise.all([
    payload.find({ collection: 'products', limit: 100, overrideAccess: false, user: auth.user }),
    payload.find({ collection: 'customers', limit: 100, overrideAccess: false, user: auth.user }),
    payload.find({
      collection: 'orders',
      limit: 100,
      depth: 1,
      overrideAccess: false,
      user: auth.user,
    }),
  ])

  return (
    <OwnerPanel
      initialProducts={products.docs}
      initialCustomers={customers.docs}
      initialOrders={orders.docs}
    />
  )
}

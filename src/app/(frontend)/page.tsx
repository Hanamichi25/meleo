import config from '@payload-config'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import { getCatalogProducts } from '@/lib/catalog'
import { Landing } from './landing'

export default async function HomePage() {
  const payload = await getPayload({ config })
  const auth = await payload.auth({ headers: await headers() })
  const isLoggedIn = Boolean(auth.user && auth.user.collection === 'customers')
  const result = await getCatalogProducts()

  const products = result.docs.map((product) => {
    const image = typeof product.image === 'object' && product.image ? product.image : null
    const priceLabel =
      typeof product.price === 'number'
        ? new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0,
          }).format(product.price)
        : product.priceLabel || '[PRECIO]'

    return {
      id: String(product.id),
      name: product.name,
      sku: product.sku,
      category: product.category,
      description: product.description,
      price: product.price ?? null,
      priceLabel,
      image:
        image?.url
          ? {
              url: image.url,
              alt: image.alt,
              width: image.width || 900,
              height: image.height || 1200,
            }
          : null,
      stock: product.stock,
    }
  })

  return <Landing products={products} isLoggedIn={isLoggedIn} />
}

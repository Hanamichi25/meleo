import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

export const getCatalogProducts = unstable_cache(
  async () => {
    const payload = await getPayload({ config })
    return payload.find({
      collection: 'products',
      depth: 1,
      limit: 100,
      sort: 'name',
      overrideAccess: false,
    })
  },
  ['meleo-products-list'],
  {
    tags: ['meleo-products'],
  },
)

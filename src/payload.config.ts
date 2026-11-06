import path from 'path'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { s3Storage } from '@payloadcms/storage-s3'
import { mcpPlugin } from '@payloadcms/plugin-mcp'
import { es as adminLanguage } from '@payloadcms/translations/languages/es'
import { fileURLToPath } from 'url'
import { Admins } from './collections/Admins'
import { Media } from './collections/Media'
import { Folders } from './collections/Folders'
import { Tags } from './collections/Tags'
import { Products } from './collections/Products'
import { Customers } from './collections/Customers'
import { Carts } from './collections/Carts'
import { Orders } from './collections/Orders'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET!,
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URI },
  }),
  admin: {
    user: Admins.slug,
    constrainWidth: true,
    dashboard: {
      widgets: [],
      defaultLayout: [
        { widgetSlug: 'activity', width: 'full' },
        { widgetSlug: 'collections', width: 'full' },
      ],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  i18n: {
    fallbackLanguage: 'es',
    supportedLanguages: { es: adminLanguage },
  },
  collections: [Admins, Media, Folders, Tags, Products, Customers, Carts, Orders],
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  localization: {
    locales: [{ code: 'en', label: 'English' }],
    fallback: true,
    defaultLocale: 'en',
  },
  plugins: [mcpPlugin({})],
  // Storage adapters (e.g. s3Storage) go in `storage`, not `plugins` — Payload 4
  // beta throws "plugin is not a function" if a storage factory result ends up
  // in the plugins array instead.
  storage: [
    s3Storage({
      collections: { media: true },
      bucket: process.env.R2_BUCKET!,
      config: {
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID!,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        },
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT,
        forcePathStyle: true,
      },
    }),
  ],
})

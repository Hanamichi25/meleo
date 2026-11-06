import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
  output: 'standalone',
  // Don't block publishing or preview deploys on errors if the emitted JS is valid
  typescript: {
    ignoreBuildErrors: true,
  },
  // Prerender source maps add ~100 MB per static build worker
  enablePrerenderSourceMaps: false,
  experimental: {
    // Caps static build workers (~250-380 MB each) to lower `next build` peak memory
    cpus: 2,
  },
  env: {
    // NOTE: Only public, non-secret values belong here - values placed in `env`
    // are inlined into the JavaScript bundle at build time and become readable
    // by anyone who loads the app's client assets. Server-only secrets
    // (PAYLOAD_SECRET, DATABASE_URI, R2_*, WOMPI_PRIVATE_KEY, etc.) must stay
    // out of this block and be read from `process.env.*` only in server-side
    // code (payload.config.ts, route handlers, server components).
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })

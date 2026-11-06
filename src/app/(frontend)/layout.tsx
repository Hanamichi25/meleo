import type { Metadata } from 'next'
import { Alegreya_Sans, Barlow_Condensed, DM_Sans, Lobster_Two } from 'next/font/google'
import './styles.css'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-body' })
const alegreya = Alegreya_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  style: ['normal', 'italic'],
  variable: '--font-copy',
})
const barlow = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-condensed',
})
const lobster = Lobster_Two({
  subsets: ['latin'],
  weight: ['700'],
  style: ['normal', 'italic'],
  variable: '--font-script',
})

export const metadata: Metadata = {
  title: 'Meleo — Viste el flow',
  description: 'Ropa deportiva oversize hecha en Colombia.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${dmSans.variable} ${alegreya.variable} ${barlow.variable} ${lobster.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}

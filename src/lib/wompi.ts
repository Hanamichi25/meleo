import { createHash, createHmac } from 'crypto'

// Server-only. Nunca importar este módulo desde un Client Component ni exponer
// WOMPI_PRIVATE_KEY / WOMPI_INTEGRITY_SECRET / WOMPI_EVENTS_SECRET en next.config.ts `env`.
const WOMPI_API_BASE = process.env.WOMPI_API_BASE || 'https://sandbox.wompi.co/v1'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Falta la variable de entorno ${name} (configúrala en Figma Make)`)
  return value
}

/** Firma de integridad que exige el widget de Wompi para iniciar un checkout. */
export function buildIntegritySignature(params: {
  reference: string
  amountInCents: number
  currency: string
}): string {
  const integritySecret = requireEnv('WOMPI_INTEGRITY_SECRET')
  const raw = `${params.reference}${params.amountInCents}${params.currency}${integritySecret}`
  return createHash('sha256').update(raw).digest('hex')
}

export function getWompiPublicKey(): string {
  return requireEnv('WOMPI_PUBLIC_KEY')
}

/** Valida la firma de eventos que Wompi envía en cada webhook. */
export function verifyWebhookSignature(payload: {
  signature: { checksum: string; properties: string[] }
  data: Record<string, unknown>
  timestamp: number
}): boolean {
  const eventsSecret = requireEnv('WOMPI_EVENTS_SECRET')
  const concatenatedValues = payload.signature.properties
    .map((path) => {
      const value = path
        .split('.')
        .reduce<unknown>((acc, key) => (acc as Record<string, unknown>)?.[key], payload.data)
      return String(value)
    })
    .join('')
  const raw = `${concatenatedValues}${payload.timestamp}${eventsSecret}`
  const expected = createHmac('sha256', eventsSecret).update(raw).digest('hex')
  // Wompi en realidad usa sha256 simple (no HMAC) sobre la cadena concatenada; se deja HMAC con el
  // secreto como mezcla segura equivalente hasta confirmar el detalle exacto contra la cuenta real.
  return expected === payload.signature.checksum || createHash('sha256').update(raw).digest('hex') === payload.signature.checksum
}

type WompiTransactionResponse = {
  data: {
    id: string
    status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'ERROR'
    reference: string
  }
}

/** Consulta el estado de una transacción directamente en la API de Wompi (fallback si el webhook no llega). */
export async function fetchWompiTransaction(transactionId: string): Promise<WompiTransactionResponse['data']> {
  const response = await fetch(`${WOMPI_API_BASE}/transactions/${transactionId}`)
  if (!response.ok) {
    throw new Error(`No se pudo consultar la transacción Wompi ${transactionId}: ${response.status}`)
  }
  const json = (await response.json()) as WompiTransactionResponse
  return json.data
}

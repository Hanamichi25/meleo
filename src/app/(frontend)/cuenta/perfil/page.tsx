'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function PerfilPage() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || '/'
  const [line1, setLine1] = useState('')
  const [city, setCity] = useState('')
  const [department, setDepartment] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [me, setMe] = useState<{ id: string } | null>(null)

  useEffect(() => {
    fetch('/app-api/customers/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (!body?.user) {
          router.push('/cuenta/login')
          return
        }
        setMe(body.user)
      })
  }, [router])

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!me) return
    setError('')
    setLoading(true)
    try {
      const response = await fetch(`/api/customers/${me.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          addresses: [{ label: 'Principal', line1, city, department, phone }],
        }),
      })
      if (!response.ok) throw new Error('No se pudo guardar la dirección.')
      router.push(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  if (!me) return null

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Dirección de envío</h1>
        <p>La necesitamos para poder enviarte tu pedido.</p>
        {error && <p className="auth-error">{error}</p>}
        <label>
          Dirección
          <input value={line1} onChange={(e) => setLine1(e.target.value)} required />
        </label>
        <label>
          Ciudad
          <input value={city} onChange={(e) => setCity(e.target.value)} required />
        </label>
        <label>
          Departamento
          <input value={department} onChange={(e) => setDepartment(e.target.value)} required />
        </label>
        <label>
          Teléfono de contacto
          <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Guardando…' : 'Guardar y continuar'}
        </button>
      </form>
    </main>
  )
}

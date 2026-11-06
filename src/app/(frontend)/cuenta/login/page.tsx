'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const params = useSearchParams()
  const justRegistered = params.get('registrado') === '1'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await fetch('/api/customers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      if (!response.ok) {
        const body = await response.json()
        throw new Error(body?.errors?.[0]?.message || 'Correo o contraseña incorrectos.')
      }
      router.push('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Inicia sesión</h1>
        {justRegistered && <p className="auth-success">Cuenta creada. Ya puedes iniciar sesión.</p>}
        {error && <p className="auth-error">{error}</p>}
        <label>
          Correo
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Contraseña
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>
        <p>
          ¿No tienes cuenta? <Link href="/cuenta/registro">Regístrate</Link>
        </p>
      </form>
    </main>
  )
}

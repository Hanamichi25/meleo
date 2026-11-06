'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function RegistroPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      if (!response.ok) {
        const body = await response.json()
        throw new Error(body?.errors?.[0]?.message || 'No se pudo crear la cuenta.')
      }
      router.push('/cuenta/login?registrado=1')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Crea tu cuenta</h1>
        {error && <p className="auth-error">{error}</p>}
        <label>
          Nombre
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Correo
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Contraseña
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
        <p>
          ¿Ya tienes cuenta? <Link href="/cuenta/login">Inicia sesión</Link>
        </p>
      </form>
    </main>
  )
}

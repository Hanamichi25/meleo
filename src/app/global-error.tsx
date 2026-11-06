'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="es">
      <body>
        <main className="global-error">
          <p>Algo interrumpió el flow.</p>
          <h1>No pudimos cargar esta vista.</h1>
          <button type="button" onClick={reset}>
            Intentar de nuevo
          </button>
        </main>
      </body>
    </html>
  )
}

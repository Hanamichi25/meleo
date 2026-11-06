import Link from 'next/link'

export default async function GraciasPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const { id } = await searchParams

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <h1>¡Gracias por tu compra!</h1>
        <p>
          Estamos confirmando tu pago con Wompi. Te avisaremos por correo cuando tu pedido
          {id ? ` (ref. ${id})` : ''} quede confirmado.
        </p>
        <Link href="/">Volver a la tienda</Link>
      </div>
    </main>
  )
}

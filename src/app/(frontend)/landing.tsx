'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'

type Product = {
  id: string
  name: string
  sku: string
  category: string
  description: string
  price: number | null
  priceLabel: string
  image: {
    url: string
    alt: string
    width: number
    height: number
  } | null
  stock: { s: number; m: number; l: number; xl: number }
}

type CartItem = {
  key: string
  product: Product
  size: 'S' | 'M' | 'L' | 'XL'
  quantity: number
}

const CART_STORAGE_KEY = 'meleo-cart'

const photos = [
  'https://images.unsplash.com/photo-1564557287817-3785e38ec1f5?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1508216310976-c518daae0cdc?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1685354217981-26c14a211bf8?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1618924250113-e162305ac8cd?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1635105864405-3e75f624d8aa?auto=format&fit=crop&w=1200&q=85',
]

function Icon({ name }: { name: 'arrow' | 'bag' | 'plus' }) {
  if (name === 'bag') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 8h12l1 13H5L6 8Z" />
        <path d="M9 9V6a3 3 0 0 1 6 0v3" />
      </svg>
    )
  }
  if (name === 'plus') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m7 17 10-10M8 7h9v9" />
    </svg>
  )
}

function Logo() {
  return (
    <span className="brand-logo" aria-label="Meleo">
      <span className="brand-crown" aria-hidden="true" />
      meleo
    </span>
  )
}

export function Landing({ products, isLoggedIn }: { products: Product[]; isLoggedIn: boolean }) {
  const [category, setCategory] = useState('Todo')
  const [sizes, setSizes] = useState<Record<string, string>>({})
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [cartReady, setCartReady] = useState(false)
  const [toast, setToast] = useState('')
  const [email, setEmail] = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const rail = useRef<HTMLDivElement>(null)
  const filtered = useMemo(
    () => (category === 'Todo' ? products : products.filter((item) => item.category === category)),
    [category, products],
  )
  const cartCount = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantity, 0),
    [cartItems],
  )
  const subtotal = useMemo(
    () =>
      cartItems.reduce(
        (total, item) => total + (item.product.price ?? 0) * item.quantity,
        0,
      ),
    [cartItems],
  )
  const allItemsHavePrice = cartItems.every((item) => item.product.price !== null)

  useEffect(() => {
    try {
      const savedCart = window.localStorage.getItem(CART_STORAGE_KEY)
      if (savedCart) setCartItems(JSON.parse(savedCart) as CartItem[])
    } catch {
      window.localStorage.removeItem(CART_STORAGE_KEY)
    } finally {
      setCartReady(true)
    }
  }, [])

  useEffect(() => {
    if (!cartReady) return
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems))
  }, [cartItems, cartReady])

  useEffect(() => {
    if (!cartOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCartOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [cartOpen])

  const addToCart = (product: Product) => {
    const size = sizes[product.id] as CartItem['size'] | undefined
    if (!size) {
      setToast('Elige una talla antes de agregar la prenda.')
      return
    }
    const stockKey = size.toLowerCase() as keyof Product['stock']
    if (product.stock[stockKey] <= 0) {
      setToast(`La talla ${size} de ${product.name} está agotada.`)
      return
    }
    const key = `${product.id}-${size}`
    setCartItems((items) => {
      const existing = items.find((item) => item.key === key)
      if (!existing) return [...items, { key, product, size, quantity: 1 }]
      return items.map((item) =>
        item.key === key
          ? { ...item, quantity: Math.min(item.quantity + 1, product.stock[stockKey]) }
          : item,
      )
    })
    setToast(`${product.name}, talla ${size}, se agregó al carrito.`)
    setCartOpen(true)
  }

  const updateCartQuantity = (key: string, quantity: number) => {
    setCartItems((items) =>
      items
        .map((item) => {
          if (item.key !== key) return item
          const stockKey = item.size.toLowerCase() as keyof Product['stock']
          return {
            ...item,
            quantity: Math.min(Math.max(quantity, 0), item.product.stock[stockKey]),
          }
        })
        .filter((item) => item.quantity > 0),
    )
  }

  const formatCOP = (value: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value)

  const scroll = (direction: number) =>
    rail.current?.scrollBy({ left: direction * 360, behavior: 'smooth' })

  const goToCheckout = async () => {
    if (!isLoggedIn) {
      window.location.href = '/cuenta/login'
      return
    }
    setCheckoutLoading(true)
    try {
      await fetch('/app-api/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            product: item.product.id,
            size: item.size,
            quantity: item.quantity,
          })),
        }),
      })

      const response = await fetch('/app-api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ addressIndex: 0 }),
      })
      if (!response.ok) {
        const body = await response.json()
        if (body?.error?.includes('dirección')) {
          window.location.href = '/cuenta/perfil?next=/'
          return
        }
        throw new Error(body?.error || 'No se pudo iniciar el pago.')
      }
      const { wompi } = await response.json()
      const widgetUrl = new URL('https://checkout.wompi.co/p/')
      widgetUrl.searchParams.set('public-key', wompi.publicKey)
      widgetUrl.searchParams.set('currency', wompi.currency)
      widgetUrl.searchParams.set('amount-in-cents', String(wompi.amountInCents))
      widgetUrl.searchParams.set('reference', wompi.reference)
      widgetUrl.searchParams.set('signature:integrity', wompi.signature)
      widgetUrl.searchParams.set('redirect-url', `${window.location.origin}/checkout/gracias`)
      window.location.href = widgetUrl.toString()
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'No se pudo iniciar el pago.')
    } finally {
      setCheckoutLoading(false)
    }
  }

  return (
    <main className="site-shell" suppressHydrationWarning>
      {toast && (
        <button className="toast" onClick={() => setToast('')} type="button">
          {toast} <span>Cerrar</span>
        </button>
      )}
      <header className="topbar">
        <a className="logo-link" href="#inicio" aria-label="Ir al inicio">
          <Logo />
        </a>
        <nav aria-label="Navegación principal">
          <a href="#coleccion">Colección</a>
          <a href="#fit">El fit</a>
          <a href="#lookbook">Lookbook</a>
          <a href="#contacto">Contacto</a>
        </nav>
        <button
          className="cart-button"
          type="button"
          aria-label={`Abrir carrito con ${cartCount} productos`}
          aria-expanded={cartOpen}
          onClick={() => setCartOpen(true)}
        >
          <Icon name="bag" />
          <span>Carrito</span>
          <b>{cartCount}</b>
        </button>
      </header>

      {cartOpen && (
        <div className="cart-backdrop" onClick={() => setCartOpen(false)}>
          <aside
            className="cart-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="cart-drawer-head">
              <div>
                <p>TU SELECCIÓN</p>
                <h2 id="cart-title">Tu flow.</h2>
              </div>
              <button type="button" onClick={() => setCartOpen(false)} aria-label="Cerrar carrito">
                ×
              </button>
            </header>

            {cartItems.length === 0 ? (
              <div className="cart-empty">
                <i>
                  <Icon name="bag" />
                </i>
                <h3>Tu carrito está ligero.</h3>
                <p>Elige una prenda, selecciona tu talla y arma el próximo look.</p>
                <button
                  type="button"
                  onClick={() => {
                    setCartOpen(false)
                    document.querySelector('#coleccion')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  Ver la colección
                </button>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cartItems.map((item) => {
                    const productIndex = Math.max(
                      0,
                      products.findIndex((product) => product.id === item.product.id),
                    )
                    const stockKey = item.size.toLowerCase() as keyof Product['stock']
                    const maxQuantity = item.product.stock[stockKey]

                    return (
                      <article className="cart-item" key={item.key}>
                        <div className="cart-item-image">
                          {item.product.image ? (
                            <Image
                              src={item.product.image.url}
                              alt={item.product.image.alt}
                              fill
                              sizes="96px"
                            />
                          ) : (
                            <img
                              src={photos[productIndex % photos.length]}
                              alt={`Imagen de prueba de ${item.product.name}`}
                            />
                          )}
                        </div>
                        <div className="cart-item-copy">
                          <span>{item.product.category}</span>
                          <h3>{item.product.name}</h3>
                          <p>
                            Talla {item.size} · {item.product.priceLabel}
                          </p>
                          <div className="cart-quantity">
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.key, item.quantity - 1)}
                              aria-label={`Restar una unidad de ${item.product.name}`}
                            >
                              −
                            </button>
                            <span aria-live="polite">{item.quantity}</span>
                            <button
                              type="button"
                              disabled={item.quantity >= maxQuantity}
                              onClick={() => updateCartQuantity(item.key, item.quantity + 1)}
                              aria-label={`Sumar una unidad de ${item.product.name}`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <button
                          className="cart-remove"
                          type="button"
                          onClick={() => setCartItems((items) => items.filter((i) => i.key !== item.key))}
                        >
                          Eliminar
                        </button>
                      </article>
                    )
                  })}
                </div>

                <div className="cart-summary">
                  <div>
                    <span>Subtotal</span>
                    <strong>{allItemsHavePrice ? formatCOP(subtotal) : '[SUBTOTAL]'}</strong>
                  </div>
                  <div>
                    <span>Envío</span>
                    <strong>[COSTO DE ENVÍO]</strong>
                  </div>
                  <p>El valor final se confirma antes de pagar. [POLÍTICA DE ENVÍOS]</p>
                  <button
                    type="button"
                    className="cart-checkout"
                    disabled={!allItemsHavePrice || checkoutLoading}
                    onClick={goToCheckout}
                  >
                    {checkoutLoading ? 'Redirigiendo a pago…' : isLoggedIn ? 'Ir a pagar' : 'Inicia sesión para pagar'}
                    <i>
                      <Icon name="arrow" />
                    </i>
                  </button>
                  <button
                    type="button"
                    className="cart-continue"
                    onClick={() => setCartOpen(false)}
                  >
                    Seguir comprando
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      <section className="hero section-pad" id="inicio">
        <div className="hero-copy">
          <p className="eyebrow">
            <span /> Hecho en Colombia para moverse distinto
          </p>
          <h1>Viste el flow.</h1>
          <p className="hero-text">
            Ropa deportiva oversize para entrenar, salir y habitar la ciudad a tu manera. Sin pedir
            permiso.
          </p>
          <div className="hero-actions">
            <a className="pill pill-primary" href="#coleccion">
              Ver la colección{' '}
              <i>
                <Icon name="arrow" />
              </i>
            </a>
            <a className="pill pill-secondary" href="#fit">
              Cómo calza el oversize
            </a>
          </div>
          <div className="hero-note">
            <strong>01</strong>
            <span>
              Drop de prueba
              <br />
              [FECHA DEL DROP]
            </span>
          </div>
        </div>
        <div className="hero-art">
          <div className="mint-orbit" />
          <img src={photos[0]} alt="Modelo con hoodie oversize gris" />
          <span className="float-tag">
            Silueta
            <br />
            amplia
          </span>
          <svg className="flow-lines" viewBox="0 0 800 160" aria-hidden="true">
            <path d="M-30 45C160 140 270-30 480 65s260 20 360-10" />
            <path d="M-20 85c170 80 300-60 500 15s250 15 360-20" />
          </svg>
        </div>
      </section>

      <div className="ticker" aria-label="Identidad Meleo">
        <div>
          {['OVERSIZE', 'SPORT', 'FLOW', 'MELEO', 'OVERSIZE', 'SPORT', 'FLOW', 'MELEO'].map(
            (word, i) => (
              <span key={`${word}-${i}`}>
                {word}
                <i />
              </span>
            ),
          )}
        </div>
      </div>

      <section className="collection section-pad" id="coleccion">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              <span /> DROP ACTUAL
            </p>
            <h2>
              Elige tu <em>flow.</em>
            </h2>
          </div>
          <div className="carousel-arrows">
            <button type="button" onClick={() => scroll(-1)} aria-label="Anterior">
              ←
            </button>
            <button type="button" onClick={() => scroll(1)} aria-label="Siguiente">
              →
            </button>
          </div>
        </div>
        <div className="filters" aria-label="Filtrar colección">
          {['Todo', 'Hoodies', 'Camisetas', 'Joggers', 'Shorts'].map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => setCategory(item)}
              className={category === item ? 'active' : ''}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="product-rail" ref={rail}>
          {filtered.map((product, index) => (
            <article className="product-card" key={product.id}>
              <div className="product-image">
                {product.image ? (
                  <Image
                    src={product.image.url}
                    alt={product.image.alt}
                    fill
                    sizes="(max-width: 720px) 86vw, 31vw"
                  />
                ) : (
                  <img
                    src={photos[index % photos.length]}
                    alt={`Imagen de prueba de ${product.name}`}
                  />
                )}
                <span>{product.category}</span>
              </div>
              <div className="product-info">
                <div className="product-title">
                  <h3>{product.name}</h3>
                  <strong>{product.priceLabel}</strong>
                </div>
                <p>{product.description}</p>
                <fieldset>
                  <legend>Talla</legend>
                  <div>
                    {['S', 'M', 'L', 'XL'].map((size) => (
                      <button
                        type="button"
                        key={size}
                        className={sizes[product.id] === size ? 'selected' : ''}
                        onClick={() => setSizes((value) => ({ ...value, [product.id]: size }))}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <button className="add-button" type="button" onClick={() => addToCart(product)}>
                  Agregar al carrito{' '}
                  <i>
                    <Icon name="plus" />
                  </i>
                </button>
              </div>
            </article>
          ))}
        </div>
        <div className="progress">
          <span style={{ width: `${Math.max(22, 100 / Math.max(filtered.length, 1))}%` }} />
        </div>
      </section>

      <section className="fit section-pad" id="fit">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              <span /> EL FIT MELEO
            </p>
            <h2>
              Grande en forma.
              <br />
              <em>Ligero en flow.</em>
            </h2>
          </div>
          <p className="section-intro">
            Oversize no significa sin forma. Cada línea está pensada para darte volumen, movimiento
            y una silueta que se siente tuya.
          </p>
        </div>
        <div className="fit-grid">
          {[
            [
              '01',
              'Hombro caído',
              'La costura baja suavemente para crear una silueta más amplia y relajada.',
            ],
            [
              '02',
              'Tela con caída',
              '[TELA] con peso y movimiento. No se pega, no se queda rígida.',
            ],
            [
              '03',
              'Hecha para entrenar',
              'Espacio real para levantar, correr y moverte sin restricciones.',
            ],
            [
              '04',
              'Guía de tallas',
              'Tu talla habitual ya da el fit oversize. Sube una para más volumen.',
            ],
          ].map(([n, title, copy], i) => (
            <article className={i === 1 ? 'fit-card accent' : 'fit-card'} key={n}>
              <span>{n}</span>
              <div className="fit-icon">{i === 0 ? '↘' : i === 1 ? '∿' : i === 2 ? '↗' : '↔'}</div>
              <h3>{title}</h3>
              <p>{copy}</p>
              {i === 3 && <button type="button">Ver guía completa →</button>}
            </article>
          ))}
        </div>
      </section>

      <section className="lookbook section-pad" id="lookbook">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              <span /> LOOKBOOK 001
            </p>
            <h2>
              Cuatro moods.
              <br />
              <em>Un mismo flow.</em>
            </h2>
          </div>
          <a className="pill pill-secondary" href="#coleccion">
            Compra los looks{' '}
            <i>
              <Icon name="arrow" />
            </i>
          </a>
        </div>
        <div className="look-grid">
          {[
            ['Entrena', 'Hoodie Flow 01 + Short Ritmo'],
            ['Calle', 'Camiseta Aire + Jogger Pulso'],
            ['Flow', 'Hoodie Noche + Jogger Pulso'],
            ['Noche', 'Camiseta Aire + Short Ritmo'],
          ].map(([name, items], index) => (
            <article key={name} className={`look-${index + 1}`}>
              <img src={photos[(index + 1) % photos.length]} alt={`Look ${name}`} />
              <div>
                <span>0{index + 1}</span>
                <h3>{name}</h3>
                <p>{items}</p>
              </div>
              <button type="button" aria-label={`Ver look ${name}`}>
                <Icon name="arrow" />
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="promises section-pad">
        {[
          ['CO', 'Envíos a Colombia', '[TIEMPO Y COSTO DE ENVÍO]'],
          ['↺', 'Cambio de talla', '[POLÍTICA DE CAMBIOS]'],
          ['▱', 'Métodos de pago', '[MÉTODOS DE PAGO]'],
        ].map(([icon, title, copy]) => (
          <article key={title}>
            <i>{icon}</i>
            <div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="drop-signup section-pad" id="contacto">
        <div>
          <p className="eyebrow dark">
            <span /> PRÓXIMO DROP
          </p>
          <h2>
            Que no te lo
            <br />
            cuenten.
          </h2>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setToast(
              email
                ? 'Listo. Te avisaremos cuando llegue el próximo drop.'
                : 'Escribe tu correo para continuar.',
            )
          }}
        >
          <label htmlFor="email">Tu correo</label>
          <div>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
            />
            <button type="submit" aria-label="Suscribirme">
              <Icon name="arrow" />
            </button>
          </div>
          <p>Al dejar tu correo aceptas [POLÍTICA DE PRIVACIDAD].</p>
        </form>
      </section>

      <footer className="footer section-pad">
        <div className="footer-main">
          <Logo />
          <p>
            Ropa deportiva oversize
            <br />
            hecha en Colombia.
          </p>
        </div>
        <div>
          <strong>Explora</strong>
          <a href="#coleccion">Colección</a>
          <a href="#fit">El fit</a>
          <a href="#lookbook">Lookbook</a>
        </div>
        <div>
          <strong>Ayuda</strong>
          <a href="#contacto">[CONTACTO]</a>
          <a href="#fit">Guía de tallas</a>
          <a href="#contacto">[POLÍTICAS]</a>
        </div>
        <div>
          <strong>Redes</strong>
          <a href="#contacto">[INSTAGRAM]</a>
          <a href="#contacto">[TIKTOK]</a>
          <Link href="/panel">Panel del dueño ↗</Link>
        </div>
        <small>© MELEO · TODOS LOS DERECHOS RESERVADOS</small>
      </footer>
    </main>
  )
}

'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

type Product = {
  id: number
  name: string
  sku: string
  category: string
  stockTotal?: number | null
  stock: { s: number; m: number; l: number; xl: number }
}
type Address = { label?: string | null; line1: string; city: string }
type Customer = {
  id: number
  name: string
  phone?: string | null
  addresses?: Address[] | null
  orderCount?: number | null
  totalSpent?: number | null
  internalNotes?: string | null
}
type OrderItem = { productName: string; size: string; quantity: number }
type Order = {
  id: number
  orderNumber?: string | null
  customer: number | Customer
  items: OrderItem[]
  total: number
  status: string
}

const cityOf = (customer: Customer) => customer.addresses?.[0]?.city || 'Sin ciudad registrada'
const itemsSummaryOf = (order: Order) =>
  order.items.map((item) => `${item.productName} (${item.size}) x${item.quantity}`).join(', ')

const total = (product: Product) =>
  Object.values(product.stock).reduce((sum, value) => sum + Number(value || 0), 0)
const status = (product: Product) =>
  total(product) === 0 ? 'Agotado' : total(product) <= 6 ? 'Stock bajo' : 'Disponible'
const rank = { Agotado: 0, 'Stock bajo': 1, Disponible: 2 }

export function OwnerPanel({
  initialProducts,
  initialCustomers,
  initialOrders,
}: {
  initialProducts: Product[]
  initialCustomers: Customer[]
  initialOrders: Order[]
}) {
  const [view, setView] = useState<'inventory' | 'clients'>('inventory')
  const [products, setProducts] = useState(initialProducts)
  const [selected, setSelected] = useState<Product | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    initialCustomers[0] || null,
  )
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Todos')
  const [sort, setSort] = useState<'Prenda' | 'Stock' | 'Estado'>('Estado')
  const [notice, setNotice] = useState<{ message: string; previous?: Product[] } | null>(null)
  const [notes, setNotes] = useState(selectedCustomer?.internalNotes || '')

  const inventory = useMemo(
    () =>
      products
        .filter((product) => {
          const match = `${product.name} ${product.sku}`
            .toLowerCase()
            .includes(search.toLowerCase())
          return match && (filter === 'Todos' || status(product) === filter)
        })
        .sort((a, b) =>
          sort === 'Prenda'
            ? a.name.localeCompare(b.name)
            : sort === 'Stock'
              ? total(a) - total(b)
              : rank[status(a)] - rank[status(b)],
        ),
    [products, search, filter, sort],
  )

  const clients = initialCustomers.filter((client) =>
    `${client.name} ${cityOf(client)}`.toLowerCase().includes(search.toLowerCase()),
  )
  const updateStock = (size: keyof Product['stock'], value: number) => {
    if (!selected) return
    const previous = products
    const next = { ...selected, stock: { ...selected.stock, [size]: Math.max(0, value) } }
    setProducts((items) => items.map((item) => (item.id === next.id ? next : item)))
    setSelected(next)
    setNotice({ message: `Stock ${size.toUpperCase()} actualizado.`, previous })
  }

  return (
    <main className="panel-shell">
      <aside className="sidebar">
        <div className="panel-logo">
          meleo <small>OWNER</small>
        </div>
        <nav aria-label="Panel del dueño">
          <button
            type="button"
            className={view === 'inventory' ? 'active' : ''}
            onClick={() => {
              setView('inventory')
              setSearch('')
            }}
          >
            ▦ <span>Inventario</span>
          </button>
          <button
            type="button"
            className={view === 'clients' ? 'active' : ''}
            onClick={() => {
              setView('clients')
              setSearch('')
            }}
          >
            ◎ <span>Clientes</span>
          </button>
          <Link href="/">
            ↗ <span>Ver la tienda</span>
          </Link>
        </nav>
        <a className="cms-link" href="/admin/collections/products">
          Administrar catálogo ↗
        </a>
      </aside>
      <section className="panel-content">
        <header>
          <div>
            <p>MELEO / {view === 'inventory' ? 'INVENTARIO' : 'CLIENTES'}</p>
            <h1>{view === 'inventory' ? 'Inventario' : 'Clientes'}</h1>
            <span>Datos de ejemplo</span>
          </div>
          <Link href="/admin/collections/products/create">
            + Agregar prenda
          </Link>
        </header>
        {notice && (
          <div className="undo">
            {notice.message}
            <button
              type="button"
              onClick={() => {
                if (notice.previous) setProducts(notice.previous)
                setNotice(null)
              }}
            >
              Deshacer
            </button>
          </div>
        )}
        {view === 'inventory' ? (
          <>
            <div className="summary-grid">
              <article>
                <span>Unidades en stock</span>
                <strong>{products.reduce((sum, item) => sum + total(item), 0)}</strong>
                <small>En todas las tallas</small>
              </article>
              <article>
                <span>Referencias</span>
                <strong>{products.length}</strong>
                <small>{new Set(products.map((p) => p.category)).size} categorías</small>
              </article>
              <button type="button" onClick={() => setFilter('Stock bajo')}>
                <span>Stock bajo</span>
                <strong>{products.filter((p) => status(p) === 'Stock bajo').length}</strong>
                <small>Revisar ahora →</small>
              </button>
              <button type="button" onClick={() => setFilter('Agotado')} className="danger-card">
                <span>Agotadas</span>
                <strong>{products.filter((p) => status(p) === 'Agotado').length}</strong>
                <small>Reponer →</small>
              </button>
            </div>
            <div className="toolbar">
              <label>
                Buscar prendas
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nombre o SKU"
                />
              </label>
              <label>
                Estado
                <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                  <option>Todos</option>
                  <option>Disponible</option>
                  <option>Stock bajo</option>
                  <option>Agotado</option>
                </select>
              </label>
              <label>
                Ordenar
                <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
                  <option>Estado</option>
                  <option>Prenda</option>
                  <option>Stock</option>
                </select>
              </label>
            </div>
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Prenda</th>
                    <th>SKU</th>
                    <th>Categoría</th>
                    <th>Stock total</th>
                    <th>Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <b>{product.name}</b>
                      </td>
                      <td>{product.sku}</td>
                      <td>{product.category}</td>
                      <td>{total(product)}</td>
                      <td>
                        <span
                          className={`status ${status(product).replace(' ', '-').toLowerCase()}`}
                        >
                          ● {status(product)}
                        </span>
                      </td>
                      <td>
                        <button type="button" onClick={() => setSelected(product)}>
                          Abrir →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <div className="summary-grid client-summary">
              <article>
                <span>Clientes</span>
                <strong>{initialCustomers.length}</strong>
                <small>Datos de ejemplo</small>
              </article>
              <article>
                <span>Nuevos</span>
                <strong>{initialCustomers.filter((c) => c.orderCount === 1).length}</strong>
                <small>1 pedido</small>
              </article>
              <article>
                <span>Frecuentes</span>
                <strong>
                  {
                    initialCustomers.filter(
                      (c) => (c.orderCount || 0) >= 2 && (c.orderCount || 0) <= 3,
                    ).length
                  }
                </strong>
                <small>2 o 3 pedidos</small>
              </article>
              <article>
                <span>VIP</span>
                <strong>{initialCustomers.filter((c) => (c.orderCount || 0) >= 4).length}</strong>
                <small>4 o más pedidos</small>
              </article>
            </div>
            <div className="client-layout">
              <div>
                <div className="toolbar">
                  <label>
                    Buscar clientes
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Nombre o ciudad"
                    />
                  </label>
                </div>
                <div className="client-list">
                  {clients.map((client) => (
                    <button
                      type="button"
                      key={client.id}
                      className={selectedCustomer?.id === client.id ? 'selected' : ''}
                      onClick={() => {
                        setSelectedCustomer(client)
                        setNotes(client.internalNotes || '')
                      }}
                    >
                      <span>
                        <b>{client.name}</b>
                        <small>{cityOf(client)}</small>
                      </span>
                      <span>
                        <b>
                          {(client.orderCount || 0) >= 4
                            ? 'VIP'
                            : (client.orderCount || 0) >= 2
                              ? 'Frecuente'
                              : 'Nuevo'}
                        </b>
                        <small>{client.orderCount || 0} pedidos · [TOTAL COP]</small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              {selectedCustomer && (
                <aside className="client-detail">
                  <p>DETALLE DEL CLIENTE</p>
                  <h2>{selectedCustomer.name}</h2>
                  <span>{cityOf(selectedCustomer)}</span>
                  <h3>Historial de pedidos</h3>
                  {initialOrders
                    .filter(
                      (order) =>
                        typeof order.customer === 'object' &&
                        order.customer.id === selectedCustomer.id,
                    )
                    .map((order) => (
                      <article key={order.id}>
                        <b>{order.orderNumber}</b>
                        <small>{itemsSummaryOf(order)}</small>
                        <span>{order.status}</span>
                      </article>
                    ))}
                  <label>
                    Notas internas
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </label>
                  <button
                    type="button"
                    onClick={() => setNotice({ message: 'Notas guardadas en este prototipo.' })}
                  >
                    Guardar notas
                  </button>
                  <button type="button" className="whatsapp">
                    Escribir por WhatsApp ↗
                  </button>
                </aside>
              )}
            </div>
          </>
        )}
      </section>
      {selected && (
        <div className="drawer-backdrop" onClick={() => setSelected(null)}>
          <aside className="stock-drawer" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="close" onClick={() => setSelected(null)}>
              ×
            </button>
            <p>AJUSTAR STOCK</p>
            <h2>{selected.name}</h2>
            <span>
              {selected.sku} · {status(selected)}
            </span>
            <div className="size-stock">
              {(['s', 'm', 'l', 'xl'] as const).map((size) => (
                <div key={size}>
                  <b>{size.toUpperCase()}</b>
                  <button
                    type="button"
                    disabled={selected.stock[size] === 0}
                    onClick={() => updateStock(size, selected.stock[size] - 1)}
                  >
                    −
                  </button>
                  <label>
                    <span>Unidades talla {size.toUpperCase()}</span>
                    <input
                      type="number"
                      min="0"
                      value={selected.stock[size]}
                      onChange={(e) => updateStock(size, Number(e.target.value))}
                    />
                  </label>
                  <button type="button" onClick={() => updateStock(size, selected.stock[size] + 1)}>
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStock(size, selected.stock[size] + 10)}
                  >
                    +10
                  </button>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </main>
  )
}

import type { Access, CollectionConfig } from 'payload'
import { APIError } from 'payload'

const isAdmin: Access = ({ req }) => req.user?.collection === 'admins'
const isOwnerOrAdmin: Access = ({ req }) => {
  if (req.user?.collection === 'admins') return true
  if (req.user?.collection === 'customers') return { customer: { equals: req.user.id } }
  return false
}

type StockKey = 's' | 'm' | 'l' | 'xl'
const sizeToStockKey: Record<string, StockKey> = { S: 's', M: 'm', L: 'l', XL: 'xl' }

export const Orders: CollectionConfig = {
  slug: 'orders',
  labels: { singular: 'Pedido', plural: 'Pedidos' },
  admin: { group: 'Meleo', useAsTitle: 'orderNumber', defaultColumns: ['orderNumber', 'customer', 'status', 'total'] },
  access: {
    // Los pedidos solo se crean desde el endpoint de checkout (overrideAccess: true tras validar
    // stock/precios ahí); bloqueamos creación directa vía API pública.
    create: isAdmin,
    read: isOwnerOrAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'orderNumber',
      label: 'Número de pedido',
      type: 'text',
      unique: true,
      admin: { readOnly: true },
      hooks: {
        beforeChange: [
          ({ value, operation }) => {
            if (operation === 'create' && !value) {
              return `MLO-${Date.now().toString(36).toUpperCase()}`
            }
            return value
          },
        ],
      },
    },
    { name: 'customer', label: 'Cliente', type: 'relationship', relationTo: 'customers', required: true },
    {
      name: 'items',
      label: 'Artículos',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        { name: 'product', label: 'Producto', type: 'relationship', relationTo: 'products', required: true },
        { name: 'productName', label: 'Nombre (snapshot)', type: 'text', required: true },
        { name: 'size', label: 'Talla', type: 'select', required: true, options: ['S', 'M', 'L', 'XL'] },
        { name: 'quantity', label: 'Cantidad', type: 'number', required: true, min: 1 },
        { name: 'unitPrice', label: 'Precio unitario (snapshot)', type: 'number', required: true, min: 0 },
      ],
    },
    {
      name: 'shippingAddress',
      label: 'Dirección de envío',
      type: 'group',
      fields: [
        { name: 'line1', label: 'Dirección', type: 'text', required: true },
        { name: 'line2', label: 'Complemento', type: 'text' },
        { name: 'city', label: 'Ciudad', type: 'text', required: true },
        { name: 'department', label: 'Departamento', type: 'text', required: true },
        { name: 'phone', label: 'Teléfono de contacto', type: 'text', required: true },
      ],
    },
    { name: 'subtotal', label: 'Subtotal (COP)', type: 'number', required: true, min: 0, admin: { readOnly: true } },
    { name: 'shippingCost', label: 'Costo de envío (COP)', type: 'number', required: true, min: 0, defaultValue: 0 },
    { name: 'total', label: 'Total (COP)', type: 'number', required: true, min: 0, admin: { readOnly: true } },
    {
      name: 'status',
      label: 'Estado',
      type: 'select',
      required: true,
      defaultValue: 'pendiente_pago',
      options: [
        'pendiente_pago',
        'pagado',
        'en_preparacion',
        'enviado',
        'entregado',
        'cancelado',
      ],
    },
    {
      name: 'payment',
      label: 'Pago',
      type: 'group',
      fields: [
        { name: 'provider', label: 'Proveedor', type: 'text', defaultValue: 'wompi', admin: { readOnly: true } },
        { name: 'wompiTransactionId', label: 'ID de transacción Wompi', type: 'text', admin: { readOnly: true } },
        { name: 'wompiReference', label: 'Referencia Wompi', type: 'text', unique: true, admin: { readOnly: true } },
        {
          name: 'status',
          label: 'Estado del pago',
          type: 'select',
          defaultValue: 'pendiente',
          options: ['pendiente', 'aprobado', 'declinado'],
        },
        {
          name: 'rawWebhookPayload',
          label: 'Payload del webhook (crudo)',
          type: 'json',
          access: { read: isAdmin, update: isAdmin },
          admin: { readOnly: true },
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        if (operation !== 'create') return data
        const subtotal = (data.items ?? []).reduce(
          (sum: number, item: { unitPrice?: number; quantity?: number }) =>
            sum + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0),
          0,
        )
        data.subtotal = subtotal
        data.total = subtotal + (Number(data.shippingCost) || 0)
        return data
      },
    ],
    beforeValidate: [
      // Descuenta el stock reservado por este pedido antes de persistirlo. No es una transacción de
      // base de datos (el adapter administrado por Figma no la expone a la Local API); para el volumen
      // inicial de esta tienda, la ventana de condición de carrera entre la lectura y la escritura es
      // aceptable. Si el stock no alcanza, se aborta la creación del pedido.
      async ({ data, operation, req }) => {
        if (operation !== 'create') return data
        const items = (data?.items ?? []) as Array<{ product: string; size: string; quantity: number }>

        // Agrupa por producto+talla primero: un pedido con el mismo producto/talla repetido en dos
        // renglones debe validarse y descontarse por la cantidad total combinada, no renglón por renglón.
        const neededByKey = new Map<string, { product: string; size: string; quantity: number }>()
        for (const item of items) {
          const key = `${item.product}-${item.size}`
          const existing = neededByKey.get(key)
          neededByKey.set(key, {
            product: item.product,
            size: item.size,
            quantity: (existing?.quantity ?? 0) + item.quantity,
          })
        }

        for (const need of neededByKey.values()) {
          const stockKey = sizeToStockKey[need.size]
          const product = await req.payload.findByID({
            collection: 'products',
            id: need.product,
            req,
          })
          const available = Number(product.stock?.[stockKey] ?? 0)
          if (available < need.quantity) {
            throw new APIError(
              `Stock insuficiente para ${product.name} talla ${need.size}: quedan ${available} unidades.`,
              400,
            )
          }
        }

        for (const need of neededByKey.values()) {
          const stockKey = sizeToStockKey[need.size]
          const product = await req.payload.findByID({
            collection: 'products',
            id: need.product,
            req,
          })
          await req.payload.update({
            collection: 'products',
            id: need.product,
            data: {
              stock: {
                ...product.stock,
                [stockKey]: Number(product.stock?.[stockKey] ?? 0) - need.quantity,
              },
            },
            req,
          })
        }

        return data
      },
    ],
  },
}

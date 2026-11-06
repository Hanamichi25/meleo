import type { Access, CollectionConfig, FieldAccess } from 'payload'

const isAdmin: Access = ({ req }) => req.user?.collection === 'admins'
const isAdminField: FieldAccess = ({ req }) => req.user?.collection === 'admins'
const isOwnerOrAdmin: Access = ({ req }) => {
  if (req.user?.collection === 'admins') return true
  if (req.user?.collection === 'customers') return { customer: { equals: req.user.id } }
  return false
}
const canCreate: Access = ({ req }) =>
  req.user?.collection === 'customers' || req.user?.collection === 'admins'

export const Carts: CollectionConfig = {
  slug: 'carts',
  labels: { singular: 'Carrito', plural: 'Carritos' },
  admin: { group: 'Meleo', useAsTitle: 'id' },
  access: {
    create: canCreate,
    read: isOwnerOrAdmin,
    update: isOwnerOrAdmin,
    delete: isAdmin,
  },
  fields: [
    { name: 'customer', label: 'Cliente', type: 'relationship', relationTo: 'customers', required: true, unique: true },
    {
      name: 'items',
      label: 'Artículos',
      type: 'array',
      fields: [
        { name: 'product', label: 'Producto', type: 'relationship', relationTo: 'products', required: true },
        {
          name: 'size',
          label: 'Talla',
          type: 'select',
          required: true,
          options: ['S', 'M', 'L', 'XL'],
        },
        { name: 'quantity', label: 'Cantidad', type: 'number', required: true, min: 1 },
      ],
    },
    {
      name: 'status',
      label: 'Estado',
      type: 'select',
      required: true,
      defaultValue: 'abierto',
      options: ['abierto', 'convertido', 'abandonado'],
      admin: { readOnly: true },
      access: { update: isAdminField },
    },
  ],
}

import type { Access, CollectionConfig } from 'payload'

const isAdmin: Access = ({ req }) => req.user?.collection === 'admins'
const isSelfOrAdmin: Access = ({ req }) => {
  if (req.user?.collection === 'admins') return true
  if (req.user?.collection === 'customers') return { id: { equals: req.user.id } }
  return false
}

export const Customers: CollectionConfig = {
  slug: 'customers',
  labels: { singular: 'Cliente', plural: 'Clientes' },
  admin: { group: 'Meleo', useAsTitle: 'name' },
  auth: true,
  access: {
    create: () => true,
    read: isSelfOrAdmin,
    update: isSelfOrAdmin,
    delete: isAdmin,
  },
  fields: [
    { name: 'name', label: 'Nombre', type: 'text', required: true },
    { name: 'phone', label: 'Teléfono', type: 'text' },
    {
      name: 'addresses',
      label: 'Direcciones',
      type: 'array',
      fields: [
        { name: 'label', label: 'Etiqueta', type: 'text', admin: { description: 'Ej: Casa, Oficina' } },
        { name: 'line1', label: 'Dirección', type: 'text', required: true },
        { name: 'line2', label: 'Complemento', type: 'text' },
        { name: 'city', label: 'Ciudad', type: 'text', required: true },
        { name: 'department', label: 'Departamento', type: 'text', required: true },
        { name: 'phone', label: 'Teléfono de contacto', type: 'text', required: true },
      ],
    },
    {
      name: 'orderCount',
      label: 'Pedidos realizados',
      type: 'number',
      min: 0,
      defaultValue: 0,
      admin: { readOnly: true },
      access: { update: isAdmin },
    },
    {
      name: 'totalSpent',
      label: 'Total gastado (COP)',
      type: 'number',
      min: 0,
      defaultValue: 0,
      admin: { readOnly: true },
      access: { update: isAdmin },
    },
    {
      name: 'internalNotes',
      label: 'Notas internas',
      type: 'textarea',
      access: { read: isAdmin, update: isAdmin },
    },
  ],
}

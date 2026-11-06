import type { Access, CollectionConfig } from 'payload'
import { revalidateTag } from 'next/cache'

const isAdmin: Access = ({ req }) => req.user?.collection === 'admins'
const catalogTag = 'meleo-products'

export const Products: CollectionConfig = {
  slug: 'products',
  labels: { singular: 'Prenda', plural: 'Inventario' },
  admin: {
    group: 'Meleo',
    useAsTitle: 'name',
    defaultColumns: ['name', 'sku', 'category', 'price', 'stockTotal'],
    listSearchableFields: ['name', 'sku', 'category'],
    description:
      'Crea y edita las prendas visibles en la tienda. Completa el precio, la imagen y el stock antes de publicar.',
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'name',
      label: 'Nombre de la prenda',
      type: 'text',
      required: true,
      admin: { description: 'Ejemplo: Hoodie Flow 01' },
    },
    {
      name: 'sku',
      label: 'SKU',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Código único para identificar esta referencia.' },
    },
    {
      name: 'category',
      label: 'Categoría',
      type: 'select',
      required: true,
      options: ['Hoodies', 'Camisetas', 'Joggers', 'Shorts'],
    },
    {
      name: 'description',
      label: 'Descripción corta',
      type: 'textarea',
      required: true,
      admin: { description: 'Se muestra debajo del nombre en la tarjeta del producto.' },
    },
    {
      name: 'price',
      label: 'Precio (COP)',
      type: 'number',
      min: 0,
      admin: {
        description: 'Escribe el valor en pesos colombianos, sin puntos ni símbolo de moneda.',
        step: 1000,
      },
    },
    {
      name: 'priceLabel',
      label: 'Texto alternativo de precio',
      type: 'text',
      defaultValue: '[PRECIO]',
      admin: {
        description: 'Solo se usa mientras el precio numérico esté vacío.',
      },
    },
    {
      name: 'image',
      label: 'Imagen principal',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Sube una fotografía vertical de la prenda o selecciónala de la biblioteca.',
      },
    },
    {
      name: 'stock',
      label: 'Stock por talla',
      type: 'group',
      fields: [
        { name: 's', label: 'S', type: 'number', required: true, min: 0, defaultValue: 0 },
        { name: 'm', label: 'M', type: 'number', required: true, min: 0, defaultValue: 0 },
        { name: 'l', label: 'L', type: 'number', required: true, min: 0, defaultValue: 0 },
        { name: 'xl', label: 'XL', type: 'number', required: true, min: 0, defaultValue: 0 },
      ],
    },
    {
      name: 'stockTotal',
      type: 'number',
      admin: { readOnly: true },
      hooks: {
        beforeChange: [
          ({ siblingData }) => {
            const stock = siblingData.stock ?? {}
            return ['s', 'm', 'l', 'xl'].reduce(
              (total, size) => total + (Number(stock[size]) || 0),
              0,
            )
          },
        ],
      },
    },
  ],
  hooks: {
    afterChange: [
      ({ doc }) => {
        revalidateTag(catalogTag, 'max')
        return doc
      },
    ],
    afterDelete: [
      ({ doc }) => {
        revalidateTag(catalogTag, 'max')
        return doc
      },
    ],
  },
}

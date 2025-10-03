export const statusDefinitions = {
  pending: {
    id: 'pending',
    title: 'In attesa',
    target: 4,
    description: "Ordini che richiedono approvazione prima dell'evasione.",
  },
  preparing: {
    id: 'preparing',
    title: 'In preparazione',
    target: 6,
    description: 'Ordini per cui sono stati richiesti i materiali al magazzino.',
  },
  completed: {
    id: 'completed',
    title: 'Completati',
    target: 10,
    description: 'Ordini pronti per la consegna al cliente.',
  },
}

export const orders = [
  {
    id: 'R-10543',
    customer: 'Alma S.r.l.',
    items: 12,
    status: 'pending',
    updatedAt: '2025-02-17T08:30:00Z',
  },
  {
    id: 'R-10544',
    customer: 'Caffè Piave',
    items: 7,
    status: 'preparing',
    updatedAt: '2025-02-17T10:12:00Z',
  },
  {
    id: 'R-10545',
    customer: 'Antica Forneria',
    items: 18,
    status: 'completed',
    updatedAt: '2025-02-17T06:45:00Z',
  },
  {
    id: 'R-10546',
    customer: 'La Dispensa Verde',
    items: 9,
    status: 'preparing',
    updatedAt: '2025-02-17T07:18:00Z',
  },
  {
    id: 'R-10547',
    customer: 'Bistrot 92',
    items: 5,
    status: 'pending',
    updatedAt: '2025-02-17T11:05:00Z',
  },
  {
    id: 'R-10548',
    customer: 'Panificio Rialto',
    items: 21,
    status: 'completed',
    updatedAt: '2025-02-16T17:20:00Z',
  },
  {
    id: 'R-10549',
    customer: 'Trattoria Al Porto',
    items: 14,
    status: 'preparing',
    updatedAt: '2025-02-17T05:37:00Z',
  },
  {
    id: 'R-10550',
    customer: 'Hotel Serenissima',
    items: 30,
    status: 'completed',
    updatedAt: '2025-02-15T19:50:00Z',
  },
]

import { useMemo, useState } from 'react'
import SummaryGrid from './components/SummaryGrid'
import OrdersTable from './components/OrdersTable'
import { orders, statusDefinitions } from './data/orders'
import './App.css'

const buildSummaryCards = (currentOrders) => {
  const counts = currentOrders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] ?? 0) + 1
    return acc
  }, {})

  return Object.values(statusDefinitions).reduce((acc, definition) => {
    const total = counts[definition.id] ?? 0
    const difference = total - definition.target
    const trendLabel =
      difference === 0
        ? 'In linea con il target'
        : `${difference > 0 ? '+' : ''}${difference} rispetto al target`

    acc[definition.id] = {
      id: definition.id,
      title: definition.title,
      total,
      trendLabel,
      trendPositive: difference >= 0,
      description: definition.description,
    }

    return acc
  }, {})
}

const STATUS_OPTIONS = [
  { id: 'all', label: 'Tutti' },
  ...Object.values(statusDefinitions).map(({ id, title }) => ({
    id,
    label: title,
  })),
]

function App() {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return orders.filter((order) => {
      const matchesQuery =
        !normalizedQuery ||
        order.id.toLowerCase().includes(normalizedQuery) ||
        order.customer.toLowerCase().includes(normalizedQuery)

      const matchesStatus =
        statusFilter === 'all' ? true : order.status === statusFilter

      return matchesQuery && matchesStatus
    })
  }, [query, statusFilter])

  const summaryCards = useMemo(
    () => buildSummaryCards(filteredOrders),
    [filteredOrders],
  )

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <p className="page__eyebrow">Dashboard riordini</p>
          <h1 className="page__title">Situazione ordini ricorrenti</h1>
        </div>
        <div className="filters">
          <label className="filters__search">
            <span className="sr-only">Cerca per codice o cliente</span>
            <input
              type="search"
              value={query}
              placeholder="Cerca ordine..."
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <nav aria-label="Filtra per stato" className="filters__statuses">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={
                  statusFilter === option.id
                    ? 'filters__status filters__status--active'
                    : 'filters__status'
                }
                onClick={() => setStatusFilter(option.id)}
              >
                {option.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <SummaryGrid cards={summaryCards} />

      <section aria-labelledby="orders-section" className="orders">
        <div className="orders__header">
          <h2 id="orders-section">Elenco ordini</h2>
          <p className="orders__count">{filteredOrders.length} risultati</p>
        </div>
        <OrdersTable orders={filteredOrders} />
      </section>
    </div>
  )
}

export default App

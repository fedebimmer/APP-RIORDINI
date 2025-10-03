import StatusBadge from './StatusBadge'

const formatDate = (iso) =>
  new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const OrdersTable = ({ orders }) => {
  if (!orders.length) {
    return <p className="empty-state">Nessun ordine corrisponde ai filtri impostati.</p>
  }

  return (
    <table className="orders-table">
      <thead>
        <tr>
          <th scope="col">Codice</th>
          <th scope="col">Cliente</th>
          <th scope="col" className="orders-table__numbers">
            Pezzi
          </th>
          <th scope="col">Stato</th>
          <th scope="col">Ultimo aggiornamento</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.id}>
            <th scope="row">{order.id}</th>
            <td>{order.customer}</td>
            <td className="orders-table__numbers">{order.items}</td>
            <td>
              <StatusBadge status={order.status} />
            </td>
            <td>{formatDate(order.updatedAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default OrdersTable

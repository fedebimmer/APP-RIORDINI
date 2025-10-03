const STATUS_LABELS = {
  pending: { label: 'In attesa', tone: 'warning' },
  preparing: { label: 'In preparazione', tone: 'info' },
  completed: { label: 'Completato', tone: 'success' },
}

const StatusBadge = ({ status }) => {
  const { label, tone } = STATUS_LABELS[status] ?? {
    label: status,
    tone: 'neutral',
  }

  return <span className={`status-badge status-badge--${tone}`}>{label}</span>
}

export default StatusBadge

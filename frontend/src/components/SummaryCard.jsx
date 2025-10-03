const SummaryCard = ({ title, total, trendLabel, trendPositive, description }) => {
  return (
    <article className="summary-card">
      <header className="summary-card__header">
        <p className="summary-card__title">{title}</p>
        <span
          className={`summary-card__trend ${trendPositive ? 'summary-card__trend--positive' : 'summary-card__trend--negative'}`}
        >
          {trendLabel}
        </span>
      </header>
      <p className="summary-card__total">{total}</p>
      <p className="summary-card__description">{description}</p>
    </article>
  )
}

export default SummaryCard

import SummaryCard from './SummaryCard'

/**
 * Rende una collezione di card statistiche partendo da una mappa di React element.
 * In precedenza le card venivano restituite direttamente come oggetto, provocando
 * l'errore "Minified React error #31" perché gli oggetti non sono figli React validi.
 * Convertiamo l'oggetto in un array ordinato prima di renderizzare i componenti.
 */
const SummaryGrid = ({ cards }) => {
  const cardList = Array.isArray(cards)
    ? cards
    : Object.values(cards ?? {})

  return (
    <section className="summary-grid" aria-label="Statistiche riordini">
      {cardList.map((card) => (
        <SummaryCard key={card.id} {...card} />
      ))}
    </section>
  )
}

export default SummaryGrid

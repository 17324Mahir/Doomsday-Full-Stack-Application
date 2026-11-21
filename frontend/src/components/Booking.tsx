import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Check, Plus, Ticket, Users } from 'lucide-react'
import { cinemasApi, errorMessage, type BookingResult, type Cinema } from '../api'
import Dialog from './Dialog'

function CinemaForm({ onClose, onSave }: { onClose: () => void; onSave: (cinema: Cinema) => void }) {
  const [name, setName] = useState('')
  const [sizes, setSizes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setError('')
    if (!name.trim()) {
      setError('Enter a cinema name.')
      return
    }
    const bundles = sizes.split(',').map((item) => Number(item.trim()))
    if (
      bundles.length > 10 ||
      bundles.some((size) => !Number.isInteger(size) || size < 1 || size > 500) ||
      new Set(bundles).size !== bundles.length
    ) {
      setError('Enter up to 10 different bundle sizes between 1 and 500, separated by commas.')
      return
    }
    setBusy(true)
    try {
      onSave(await cinemasApi.create(name.trim(), bundles))
    } catch (cause) {
      setError(errorMessage(cause, 'Unable to save the cinema. Try again.'))
      setBusy(false)
    }
  }
  return (
    <Dialog title="Add cinema" onClose={onClose} busy={busy}>
      <form className="stack" onSubmit={save}>
        <label>
          Cinema name
          <input autoFocus required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Seat bundle sizes
          <input required value={sizes} placeholder="1, 3, 4" onChange={(e) => setSizes(e.target.value)} />
          <small>Separate each size with a comma.</small>
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy ? 'Saving…' : 'Add cinema'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}

export default function Booking() {
  const [cinemas, setCinemas] = useState<Cinema[]>([])
  const [cinemaId, setCinemaId] = useState(0)
  const [groupSize, setGroupSize] = useState('6')
  const [result, setResult] = useState<BookingResult | null>(null)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [adding, setAdding] = useState(false)
  const [message, setMessage] = useState('')
  const request = useRef<AbortController | null>(null)
  const cinema = cinemas.find((item) => item.id === cinemaId)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setLoadError('')
    cinemasApi
      .list(controller.signal)
      .then((list) => {
        setCinemas(list)
        setCinemaId(list[0]?.id ?? 0)
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setLoadError(errorMessage(cause, 'Unable to load cinemas. Try again.'))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => {
      controller.abort()
      request.current?.abort()
    }
  }, [refresh])

  function resetResult() {
    request.current?.abort()
    setBusy(false)
    setResult(null)
    setError('')
    setMessage('')
  }

  async function calculate(event: FormEvent) {
    event.preventDefault()
    if (!cinema || busy) return
    resetResult()
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    try {
      const booking = await cinemasApi.booking(cinema.id, Number(groupSize), controller.signal)
      if (!controller.signal.aborted) setResult(booking)
    } catch (cause) {
      if (!controller.signal.aborted) setError(errorMessage(cause, 'Unable to calculate bundles. Try again.'))
    } finally {
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  return (
    <section className="container workspace">
      <header className="page-heading">
        <h1>Watch party booking</h1>
        <p>Find the fewest seat bundles that fit your group exactly.</p>
      </header>
      {loading ? (
        <p className="empty-state" role="status">
          Loading cinemas…
        </p>
      ) : loadError ? (
        <div className="empty-state">
          <p role="alert" className="error">
            {loadError}
          </p>
          <button className="secondary" onClick={() => setRefresh(refresh + 1)}>
            Try again
          </button>
        </div>
      ) : (
        <div className="planner-layout">
          <form className="panel stack" onSubmit={calculate}>
            <div className="panel-heading">
              <h2>Party details</h2>
              <button type="button" className="text-button" onClick={() => setAdding(true)}>
                <Plus size={15} />
                Add cinema
              </button>
            </div>
            {cinemas.length ? (
              <>
                <label>
                  Cinema
                  <select
                    value={cinemaId}
                    onChange={(e) => {
                      resetResult()
                      setCinemaId(Number(e.target.value))
                    }}
                  >
                    {cinemas.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div>
                  <span className="field-label">Available bundles</span>
                  <div className="bundle-tags">
                    {cinema?.bundles.map(({ size }) => (
                      <span key={size}>
                        <Ticket size={13} />
                        {size} {size === 1 ? 'seat' : 'seats'}
                      </span>
                    ))}
                  </div>
                </div>
                <label>
                  Number of people
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    required
                    value={groupSize}
                    onChange={(e) => {
                      resetResult()
                      setGroupSize(e.target.value)
                    }}
                  />
                </label>
                <button className="primary" disabled={busy}>
                  {busy ? 'Calculating…' : 'Calculate booking'}
                </button>
              </>
            ) : (
              <p className="muted">Add a cinema and its bundle sizes to plan your first party.</p>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="success">
                {message}
              </p>
            )}
          </form>
          <div className="panel results" aria-live="polite" aria-busy={busy}>
            {result ? (
              <>
                <div className="result-heading">
                  <Ticket className="accent-icon" size={22} />
                  <h2>{result.cinema.name}</h2>
                </div>
                <p className="result-meta">
                  <Users size={16} />
                  Group of {result.groupSize}
                </p>
                {result.possible ? (
                  <>
                    <div className="booking-total">
                      <strong>{result.totalBundles}</strong>
                      <span>{result.totalBundles === 1 ? 'bundle needed' : 'bundles needed'}</span>
                      <Check size={22} />
                    </div>
                    <ul className="bundle-rows">
                      {result.bundles.map(({ size, quantity }) => (
                        <li key={size}>
                          <span>{size}-seat bundle</span>
                          <strong>× {quantity}</strong>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <div className="no-match">
                    <h3>No exact match</h3>
                    <p>
                      These bundle sizes can’t seat exactly {result.groupSize} people. Try another cinema or
                      group size.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="result-placeholder">
                <Ticket size={32} />
                <h2>Your seat bundles</h2>
                <p>Enter your party details to calculate the best combination.</p>
              </div>
            )}
          </div>
        </div>
      )}
      {adding && (
        <CinemaForm
          onClose={() => setAdding(false)}
          onSave={(item) => {
            resetResult()
            setCinemas((list) => [...list, item])
            setCinemaId(item.id)
            setMessage(`${item.name} added.`)
            setAdding(false)
          }}
        />
      )}
    </section>
  )
}

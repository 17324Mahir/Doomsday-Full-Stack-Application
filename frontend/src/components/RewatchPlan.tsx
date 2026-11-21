import { useEffect, useState, type FormEvent } from 'react'
import { Check, Clock3, ListOrdered } from 'lucide-react'
import { duration, errorMessage, moviesApi, type Film, type Plan } from '../api'
import Poster from './Poster'

interface Props {
  movies: Film[]
  onWatch: (movie: Film) => void
  pending: number[]
}

export default function RewatchPlan({ movies, onWatch, pending }: Props) {
  const defaultMovie = movies.find((movie) => movie.title.toLowerCase() === 'avengers: doomsday') ?? movies[0]
  const [selected, setSelected] = useState(defaultMovie?.id ?? 0)
  const [request, setRequest] = useState<{ id: number } | null>(null)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const target = movies.find((movie) => movie.id === selected)

  useEffect(() => {
    if (!request) return
    const controller = new AbortController()
    setLoading(true)
    setError('')
    moviesApi
      .plan(request.id, controller.signal)
      .then(setPlan)
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setError(errorMessage(cause, 'Unable to load the rewatch plan. Try again.'))
          setPlan(null)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [request, movies])

  function generate(event: FormEvent) {
    event.preventDefault()
    if (target) setRequest({ id: target.id })
  }

  return (
    <section className="container workspace">
      <header className="page-heading">
        <h1>Rewatch plan</h1>
        <p>Pick the film you’re building up to and see what to watch first.</p>
      </header>
      {movies.length === 0 ? (
        <div className="empty-state">
          <ListOrdered />
          <h2>No movies to plan yet</h2>
          <a className="secondary" href="#movies">
            Open movie library
          </a>
        </div>
      ) : (
        <div className="planner-layout">
          <form className="panel stack planner-form" onSubmit={generate}>
            <h2>Target movie</h2>
            <label className="sr-only" htmlFor="target-movie">
              Select target movie
            </label>
            <select
              id="target-movie"
              value={selected}
              onChange={(e) => {
                setSelected(Number(e.target.value))
                setPlan(null)
                setRequest(null)
                setLoading(false)
                setError('')
              }}
            >
              {movies.map((movie) => (
                <option key={movie.id} value={movie.id}>
                  {movie.title}
                </option>
              ))}
            </select>
            {target && (
              <div className="target-preview">
                <div className="small-poster">
                  <Poster movie={target} />
                </div>
                <div>
                  <h3>{target.title}</h3>
                  <p>
                    {target.releaseYear} · {duration(target.runtime)}
                  </p>
                </div>
              </div>
            )}
            <button className="primary" disabled={loading}>
              {loading ? 'Generating…' : 'Generate rewatch plan'}
            </button>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </form>
          <div className="panel results" aria-live="polite" aria-busy={loading}>
            {plan ? (
              <>
                <div className="result-heading">
                  <ListOrdered className="accent-icon" size={22} />
                  <h2>Watch order</h2>
                </div>
                <div className="plan-stats">
                  <div>
                    <strong>{plan.totalMovies}</strong>
                    <span>Prerequisites</span>
                  </div>
                  <div>
                    <strong>{plan.unwatchedCount}</strong>
                    <span>Unwatched</span>
                  </div>
                  <div>
                    <strong>{duration(plan.unwatchedRuntime)}</strong>
                    <span>Time remaining</span>
                  </div>
                </div>
                {plan.totalMovies > 0 ? (
                  <>
                    <div className="progress-caption">
                      <span>Watch progress</span>
                      <span>
                        {plan.watchedCount} of {plan.totalMovies}
                      </span>
                    </div>
                    <progress
                      max={plan.totalMovies}
                      value={plan.watchedCount}
                      aria-label="Watched prerequisites"
                    />
                    <ol className="watch-order">
                      {plan.movies.map((film, index) => (
                        <li key={film.id}>
                          <span className="order-index">{String(index + 1).padStart(2, '0')}</span>
                          <div className="list-title">
                            <h3>{film.title}</h3>
                            <p>
                              <Clock3 size={12} />
                              {film.releaseYear} · {duration(film.runtime)}
                            </p>
                          </div>
                          <button
                            className={'status-button' + (film.watched ? ' complete' : '')}
                            aria-label={`Mark ${film.title} as ${film.watched ? 'unwatched' : 'watched'}`}
                            aria-pressed={film.watched}
                            disabled={loading || pending.includes(film.id)}
                            onClick={() => onWatch(film)}
                          >
                            {film.watched && <Check size={13} />}
                            {film.watched ? 'Watched' : 'Mark watched'}
                          </button>
                        </li>
                      ))}
                    </ol>
                  </>
                ) : (
                  <p className="muted">You can start with {plan.target.title}. It has no prerequisites.</p>
                )}
              </>
            ) : (
              <div className="result-placeholder">
                <ListOrdered size={32} />
                <h2>{loading ? 'Finding your watch order…' : 'Your watch order'}</h2>
                <p>
                  {loading
                    ? 'Checking prerequisites.'
                    : 'Generate a plan to see the films leading up to your selection.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

import { useEffect, useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import { errorMessage, moviesApi, type Film, type Movie } from './api'
import Booking from './components/Booking'
import Library from './components/Library'
import MovieForm from './components/MovieForm'
import RewatchPlan from './components/RewatchPlan'

const pages = [
  { id: 'movies', label: 'Movie library' },
  { id: 'rewatch', label: 'Rewatch plan' },
  { id: 'booking', label: 'Booking' },
] as const

function activePage() {
  const id = window.location.hash.slice(1)
  return pages.find((page) => page.id === id) ?? pages[0]
}

export default function App() {
  const [page, setPage] = useState(activePage)
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [editing, setEditing] = useState<Movie | null | undefined>(undefined)
  const [pending, setPending] = useState<number[]>([])
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null)

  useEffect(() => {
    function navigate() {
      setPage(activePage())
      setEditing(undefined)
      setNotice(null)
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', navigate)
    return () => window.removeEventListener('hashchange', navigate)
  }, [])

  useEffect(() => {
    document.title = `${page.label} · Doomsday Ready`
  }, [page])

  useEffect(() => {
    const controller = new AbortController()
    setLoadError('')
    setLoading(true)
    moviesApi
      .list(controller.signal)
      .then(setMovies)
      .catch((cause) => {
        if (!controller.signal.aborted)
          setLoadError(errorMessage(cause, 'Unable to load your movie library. Try again.'))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [refresh])

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(null), notice.error ? 9000 : 4500)
    return () => window.clearTimeout(timeout)
  }, [notice])

  function saveMovie(saved: Movie) {
    setMovies((list) =>
      list.some((movie) => movie.id === saved.id)
        ? list.map((movie) => (movie.id === saved.id ? saved : movie))
        : [...list, saved],
    )
  }

  async function toggleWatched(movie: Film) {
    if (pending.includes(movie.id)) return
    setPending((ids) => [...ids, movie.id])
    try {
      const updated = await moviesApi.update(movie.id, { watched: !movie.watched })
      saveMovie(updated)
      setNotice({ text: `${movie.title} marked as ${updated.watched ? 'watched' : 'unwatched'}.` })
    } catch (cause) {
      setNotice({ text: errorMessage(cause, 'Unable to change watch status. Try again.'), error: true })
    } finally {
      setPending((ids) => ids.filter((id) => id !== movie.id))
    }
  }

  const retry = () => setRefresh((value) => value + 1)
  const watched = movies.filter((movie) => movie.watched).length

  return (
    <>
      <a
        className="skip-link"
        href="#content"
        onClick={(event) => {
          event.preventDefault()
          document.getElementById('content')?.focus()
        }}
      >
        Skip to content
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <a className="brand" href="#movies" aria-label="Doomsday Ready home">
            <img src="/brand/mark.png" alt="" width="43" height="43" />
            <span>
              Doomsday <em>Ready</em>
            </span>
          </a>
          <nav className="nav-links" aria-label="Main navigation">
            {pages.map(({ id, label }) => (
              <a key={id} href={`#${id}`} aria-current={page.id === id ? 'page' : undefined}>
                {label}
              </a>
            ))}
          </nav>
          <div className="header-progress" title="Watched movies in your library">
            <span>{loading || loadError ? '—' : `${watched} of ${movies.length}`} watched</span>
            <progress aria-label="Library watch progress" value={watched} max={movies.length || 1} />
          </div>
        </div>
      </header>
      <main id="content" tabIndex={-1}>
        {page.id === 'movies' && (
          <Library
            movies={movies}
            loading={loading}
            error={loadError}
            onRetry={retry}
            onEdit={setEditing}
            onWatch={toggleWatched}
            pending={pending}
          />
        )}
        {page.id === 'rewatch' &&
          (loading ? (
            <p className="container empty-state" role="status">
              Loading movie library…
            </p>
          ) : loadError ? (
            <div className="container empty-state">
              <p className="error" role="alert">
                {loadError}
              </p>
              <button className="secondary" onClick={retry}>
                Try again
              </button>
            </div>
          ) : (
            <RewatchPlan movies={movies} onWatch={toggleWatched} pending={pending} />
          ))}
        {page.id === 'booking' && <Booking />}
      </main>
      {editing !== undefined && (
        <MovieForm
          movie={editing}
          movies={movies}
          onClose={() => setEditing(undefined)}
          onSave={(saved) => {
            saveMovie(saved)
            setEditing(undefined)
            setNotice({ text: editing ? 'Movie details saved.' : `${saved.title} added to your library.` })
          }}
        />
      )}
      {notice && (
        <div
          role={notice.error ? 'alert' : 'status'}
          className={'toast' + (notice.error ? ' toast-error' : '')}
        >
          {!notice.error && <CheckCircle2 size={18} />}
          <span>{notice.text}</span>
          <button aria-label="Dismiss message" onClick={() => setNotice(null)}>
            <X size={16} />
          </button>
        </div>
      )}
    </>
  )
}

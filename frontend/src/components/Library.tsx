import { useState } from 'react'
import { ArrowUpDown, Check, Eye, LibraryBig, ListVideo, Plus, Search, X } from 'lucide-react'
import { duration, type Movie } from '../api'
import Poster from './Poster'

interface Props {
  movies: Movie[]
  loading: boolean
  error: string
  onRetry: () => void
  onEdit: (movie: Movie | null) => void
  onWatch: (movie: Movie) => void
  pending: number[]
}

type Filter = 'All movies' | 'Unwatched' | 'Watched'

export default function Library({ movies, loading, error, onRetry, onEdit, onWatch, pending }: Props) {
  const [filter, setFilter] = useState<Filter>('All movies')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('oldest')
  const query = search.trim().toLowerCase()
  const visible = movies
    .filter(
      (movie) =>
        (filter === 'All movies' || (filter === 'Watched') === movie.watched) &&
        movie.title.toLowerCase().includes(query),
    )
    .sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title)
      const order = a.releaseYear - b.releaseYear || a.id - b.id
      return sort === 'oldest' ? order : -order
    })

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="container hero-inner">
          <div className="hero-copy">
            <p className="eyebrow">Marvel Cinematic Universe</p>
            <h1 id="hero-title">
              The road to <em>Doomsday.</em>
            </h1>
            <a className="primary hero-action" href="#rewatch">
              <ListVideo size={18} aria-hidden="true" />
              Build rewatch plan
            </a>
          </div>
          <figure className="film-still">
            <div className="film-frame">
              <img
                src="/images/feature-still.jpg"
                width="1200"
                height="560"
                fetchPriority="high"
                alt="Black Panther, Captain America and Black Widow stand with Wakanda’s defenders."
              />
            </div>
            <figcaption>
              Avengers: Infinity War <span>·</span> 2018
            </figcaption>
          </figure>
        </div>
      </section>
      <section className="container library" aria-labelledby="library-title">
        <div className="library-heading">
          <div className="title-count">
            <h2 id="library-title">Movie library</h2>
            {!loading && !error && (
              <span>
                {movies.length} {movies.length === 1 ? 'film' : 'films'}
              </span>
            )}
          </div>
          <button
            className="secondary"
            type="button"
            disabled={loading || Boolean(error)}
            onClick={() => onEdit(null)}
          >
            <Plus size={16} />
            Add movie
          </button>
        </div>
        <div className="library-tools">
          <div className="segmented" role="group" aria-label="Watch status">
            {(['All movies', 'Unwatched', 'Watched'] as const).map((item) => (
              <button key={item} onClick={() => setFilter(item)} aria-pressed={filter === item}>
                {item}
              </button>
            ))}
          </div>
          <div className="search-sort">
            <label className="search-box">
              <Search size={15} />
              <input
                type="search"
                aria-label="Search movies"
                placeholder="Search movies"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label className="sort-box">
              <ArrowUpDown size={15} />
              <select aria-label="Sort movies" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="oldest">Release order</option>
                <option value="newest">Newest first</option>
                <option value="title">Title A–Z</option>
              </select>
            </label>
          </div>
        </div>
        {loading ? (
          <p className="empty-state" role="status">
            Loading movie library…
          </p>
        ) : error ? (
          <div className="empty-state">
            <p className="error" role="alert">
              {error}
            </p>
            <button className="secondary" onClick={onRetry}>
              Try again
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="empty-state">
            <LibraryBig size={29} />
            <h3>{movies.length ? 'No matching movies' : 'Your library is empty'}</h3>
            {movies.length ? (
              <button
                className="secondary"
                onClick={() => {
                  setFilter('All movies')
                  setSearch('')
                }}
              >
                <X size={15} />
                Clear filters
              </button>
            ) : (
              <button className="primary" onClick={() => onEdit(null)}>
                <Plus size={16} />
                Add your first movie
              </button>
            )}
          </div>
        ) : (
          <div className="movie-grid">
            {visible.map((movie, index) => (
              <article className="movie-card" key={movie.id}>
                <div className="poster-wrap">
                  <button
                    className="poster-open"
                    aria-label={`Edit ${movie.title}`}
                    onClick={() => onEdit(movie)}
                  >
                    <Poster movie={movie} eager={index < 4} />
                  </button>
                </div>
                <div className="movie-caption">
                  <h3>
                    <button onClick={() => onEdit(movie)}>{movie.title}</button>
                  </h3>
                  <div className="movie-meta">
                    <span>{movie.releaseYear}</span>
                    <span aria-hidden="true">·</span>
                    <span>{duration(movie.runtime)}</span>
                  </div>
                  <button
                    className="watch-toggle"
                    aria-pressed={movie.watched}
                    aria-label={`Mark ${movie.title} as ${movie.watched ? 'unwatched' : 'watched'}`}
                    disabled={pending.includes(movie.id)}
                    onClick={() => onWatch(movie)}
                  >
                    {movie.watched ? <Check size={15} /> : <Eye size={15} />}
                    {movie.watched ? 'Watched' : 'Mark watched'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  )
}

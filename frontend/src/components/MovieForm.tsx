import { useState, type FormEvent } from 'react'
import { errorMessage, moviesApi, type Movie, type MovieUpdate } from '../api'
import Dialog from './Dialog'

interface Props {
  movie: Movie | null
  movies: Movie[]
  onClose: () => void
  onSave: (movie: Movie) => void
}

export default function MovieForm({ movie, movies, onClose, onSave }: Props) {
  const [prerequisites, setPrerequisites] = useState(
    movie?.prerequisites.map(({ prerequisite }) => prerequisite.id) ?? [],
  )
  const [watched, setWatched] = useState(movie?.watched ?? false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const options = movies.filter((item) => item.id !== movie?.id)
  const changes: MovieUpdate = {}
  if (movie) {
    if (watched !== movie.watched) changes.watched = watched
    const selected = new Set(prerequisites)
    if (
      selected.size !== movie.prerequisites.length ||
      movie.prerequisites.some(({ prerequisite }) => !selected.has(prerequisite.id))
    ) {
      changes.prerequisites = prerequisites
    }
  }
  const canSave = !busy && (!movie || Object.keys(changes).length > 0)

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSave) return
    setError('')
    const form = new FormData(event.currentTarget)
    const title = String(form.get('title') ?? '').trim()
    if (!movie && !title) {
      setError('Enter a movie title.')
      return
    }
    setBusy(true)
    try {
      const saved = movie
        ? await moviesApi.update(movie.id, changes)
        : await moviesApi.create({
            title,
            releaseYear: Number(form.get('releaseYear')),
            runtime: Number(form.get('runtime')),
            prerequisites,
            watched,
          })
      onSave(saved)
    } catch (cause) {
      setError(errorMessage(cause, 'The movie could not be saved. Try again.'))
      setBusy(false)
    }
  }

  return (
    <Dialog title={movie?.title ?? 'Add movie'} onClose={onClose} busy={busy}>
      <form onSubmit={save} className="stack">
        {movie ? (
          <p className="muted">
            Released {movie.releaseYear} · {movie.runtime} {movie.runtime === 1 ? 'minute' : 'minutes'}
          </p>
        ) : (
          <>
            <label>
              Movie title
              <input autoFocus required maxLength={200} name="title" placeholder="Enter a title" />
            </label>
            <div className="field-pair">
              <label>
                Release year
                <input type="number" min="1888" max="2147483647" required name="releaseYear" />
              </label>
              <label>
                Runtime (minutes)
                <input type="number" min="1" max="300" required name="runtime" />
              </label>
            </div>
          </>
        )}
        <fieldset>
          <legend>Watch these movies first</legend>
          {options.length > 0 ? (
            <div className="checks">
              {options.map((item) => (
                <label className="check" key={item.id}>
                  <input
                    type="checkbox"
                    checked={prerequisites.includes(item.id)}
                    onChange={(e) =>
                      setPrerequisites(
                        e.target.checked
                          ? [...prerequisites, item.id]
                          : prerequisites.filter((id) => id !== item.id),
                      )
                    }
                  />
                  {item.title}
                </label>
              ))}
            </div>
          ) : (
            <p className="muted">Add other movies to choose prerequisites.</p>
          )}
        </fieldset>
        <label className="check">
          <input type="checkbox" checked={watched} onChange={(e) => setWatched(e.target.checked)} />
          Already watched
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button className="secondary" type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="primary" disabled={!canSave}>
            {busy ? 'Saving…' : movie ? 'Save changes' : 'Add movie'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}

import { useState } from 'react'
import { Film as FilmIcon } from 'lucide-react'
import type { Film } from '../api'

const posters = new Set([
  'iron-man',
  'captain-america-the-first-avenger',
  'the-avengers',
  'captain-america-civil-war',
  'thor-ragnarok',
  'avengers-infinity-war',
  'avengers-endgame',
  'avengers-doomsday',
])

export default function Poster({ movie, eager = false }: { movie: Film; eager?: boolean }) {
  const [failed, setFailed] = useState('')
  const slug = movie.title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/ +/g, '-')
  if (posters.has(slug) && failed !== slug) {
    return (
      <img
        className="poster"
        src={`/images/${slug}.jpg`}
        alt=""
        loading={eager ? 'eager' : 'lazy'}
        onError={() => setFailed(slug)}
      />
    )
  }
  return (
    <div className="poster-placeholder" aria-hidden="true">
      <FilmIcon />
      <span>{movie.title}</span>
    </div>
  )
}

import axios from 'axios'

export interface Film {
  id: number
  title: string
  releaseYear: number
  runtime: number
  watched: boolean
}

export interface Movie extends Film {
  prerequisites: { prerequisite: Film }[]
}

export interface MovieInput {
  title: string
  releaseYear: number
  runtime: number
  watched: boolean
  prerequisites: number[]
}

export type MovieUpdate = Partial<Pick<MovieInput, 'prerequisites' | 'watched'>>

export interface Plan {
  target: { id: number; title: string }
  movies: Film[]
  totalMovies: number
  watchedCount: number
  unwatchedCount: number
  unwatchedRuntime: number
}

export interface Cinema {
  id: number
  name: string
  bundles: { size: number }[]
}

export interface BookingResult {
  cinema: { id: number; name: string }
  possible: boolean
  groupSize: number
  totalBundles: number | null
  bundles: { size: number; quantity: number }[]
  message: string
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
})

export const moviesApi = {
  list: async (signal: AbortSignal) => (await api.get<Movie[]>('/movies', { signal })).data,
  create: async (data: MovieInput) => (await api.post<Movie>('/movies', data)).data,
  update: async (id: number, data: MovieUpdate) => (await api.patch<Movie>(`/movies/${id}`, data)).data,
  plan: async (id: number, signal: AbortSignal) =>
    (await api.get<Plan>(`/movies/${id}/rewatch-order`, { signal })).data,
}

export const cinemasApi = {
  list: async (signal: AbortSignal) => (await api.get<Cinema[]>('/cinemas', { signal })).data,
  create: async (name: string, bundleSizes: number[]) =>
    (await api.post<Cinema>('/cinemas', { name, bundleSizes })).data,
  booking: async (id: number, groupSize: number, signal: AbortSignal) =>
    (await api.get<BookingResult>(`/cinemas/${id}/booking`, { params: { groupSize }, signal })).data,
}

export function errorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message
    if (typeof message === 'string') return message
    if (Array.isArray(message)) return message.join('. ')
  }
  return fallback
}

export function duration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (!hours) return `${minutes}m`
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`
}

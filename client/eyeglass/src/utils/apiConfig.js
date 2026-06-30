/**
 * Resolves the correct API base URL for all environments.
 *
 * Priority order:
 * 1. VITE_API_BASE_URL env var (set this in Vercel dashboard to your Render URL)
 * 2. If running on Vercel production hostname → derive from VITE_RENDER_URL
 * 3. Development fallback → /api  (Vite proxy handles forwarding to localhost:5000)
 */

const envApiUrl = import.meta.env.VITE_API_BASE_URL
const renderUrl  = import.meta.env.VITE_RENDER_URL   // e.g. https://zvisionary-api.onrender.com

const resolveApiBase = () => {
  // Explicit override always wins
  if (envApiUrl && envApiUrl !== '/api') {
    return envApiUrl.replace(/\/$/, '')
  }

  // In production (not localhost) try to use the Render URL
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168')
    if (!isLocal && renderUrl) {
      return `${renderUrl.replace(/\/$/, '')}/api`
    }
  }

  // Dev fallback — Vite proxy forwards /api → localhost:5000
  return '/api'
}

export const API_BASE_URL = resolveApiBase()

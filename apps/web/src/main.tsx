import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { warmUpServer } from '@/lib/server-warmup'
import App from './App.tsx'
import './styles/globals.css'

// Start waking the API (Render free-tier cold start) the moment the bundle
// loads, so it overlaps with the user reading the landing page / signing in.
warmUpServer()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

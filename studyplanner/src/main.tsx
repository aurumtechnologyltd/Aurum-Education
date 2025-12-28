import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// SECURITY: Immediately clean OAuth tokens from URL hash before React renders
// This prevents tokens from being visible in the browser URL bar
if (window.location.hash && window.location.hash.includes('access_token')) {
  // Extract the hash for Supabase to process
  const hashParams = window.location.hash.substring(1)
  
  // Store temporarily for Supabase to pick up (it reads from URL on init)
  // But immediately clean the visible URL
  const cleanPath = window.location.pathname + window.location.search
  
  // Use replaceState to clean URL without adding to history
  window.history.replaceState(
    { __supabase_auth_hash: hashParams },
    '',
    cleanPath
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

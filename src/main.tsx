import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initSupabase } from './lib/supabase-init.ts'
import { initObservability } from './lib/observability.ts'
import { createLogger } from './lib/log.ts'
import { registerServiceWorker } from './lib/serviceWorkerRegistration.ts'

const log = createLogger('boot')

initObservability()
registerServiceWorker()

const container = document.getElementById('root')

if (!container) {
  throw new Error('Container element not found!')
}

const root = createRoot(container)
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

void initSupabase().then((connected) => {
  if (connected) {
    log.debug('supabase ready')
  } else {
    log.warn('supabase inicializado com avisos')
  }
})

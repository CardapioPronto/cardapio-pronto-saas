import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initSupabase } from './lib/supabase-init.ts'
import { initObservability } from './lib/observability.ts'
import { initSentry } from './lib/sentry.ts'
import { createLogger } from './lib/log.ts'
import { supabaseConfigError } from './integrations/supabase/client.ts'

const log = createLogger('boot')

initSentry()
initObservability()

const container = document.getElementById('root')

if (!container) {
  throw new Error('Container element not found!')
}

function renderConfigErrorScreen(error: Error) {
  if (!container) return
  container.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#FAF8F2;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#3D405B;">
      <div style="max-width:520px;text-align:left;background:#fff;border:1px solid rgba(61,64,91,0.12);border-radius:12px;padding:28px;box-shadow:0 12px 30px rgba(61,64,91,0.08);">
        <p style="margin:0 0 4px;text-transform:uppercase;font-size:11px;letter-spacing:0.18em;opacity:0.65;">Pubfy</p>
        <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;">Configuração ausente</h1>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">
          ${error.message.replace(/</g, '&lt;')}
        </p>
        <ol style="margin:0 0 16px 20px;padding:0;font-size:14px;line-height:1.6;">
          <li>Lovable &rarr; Project Settings &rarr; Environment.</li>
          <li>Adicione <code style="background:#F2CC8F33;padding:2px 6px;border-radius:4px;">VITE_SUPABASE_URL</code> e <code style="background:#F2CC8F33;padding:2px 6px;border-radius:4px;">VITE_SUPABASE_PUBLISHABLE_KEY</code>.</li>
          <li>Refaça o deploy.</li>
        </ol>
        <p style="margin:0;font-size:13px;opacity:0.7;">
          Os valores estão em Supabase Dashboard &rarr; Project Settings &rarr; API.
        </p>
      </div>
    </div>
  `
}

if (supabaseConfigError) {
  log.error('supabase env vars ausentes', supabaseConfigError)
  renderConfigErrorScreen(supabaseConfigError)
} else {
  initSupabase().then((connected) => {
    if (connected) {
      log.debug('supabase ready')
    } else {
      log.warn('supabase inicializado com avisos')
    }

    const root = createRoot(container)
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
  })
}

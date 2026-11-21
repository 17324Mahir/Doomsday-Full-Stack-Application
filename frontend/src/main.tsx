import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter/standard.css'
import '@fontsource-variable/inter/standard-italic.css'
import App from './App'
import './App.css'
import './workspace.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

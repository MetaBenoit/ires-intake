import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrandProvider } from '@metabenoit/brand-kit'
import '@metabenoit/brand-kit/styles/reset.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrandProvider brand="ires">
      <App />
    </BrandProvider>
  </StrictMode>,
)

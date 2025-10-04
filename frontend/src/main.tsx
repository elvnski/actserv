import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import axios from 'axios';
import { AUTH_HEADER_VALUE } from './config/api.ts';

// --- GLOBAL AXIOS CONFIGURATION ---

axios.defaults.headers.common['Authorization'] = AUTH_HEADER_VALUE;
// -----------------------------------



createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

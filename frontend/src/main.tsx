import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AdminAuthProvider } from './components/admin/context/AdminAuthContext.tsx';



createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AdminAuthProvider>
            <App />
        </AdminAuthProvider>
    </StrictMode>,
)

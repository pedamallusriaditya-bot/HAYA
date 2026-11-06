import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from '@/auth/AuthContext';
import { RouterProvider } from '@/router';
import { clearMatchActiveState } from '@/auth/authUtils';
import './index.css';

// Clear any leftover in-match state on app startup
clearMatchActiveState();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </RouterProvider>
  </StrictMode>
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/theme-variables.css';
import './styles/density-normal.css';
import './styles/admin-sections.css';
import './index.css';
import '@/lib/preferences-store'; // Initialize preferences (applies theme + density)
import App from './App.tsx';
import '@/config/devextreme'; // Initialize DevExtreme configuration

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

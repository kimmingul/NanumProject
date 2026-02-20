import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'devextreme/dist/css/dx.fluent.blue.light.compact.css';
import './styles/theme-variables.css';
import './styles/density-normal.css';
import './index.css';
import '@/lib/theme-store'; // Initialize theme (applies data-theme + DX dark link)
import App from './App.tsx';
import '@/config/devextreme'; // Initialize DevExtreme configuration

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

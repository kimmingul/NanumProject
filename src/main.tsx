import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'devextreme/dist/css/dx.fluent.blue.light.css';
import './index.css';
import App from './App.tsx';
import '@/config/devextreme'; // Initialize DevExtreme configuration

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

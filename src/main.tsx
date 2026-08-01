import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register PWA Service Worker
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('PWA ServiceWorker registration successful with scope: ', registration.scope);
      },
      (err) => {
        console.log('PWA ServiceWorker registration failed: ', err);
      }
    );
  });
} else if ('serviceWorker' in navigator) {
  // Always register in dev mode too for testing offline and notifications
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.log('ServiceWorker registration error in dev mode:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);


import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import ErrorBoundary from './components/ui/ErrorBoundary'
import './index.css'

// Register service worker for aggressive caching (production only)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => console.log('Service Worker registered'))
      .catch(error => console.log('Service Worker registration failed'));
  });
}

// Hide initial loader once React starts
const hideInitialLoader = () => {
  const loader = document.getElementById('initial-loader');
  if (loader) {
    loader.classList.add('fade-out');
    setTimeout(() => {
      loader.style.display = 'none';
    }, 300);
  }
};

// Check if user is already authenticated (has token)
const isAuthenticated = !!localStorage.getItem('access_token');

// If authenticated, hide loader immediately (don't show on page refresh)
if (isAuthenticated) {
  const loader = document.getElementById('initial-loader');
  if (loader) {
    loader.style.display = 'none';
  }
}

// StrictMode removed to prevent duplicate API calls in development
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <ErrorBoundary>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ErrorBoundary>,
);

// Hide loader after React renders (only if not already hidden)
if (!isAuthenticated) {
  hideInitialLoader();
}
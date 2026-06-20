'use client';

import { useEffect } from 'react';

export default function PWARegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator && window.workbox !== undefined) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => console.log('Service Worker running safely on scope:', reg.scope))
          .catch((err) => console.error('Service Worker registration failed:', err));
      });
    } else if ('serviceWorker' in navigator) {
      // Fallback for standard native execution
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js');
      });
    }
  }, []);

  return null;
}

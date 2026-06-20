'use client';

import { useEffect } from 'react';

export default function PWARegistration() {
  useEffect(() => {
    // Check if the user's browser natively supports Service Workers
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => {
            console.log('PWA Service Worker running safely on scope:', reg.scope);
          })
          .catch((err) => {
            console.error('PWA Service Worker registration failed:', err);
          });
      });
    }
  }, []);

  return null;
}

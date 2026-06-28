'use client';

import { useEffect, useState } from 'react';

export default function LocalTime({ utcString }: { utcString: string }) {
  const [formatted, setFormatted] = useState('');

  useEffect(() => {
    // This code ONLY runs in the user's browser (Client-side)
    // It automatically detects their local timezone (e.g., PKT) and converts it
    const date = new Date(utcString);
    setFormatted(date.toLocaleString('en-PK', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }));
  }, [utcString]);

  // Fallback placeholder while the server builds the page
  return <span>{formatted || 'Loading time...'}</span>;
}

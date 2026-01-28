'use client';

import { useEffect, useState } from 'react';
import { Notification, Portal } from '@mantine/core';
import { WifiOff } from 'lucide-react';

export function OfflineDetector() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    // Check initial state
    setIsOffline(!navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <Portal>
      <div
        style={{
          position: 'fixed',
          bottom: 'calc(16px + env(safe-area-inset-bottom))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          width: '90%',
          maxWidth: 400,
        }}
      >
        <Notification
          icon={<WifiOff size={18} />}
          color="orange"
          title="You're offline"
          withCloseButton={false}
        >
          Some features may be unavailable until you reconnect.
        </Notification>
      </div>
    </Portal>
  );
}

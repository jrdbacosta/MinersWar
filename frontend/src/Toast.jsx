import React, { useEffect } from 'react';

export default function Toast({ message, onClose }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div style={{
      position: 'fixed',
      right: 20,
      bottom: 20,
      background: 'rgba(0,0,0,0.85)',
      color: 'white',
      padding: '12px 16px',
      borderRadius: 8,
      zIndex: 1000
    }}>
      {message}
    </div>
  );
}

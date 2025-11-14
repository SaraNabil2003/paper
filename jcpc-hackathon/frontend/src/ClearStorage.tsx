import React from 'react';

export const ClearStorage: React.FC = () => {
  const clearAndReload = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 9999
    }}>
      <button
        onClick={clearAndReload}
        style={{
          padding: '10px 15px',
          background: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.9rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}
      >
        Clear Login & Reload
      </button>
    </div>
  );
};

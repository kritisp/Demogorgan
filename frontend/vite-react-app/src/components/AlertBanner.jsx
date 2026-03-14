import React from 'react';

const AlertBanner = ({ type, message }) => {
  if (!message) return null;

  const getStyle = () => {
    switch (type) {
      case 'danger':
        return { backgroundColor: '#ef4444', color: '#fff' };
      case 'warning':
        return { backgroundColor: '#eab308', color: '#000' };
      case 'success':
         return { backgroundColor: '#22c55e', color: '#000' };
      default:
        return { backgroundColor: '#3b82f6', color: '#fff' };
    }
  };

  return (
    <div style={{
      ...getStyle(),
      padding: '0.8rem 0.4rem',
      borderRadius: '8px',
      textAlign: 'center',
      fontWeight: 'bold',
      marginBottom: '1rem',
      animation: type === 'danger' ? 'pulse-red 0.5s infinite alternate' : 'none',
      fontFamily: 'Orbitron, sans-serif',
      letterSpacing: '1px',
       fontSize: 'clamp(0.7rem, 4vw, 1rem)',
      wordBreak: 'break-word',
      minHeight: '3.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
      width: '100%',
      maxWidth: '100%',
      overflow: 'hidden'
    }}>
      {message}
    </div>
  );
};

export default AlertBanner;

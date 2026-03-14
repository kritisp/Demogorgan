import React, { useEffect } from 'react';

const ResultScreen = ({ appState }) => {
  const isDemoWin = appState.winner === 'DEMOGORGON';
  
  useEffect(() => {
    // Optionally return to lobby after 10 seconds?
    // Left simple for user to refresh for a new game in demo
  }, []);

  return (
    <div className="panel" style={{ textAlign: 'center' }}>
      <h1 style={{ 
        color: isDemoWin ? 'var(--accent-red)' : 'var(--accent-green)',
        fontSize: '2.5rem',
        marginBottom: '1rem'
      }}>
        {isDemoWin ? "DEMOGORGON WINS" : "AGENTS WIN"}
      </h1>
      
      <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
        {appState.winReason}
      </p>

      <p style={{ color: 'var(--text-secondary)' }}>Refresh the page to play again.</p>
    </div>
  );
}

export default ResultScreen;

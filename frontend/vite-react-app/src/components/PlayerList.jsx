import React from 'react';

const PlayerList = ({ players, onVote, votingTarget, isVotingContext }) => {
  return (
    <div className="panel">
      <h3 style={{ marginBottom: '1rem', color: 'var(--accent-green)' }}>Player Roster</h3>
      
      {players.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>No other players connected.</p>
      ) : (
        <ul style={{ listStyle: 'none' }}>
          {players.map(p => (
            <li 
              key={p.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 0',
                borderBottom: '1px solid var(--border-color)'
              }}
            >
              <div style={{ 
                textDecoration: p.captured ? 'line-through' : 'none',
                opacity: p.captured ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {p.name} {p.isHost && <span style={{ fontSize: '0.8rem', color: 'var(--accent-blue)' }}>(HOST)</span>}
                {p.captured && <span style={{ fontSize: '0.8rem', color: 'var(--accent-red)' }}>(CAPTURED)</span>}
              </div>

              {isVotingContext && !p.captured && (
                <button 
                  onClick={() => onVote(p.id)}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.8rem',
                    backgroundColor: votingTarget === p.id ? 'var(--accent-green)' : 'var(--panel-bg)',
                    color: votingTarget === p.id ? '#000' : 'var(--text-primary)'
                  }}
                >
                  {votingTarget === p.id ? 'VOTED' : 'VOTE'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PlayerList;

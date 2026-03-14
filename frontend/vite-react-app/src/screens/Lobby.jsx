import React, { useState } from 'react';
import PlayerList from '../components/PlayerList';
import socketService from '../services/SocketService';

const Lobby = ({ appState }) => {
  const [name, setName] = useState('');
  const [beaconName, setBeaconName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [joined, setJoined] = useState(false);

  const handleJoin = () => {
    if (!name || !roomCode || !beaconName) return;
    socketService.connect();
    socketService.joinRoom(name, roomCode, beaconName);
    setJoined(true);
  };

  const handleStart = () => {
    socketService.startGame();
  };

  return (
    <div className="panel" style={{ textAlign: 'center' }}>
      <h1 style={{ color: 'var(--accent-red)', marginBottom: '1rem', fontSize: '2rem' }}>DEMOGORGON RADAR</h1>
      
      {!joined ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input 
            type="text" 
            placeholder="Agent Name (e.g. Alice)" 
            value={name} 
            onChange={e => setName(e.target.value)}
            maxLength={15}
          />
          <input 
            type="text" 
            placeholder="NRF Beacon Name (e.g. RADAR_1)" 
            value={beaconName} 
            onChange={e => setBeaconName(e.target.value.toUpperCase())}
            maxLength={15}
            style={{ textTransform: 'uppercase' }}
          />
          <input 
            type="text" 
            placeholder="Room Code" 
            value={roomCode} 
            onChange={e => setRoomCode(e.target.value.toUpperCase())}
            maxLength={6}
            style={{ textTransform: 'uppercase' }}
          />
          <button className="primary" onClick={handleJoin} disabled={!name || !roomCode || !beaconName}>
            JOIN LOBBY
          </button>
        </div>
      ) : (
        <div>
          <h2 style={{ color: 'var(--accent-green)', marginBottom: '1rem' }}>ROOM: {appState.roomCode}</h2>
          
          <PlayerList players={appState.players} />
          
          {appState.isHost ? (
            <button 
              className="primary" 
              style={{ width: '100%', marginTop: '1rem', padding: '1rem', fontSize: '1.2rem'}}
              onClick={handleStart}
              disabled={appState.players.length < 2}
            >
              START GAME
            </button>
          ) : (
            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Waiting for host to start...</p>
          )}

          {appState.players.length < 2 && appState.isHost && (
             <p style={{ color: 'var(--accent-red)', fontSize: '0.8rem', marginTop: '0.5rem' }}>Minimum 2 players required</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Lobby;

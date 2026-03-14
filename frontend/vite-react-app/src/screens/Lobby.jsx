import React, { useState } from 'react';
import PlayerList from '../components/PlayerList';
import socketService from '../services/SocketService';
import lobbyBgImg from '../assets/lobby.jpg';
import radarImg from '../assets/DEMOGORGON  RADAR.png';

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
    <div className="lobby-layout">
      {/* Background and Atmospheric Layers */}
      <div
        className="lobby-background"
        style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.75), rgba(80,0,0,0.55)), url(${lobbyBgImg})` }}
      />
      <div className="atmosphere-overlay" />
      <div className="smoke-overlay" />

      {/* Main Terminal Panel */}
      <div className="hawkins-panel">
        <img src={radarImg} alt="Demogorgon Radar" className="hawkins-title-img" />

        {!joined ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <input
              type="text"
              className="hawkins-input"
              placeholder="Enter Your StrangeName"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={15}
            />
            <input
              type="text"
              className="hawkins-input"
              placeholder="NRF Beacon Name (e.g. RADAR_1)"
              value={beaconName}
              onChange={e => setBeaconName(e.target.value.toUpperCase())}
              maxLength={15}
              style={{ textTransform: 'uppercase' }}
            />
            <input
              type="text"
              className="hawkins-input"
              placeholder="Room Code"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
              style={{ textTransform: 'uppercase' }}
            />
            <button className="hawkins-btn" onClick={handleJoin} disabled={!name || !roomCode || !beaconName}>
              JOIN LOBBY
            </button>
          </div>
        ) : (
          <div>
            <h2 style={{ color: 'var(--accent-green)', marginBottom: '1rem', fontFamily: 'Arial, sans-serif', letterSpacing: '2px' }}>ROOM: {appState.roomCode}</h2>

            <PlayerList players={appState.players} />

            {appState.isHost ? (
              <button
                className="hawkins-btn"
                onClick={handleStart}
                disabled={appState.players.length < 2}
              >
                START GAME
              </button>
            ) : (
              <p style={{ marginTop: '1rem', color: '#94a3b8', fontFamily: 'Arial, sans-serif' }}>Waiting for host to start...</p>
            )}

            {appState.players.length < 2 && appState.isHost && (
              <p style={{ color: '#ff3333', fontSize: '0.8rem', marginTop: '0.5rem', fontFamily: 'Arial, sans-serif' }}>Minimum 2 players required</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Lobby;


import React, { useState, useEffect } from 'react';
import Lobby from './screens/Lobby';
import GameScreen from './screens/GameScreen';
import ResultScreen from './screens/ResultScreen';
import socketService from './services/SocketService';

function App() {
  const [appState, setAppState] = useState({
    view: 'LOBBY', // LOBBY, GAME, RESULT
    roomCode: '',
    isHost: false,
    players: [],
    role: null,
    captured: false,
    status: 'LOBBY', // LOBBY, PLAYING, VOTING, RESOLVED
    winner: null,
    winReason: ''
  });

  useEffect(() => {
    socketService.on('room_joined', ({ roomCode, isHost }) => {
      setAppState(prev => ({ ...prev, roomCode, isHost }));
    });

    socketService.on('room_state_update', ({ status, players }) => {
      setAppState(prev => {
         const safePlayers = players || [];
         let isCaptured = prev.captured;
         if (socketService.socket && socketService.socket.id) {
           const me = safePlayers.find(p => p.id === socketService.socket.id);
           if (me) isCaptured = !!me.captured;
         }
         return { ...prev, status, players: safePlayers, captured: isCaptured };
      });
    });

    socketService.on('host_assigned', () => {
      setAppState(prev => ({ ...prev, isHost: true }));
    });

    socketService.on('game_started', ({ role, demogorgonId, players }) => {
      setAppState(prev => ({
         ...prev,
         view: 'GAME',
         status: 'PLAYING',
         role,
         demogorgonId,
         players,
         captured: false
      }));
    });

    socketService.on('player_captured', ({ playerId }) => {
      // We rely on room_state_update for accurate state, this is just an event marker
    });

    socketService.on('vote_started', ({ reporter } = {}) => {
      setAppState(prev => ({ 
        ...prev, 
        status: 'VOTING',
        voteReason: reporter ? `${reporter} reported a body!` : 'Discovery reported!'
      }));
    });

    socketService.on('vote_update', ({ votes, totalVotes }) => {
      // Could display live vote counts here if desired
    });

    socketService.on('game_over', ({ winner, reason }) => {
      setAppState(prev => ({
         ...prev,
         view: 'RESULT',
         status: 'RESOLVED',
         winner,
         winReason: reason
      }));
    });

    return () => {
      socketService.off('room_joined');
      socketService.off('room_state_update');
      socketService.off('host_assigned');
      socketService.off('game_started');
      socketService.off('player_captured');
      socketService.off('vote_started');
      socketService.off('vote_update');
      socketService.off('game_over');
    };
  }, []);

  return (
    <div className="app-container">
      {appState.view === 'LOBBY' && <Lobby appState={appState} />}
      {appState.view === 'GAME' && <GameScreen appState={appState} />}
      {appState.view === 'RESULT' && <ResultScreen appState={appState} />}
    </div>
  );
}

export default App;

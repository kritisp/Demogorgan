import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    // Auto-detect local backend or configure a specific IP/domain
    // Use the current origin so Vite proxy handles the upgrade from HTTPS to HTTP
    this.socket = io(window.location.origin, {
      autoConnect: false,
      transports: ['websocket', 'polling']
    });
  }

  connect() {
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  disconnect() {
    if (this.socket.connected) {
      this.socket.disconnect();
    }
  }

  joinRoom(name, roomCode, beaconName) {
    this.socket.emit('join_room', { name, roomCode, beaconName });
  }

  startGame() {
    this.socket.emit('start_game');
  }

  capturePlayer() {
    this.socket.emit('capture_player');
  }

  initiateVote() {
    this.socket.emit('report_body');
  }

  submitVote(targetId) {
    this.socket.emit('submit_vote', { targetId });
  }

  devourPlayer(targetName) {
    this.socket.emit('devour_player', { targetName });
  }

  reportBody() {
    this.socket.emit('report_body');
  }

  resetRoom() {
    this.socket.emit('reset_room');
  }


  // Event Listeners
  on(eventName, callback) {
    this.socket.on(eventName, callback);
  }

  off(eventName, callback) {
    this.socket.off(eventName, callback);
  }
}

const socketService = new SocketService();
export default socketService;

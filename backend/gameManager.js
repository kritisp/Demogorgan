class GameManager {
  constructor(io) {
    this.io = io;
    this.players = {}; // socket.id -> { id, name, room, role: 'AGENT' | 'DEMOGORGON', captured: false, isHost: false }
    this.rooms = {}; // roomCode -> { status: 'LOBBY' | 'PLAYING' | 'VOTING' | 'RESOLVED', hostId, players: [socket.ids] }
  }

  handleConnection(socket) {
    socket.on('join_room', ({ name, roomCode, beaconName }) => {
      roomCode = roomCode.toUpperCase();
      socket.join(roomCode);
      
      let isHost = false;
      if (!this.rooms[roomCode]) {
        this.rooms[roomCode] = {
          status: 'LOBBY',
          hostId: socket.id,
          players: []
        };
        isHost = true;
      }

      this.players[socket.id] = {
        id: socket.id,
        name: name,
        beaconName: beaconName,
        room: roomCode,
        role: null, // assigned on start
        captured: false,
        isHost: isHost
      };

      this.rooms[roomCode].players.push(socket.id);

      // Notify player of their join
      socket.emit('room_joined', { 
        roomCode, 
        isHost, 
        playerId: socket.id 
      });

      // Broadcast updated player list
      this.broadcastRoomState(roomCode);
    });

    socket.on('start_game', () => {
      const player = this.players[socket.id];
      if (!player) return;
      const roomCode = player.room;
      const room = this.rooms[roomCode];
      
      if (room && room.hostId === socket.id && room.status === 'LOBBY') {
        this.startGame(roomCode);
      }
    });

    socket.on('capture_player', () => {
      const player = this.players[socket.id];
      if (!player || player.role !== 'AGENT' || player.captured) return;
      
      const roomCode = player.room;
      player.captured = true;
      
      // Notify everyone roughly who got captured
      this.io.to(roomCode).emit('player_captured', {
        playerId: socket.id,
        name: player.name
      });

      this.broadcastRoomState(roomCode);
      this.checkWinCondition(roomCode);
    });



    socket.on('submit_vote', ({ targetId }) => {
      const player = this.players[socket.id];
      if (!player) return;
      const roomCode = player.room;
      const room = this.rooms[roomCode];

      if (room.status !== 'VOTING') return;
      if (room.votedPlayers.includes(socket.id)) return;
      if (player.captured && player.role === 'AGENT') return;

      room.votedPlayers.push(socket.id);
      if (!room.votes[targetId]) room.votes[targetId] = 0;
      room.votes[targetId]++;

      this.io.to(roomCode).emit('vote_update', {
        votes: room.votes,
        totalVotes: room.votedPlayers.length
      });

      const activeAgents = room.players.filter(pid => {
        const p = this.players[pid];
        return p && !p.captured && p.role === 'AGENT';
      });

      // All active agents + Demogorgon can vote? 
      // Prompt says "Agents vote for suspected player". Usually Demogorgon votes too to blend in.
      const totalVoters = room.players.filter(pid => {
        const p = this.players[pid];
        return p && (!p.captured || p.role === 'DEMOGORGON');
      }).length;

      if (room.votedPlayers.length >= totalVoters) {
         this.resolveVote(roomCode);
      }
    });

    socket.on('devour_player', ({ targetName }) => {
      const player = this.players[socket.id];
      if (!player || player.role !== 'DEMOGORGON') return;

      const roomCode = player.room;
      const room = this.rooms[roomCode];
      if (!room || room.status !== 'PLAYING') return;

      const upperTargetName = targetName.toUpperCase();

      const targetId = room.players.find(pid => {
        const p = this.players[pid];
        return p && p.beaconName && p.beaconName.toUpperCase() === upperTargetName;
      });

      console.log(`[Devour] ${player.name} targeting beacon ${targetName} -> Match: ${targetId ? this.players[targetId].name : 'NOT FOUND'}`);

      const targetPlayer = this.players[targetId];

      if (targetPlayer && targetPlayer.role === 'AGENT') {
        targetPlayer.captured = true;
        
        // Notify everyone that someone was devoured (but they have to find the body)
        this.io.to(roomCode).emit('player_captured', {
          playerId: targetId,
          name: targetPlayer.name,
          message: "A scream echoes... Someone has been devoured!"
        });

        this.broadcastRoomState(roomCode);
        this.checkWinCondition(roomCode);
      }
    });

    socket.on('report_body', () => {
       const player = this.players[socket.id];
       if (!player || player.captured) return;

       const roomCode = player.room;
       const room = this.rooms[roomCode];

       if (room.status === 'PLAYING') {
         room.status = 'VOTING';
         room.votes = {};
         room.votedPlayers = [];
         
         this.io.to(roomCode).emit('vote_started', {
            reporter: player.name
         });
         this.broadcastRoomState(roomCode);
       }
    });
    socket.on('reset_room', () => {
       const player = this.players[socket.id];
       if (!player || !player.isHost) return;

       const roomCode = player.room;
       const room = this.rooms[roomCode];
       if (!room) return;

       room.status = 'LOBBY';
       room.votes = {};
       room.votedPlayers = [];
       
       room.players.forEach(pid => {
         const p = this.players[pid];
         if (p) {
           p.role = null;
           p.captured = false;
         }
       });

       this.broadcastRoomState(roomCode);
    });
  }

  handleDisconnect(socket) {
    const player = this.players[socket.id];
    if (player) {
      const roomCode = player.room;
      const room = this.rooms[roomCode];
      if (room) {
        room.players = room.players.filter(id => id !== socket.id);
        
        // If room empty, delete
        if (room.players.length === 0) {
          delete this.rooms[roomCode];
        } else {
          // Reassign host if needed
          if (room.hostId === socket.id) {
            room.hostId = room.players[0];
            const newHost = this.players[room.hostId];
            if (newHost) {
              newHost.isHost = true;
              this.io.to(room.hostId).emit('host_assigned');
            }
          }
          this.broadcastRoomState(roomCode);
          if (room.status === 'PLAYING') {
             this.checkWinCondition(roomCode);
          }
        }
      }
      delete this.players[socket.id];
    }
  }

  startGame(roomCode) {
    const room = this.rooms[roomCode];
    if (!room || room.players.length < 2) {
       return; 
    }

    room.status = 'PLAYING';
    
    // Assign roles
    const shuffledPlayers = [...room.players].sort(() => 0.5 - Math.random());
    const demogorgonId = shuffledPlayers[0];

    // Build public list first
    const publicPlayerList = this.getPublicPlayerList(roomCode);

    room.players.forEach(pid => {
      const p = this.players[pid];
      if (p) {
        p.role = (pid === demogorgonId) ? 'DEMOGORGON' : 'AGENT';
        p.captured = false;
        
        // Notify player of role
        this.io.to(pid).emit('game_started', {
          role: p.role,
          demogorgonId: demogorgonId,
          players: publicPlayerList
        });
      }
    });

    this.broadcastRoomState(roomCode);
  }

  checkWinCondition(roomCode) {
    const room = this.rooms[roomCode];
    if (!room || room.status !== 'PLAYING') return;

    let activeAgents = 0;
    let demogorgonCount = 0;
    
    room.players.forEach(pid => {
      const p = this.players[pid];
      if (p && p.role === 'AGENT' && !p.captured) {
        activeAgents++;
      } else if (p && p.role === 'DEMOGORGON') {
        demogorgonCount++;
      }
    });

    // If demogorgon disconnected
    if (demogorgonCount === 0) {
      room.status = 'RESOLVED';
      this.io.to(roomCode).emit('game_over', {
        winner: 'AGENTS',
        reason: 'Demogorgon disconnected'
      });
      this.broadcastRoomState(roomCode);
      return;
    }

    // If all agents are captured, Demogorgon wins
    if (activeAgents === 0) {
      room.status = 'RESOLVED';
      this.io.to(roomCode).emit('game_over', {
        winner: 'DEMOGORGON',
        reason: 'All Agents Captured'
      });
      this.broadcastRoomState(roomCode);
    }
  }

  resolveVote(roomCode) {
    const room = this.rooms[roomCode];
    if (!room) return;

    // Find who got the most votes
    let maxVotes = 0;
    let targetCandidate = null;
    let tie = false;

    for (const [targetId, count] of Object.entries(room.votes)) {
      if (count > maxVotes) {
        maxVotes = count;
        targetCandidate = targetId;
        tie = false;
      } else if (count === maxVotes) {
        tie = true;
      }
    }

    room.status = 'RESOLVED';

    if (!targetCandidate) {
      this.io.to(roomCode).emit('game_over', {
         winner: 'DEMOGORGON',
         reason: 'No consensus reached. The Demogorgon escaped!'
      });
    } else if (tie) {
      this.io.to(roomCode).emit('game_over', {
         winner: 'DEMOGORGON',
         reason: 'A tie in voting allows the Demogorgon to slip away!'
      });
    } else {
      const targetPlayer = this.players[targetCandidate];
      if (targetPlayer && targetPlayer.role === 'DEMOGORGON') {
        this.io.to(roomCode).emit('game_over', {
           winner: 'AGENTS',
           reason: `The Demogorgon (${targetPlayer.name}) was successfully identified and banished!`
        });
      } else {
        this.io.to(roomCode).emit('game_over', {
           winner: 'DEMOGORGON',
           reason: `An innocent Agent (${targetPlayer?.name}) was wrongly accused! The Demogorgon feasts.`
        });
      }
    }

    this.broadcastRoomState(roomCode);
  }

  getPublicPlayerList(roomCode) {
    const room = this.rooms[roomCode];
    if (!room) return [];
    
    return room.players.map(pid => {
      const p = this.players[pid];
      if (!p) return null;
      return {
        id: p.id,
        name: p.name,
        beaconName: p.beaconName,
        isHost: p.isHost,
        captured: p.captured,
        // Role is NOT public! Keep it secret.
      };
    }).filter(Boolean);
  }

  broadcastRoomState(roomCode) {
    const room = this.rooms[roomCode];
    if (room) {
      this.io.to(roomCode).emit('room_state_update', {
        status: room.status,
        players: this.getPublicPlayerList(roomCode)
      });
    }
  }
}

module.exports = GameManager;

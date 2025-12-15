import { roomManager } from './roomManager.js';
import { config } from './config.js';

export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Get list of available rooms
    socket.on('get_rooms', () => {
      const rooms = roomManager.getPublicRooms();
      socket.emit('rooms_list', rooms);
    });

    // Create a new room
    socket.on('create_room', async ({ name, password, roomName }) => {
      try {
        const { roomCode, odlayerId } = await roomManager.createRoom(name, password, roomName);

        socket.join(roomCode);
        roomManager.connectPlayer(roomCode, odlayerId, socket.id);

        socket.emit('room_created', {
          roomCode,
          odlayerId,
          isHost: true
        });

        console.log(`Room created: ${roomCode} by ${name}`);
      } catch (err) {
        socket.emit('error', { message: 'Failed to create room: ' + err.message });
      }
    });

    // Join an existing room
    socket.on('join_room', async ({ roomCode, name, password }) => {
      try {
        const result = await roomManager.joinRoom(roomCode, name, password);

        if (result.error) {
          socket.emit('join_error', {
            message: result.error,
            requiresPassword: result.requiresPassword
          });
          return;
        }

        const { odlayerId, participants } = result;
        
        socket.join(roomCode);
        roomManager.connectPlayer(roomCode, odlayerId, socket.id);

        const room = roomManager.getRoom(roomCode);

        socket.emit('joined', {
          roomCode,
          odlayerId,
          isHost: room.hostId === odlayerId,
          participants: roomManager.getParticipantsList(roomCode),
          chat: room.chat
        });

        // Notify others in room
        socket.to(roomCode).emit('participant_joined', {
          id: odlayerId,
          name,
          participants: roomManager.getParticipantsList(roomCode)
        });

        console.log(`${name} joined room ${roomCode}`);
      } catch (err) {
        socket.emit('join_error', { message: 'Failed to join room: ' + err.message });
      }
    });

    // Reconnect to a room
    socket.on('reconnect_room', ({ roomCode, odlayerId }) => {
      const canReconnect = roomManager.canReconnect(odlayerId);
      
      if (!canReconnect || canReconnect !== roomCode) {
        socket.emit('reconnect_error', { message: 'Cannot reconnect to this room' });
        return;
      }

      const connectResult = roomManager.connectPlayer(roomCode, odlayerId, socket.id);
      if (!connectResult) {
        socket.emit('reconnect_error', { message: 'Failed to reconnect' });
        return;
      }

      socket.join(roomCode);

      const room = roomManager.getRoom(roomCode);
      const { participant } = connectResult;

      socket.emit('reconnected', {
        roomCode,
        odlayerId,
        isHost: room.hostId === odlayerId,
        participants: roomManager.getParticipantsList(roomCode),
        chat: room.chat
      });

      socket.to(roomCode).emit('participant_reconnected', {
        id: odlayerId,
        name: participant.name
      });

      console.log(`${participant.name} reconnected to room ${roomCode}`);
    });

    // ==================== WebRTC Signaling ====================

    // Send offer to specific peer
    socket.on('webrtc_offer', ({ targetId, offer }) => {
      const info = roomManager.getParticipantBySocketId(socket.id);
      if (!info) return;

      const room = roomManager.getRoom(info.roomCode);
      const targetParticipant = room?.participants.get(targetId);
      
      if (targetParticipant?.socketId) {
        io.to(targetParticipant.socketId).emit('webrtc_offer', {
          fromId: info.odlayerId,
          fromName: info.participant.name,
          offer
        });
      }
    });

    // Send answer to specific peer
    socket.on('webrtc_answer', ({ targetId, answer }) => {
      const info = roomManager.getParticipantBySocketId(socket.id);
      if (!info) return;

      const room = roomManager.getRoom(info.roomCode);
      const targetParticipant = room?.participants.get(targetId);
      
      if (targetParticipant?.socketId) {
        io.to(targetParticipant.socketId).emit('webrtc_answer', {
          fromId: info.odlayerId,
          answer
        });
      }
    });

    // Send ICE candidate to specific peer
    socket.on('webrtc_ice_candidate', ({ targetId, candidate }) => {
      const info = roomManager.getParticipantBySocketId(socket.id);
      if (!info) return;

      const room = roomManager.getRoom(info.roomCode);
      const targetParticipant = room?.participants.get(targetId);
      
      if (targetParticipant?.socketId) {
        io.to(targetParticipant.socketId).emit('webrtc_ice_candidate', {
          fromId: info.odlayerId,
          candidate
        });
      }
    });

    // Request to connect with all peers (when joining)
    socket.on('webrtc_join', () => {
      const info = roomManager.getParticipantBySocketId(socket.id);
      if (!info) return;

      const others = roomManager.getOtherParticipants(info.roomCode, info.odlayerId);
      
      // Tell this user about existing participants
      socket.emit('webrtc_peers', {
        peers: others.map(p => ({ id: p.id, name: p.name }))
      });

      // Tell existing participants about new user
      others.forEach(p => {
        if (p.socketId) {
          io.to(p.socketId).emit('webrtc_new_peer', {
            id: info.odlayerId,
            name: info.participant.name
          });
        }
      });
    });

    // Media state change (mute/unmute, camera on/off)
    socket.on('media_state', ({ audio, video }) => {
      const info = roomManager.getParticipantBySocketId(socket.id);
      if (!info) return;

      socket.to(info.roomCode).emit('participant_media_state', {
        odlayerId: info.odlayerId,
        audio,
        video
      });
    });

    // ==================== Chat ====================

    socket.on('chat', ({ text }) => {
      const info = roomManager.getParticipantBySocketId(socket.id);
      if (!info) return;

      const message = roomManager.addChatMessage(info.roomCode, info.odlayerId, text);
      if (message) {
        io.to(info.roomCode).emit('chat_message', message);
      }
    });

    // ==================== Leave Room ====================

    socket.on('leave_room', () => {
      handleLeave(socket);
    });

    // ==================== Disconnect ====================

    socket.on('disconnect', () => {
      const result = roomManager.disconnectPlayer(socket.id);
      
      if (result) {
        const { roomCode, odlayerId, userName } = result;
        
        socket.to(roomCode).emit('participant_disconnected', {
          id: odlayerId,
          name: userName
        });

        console.log(`${userName} disconnected from room ${roomCode}`);

        // Schedule cleanup
        setTimeout(() => {
          if (roomManager.isRoomEmpty(roomCode)) {
            roomManager.deleteRoom(roomCode);
          }
        }, config.reconnectWindow + 5000);
      }
    });
  });

  function handleLeave(socket) {
    const info = roomManager.getParticipantBySocketId(socket.id);
    if (!info) return;

    const { roomCode, odlayerId } = info;
    const result = roomManager.leaveRoom(roomCode, odlayerId);
    
    if (result) {
      socket.leave(roomCode);
      
      socket.to(roomCode).emit('participant_left', {
        id: odlayerId,
        name: result.userName,
        newHostId: result.newHostId
      });

      if (roomManager.isRoomEmpty(roomCode)) {
        roomManager.deleteRoom(roomCode);
      }
    }
  }

  // Cleanup expired rooms periodically
  setInterval(() => {
    roomManager.cleanupExpiredRooms();
  }, 60 * 60 * 1000);
}

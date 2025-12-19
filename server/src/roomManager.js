import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config.js';

class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.playerRooms = new Map(); // odlayerId -> roomCode
    this.disconnectedPlayers = new Map();
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < config.roomCodeLength; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async createRoom(userName, password = null, roomName = null) {
    let roomCode;
    do {
      roomCode = this.generateRoomCode();
    } while (this.rooms.has(roomCode));

    const odlayerId = uuidv4();
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const room = {
      code: roomCode,
      name: roomName || `${userName}'s Room`,
      hasPassword: !!password,
      passwordHash: hashedPassword,
      createdAt: Date.now(),
      hostId: odlayerId,
      participants: new Map(), // odlayerId -> { id, name, socketId, connected }
      chat: []
    };

    room.participants.set(odlayerId, {
      id: odlayerId,
      name: userName,
      socketId: null,
      connected: false
    });

    this.rooms.set(roomCode, room);
    this.playerRooms.set(odlayerId, roomCode);

    return { roomCode, odlayerId };
  }

  async joinRoom(roomCode, userName, password = null) {
    const room = this.rooms.get(roomCode);
    
    if (!room) {
      return { error: 'Room not found' };
    }

    if (room.hasPassword) {
      if (!password) {
        return { error: 'Password required', requiresPassword: true };
      }
      const validPassword = await bcrypt.compare(password, room.passwordHash);
      if (!validPassword) {
        return { error: 'Invalid password' };
      }
    }

    if (room.participants.size >= config.maxParticipants) {
      return { error: 'Room is full' };
    }

    const odlayerId = uuidv4();
    room.participants.set(odlayerId, {
      id: odlayerId,
      name: userName,
      socketId: null,
      connected: false
    });

    this.playerRooms.set(odlayerId, roomCode);

    return {
      roomCode,
      odlayerId,
      participants: this.getParticipantsList(roomCode)
    };
  }

  connectPlayer(roomCode, odlayerId, socketId) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const participant = room.participants.get(odlayerId);
    if (!participant) return null;

    participant.socketId = socketId;
    participant.connected = true;
    this.disconnectedPlayers.delete(odlayerId);

    return { room, participant };
  }

  disconnectPlayer(socketId) {
    for (const [roomCode, room] of this.rooms) {
      for (const [odlayerId, participant] of room.participants) {
        if (participant.socketId === socketId) {
          participant.connected = false;
          participant.socketId = null;
          
          this.disconnectedPlayers.set(odlayerId, {
            roomCode,
            disconnectTime: Date.now()
          });
          
          return { roomCode, odlayerId, userName: participant.name };
        }
      }
    }
    return null;
  }

  leaveRoom(roomCode, odlayerId) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const participant = room.participants.get(odlayerId);
    if (!participant) return null;

    room.participants.delete(odlayerId);
    this.playerRooms.delete(odlayerId);
    this.disconnectedPlayers.delete(odlayerId);

    // If host leaves, assign new host
    if (room.hostId === odlayerId && room.participants.size > 0) {
      room.hostId = room.participants.keys().next().value;
    }

    return { userName: participant.name, newHostId: room.hostId };
  }

  canReconnect(odlayerId) {
    const disconnectInfo = this.disconnectedPlayers.get(odlayerId);
    if (!disconnectInfo) return null;

    const elapsed = Date.now() - disconnectInfo.disconnectTime;
    if (elapsed > config.reconnectWindow) {
      this.disconnectedPlayers.delete(odlayerId);
      return null;
    }

    return disconnectInfo.roomCode;
  }

  getRoom(roomCode) {
    return this.rooms.get(roomCode);
  }

  getParticipantsList(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return [];

    return Array.from(room.participants.values()).map(p => ({
      id: p.id,
      name: p.name,
      connected: p.connected,
      isHost: p.id === room.hostId
    }));
  }

  getOtherParticipants(roomCode, odlayerId) {
    const room = this.rooms.get(roomCode);
    if (!room) return [];

    return Array.from(room.participants.values())
      .filter(p => p.id !== odlayerId && p.connected)
      .map(p => ({
        id: p.id,
        name: p.name,
        socketId: p.socketId
      }));
  }

  getParticipantBySocketId(socketId) {
    for (const [roomCode, room] of this.rooms) {
      for (const [odlayerId, participant] of room.participants) {
        if (participant.socketId === socketId) {
          return { roomCode, odlayerId, participant };
        }
      }
    }
    return null;
  }

  isRoomEmpty(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return true;
    
    for (const participant of room.participants.values()) {
      if (participant.connected) return false;
    }
    return true;
  }

  deleteRoom(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    for (const odlayerId of room.participants.keys()) {
      this.playerRooms.delete(odlayerId);
      this.disconnectedPlayers.delete(odlayerId);
    }

    this.rooms.delete(roomCode);
    console.log(`Room ${roomCode} deleted`);
  }

  addChatMessage(roomCode, odlayerId, text) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const participant = room.participants.get(odlayerId);
    if (!participant) return null;

    const message = {
      id: uuidv4(),
      odlayerId,
      from: participant.name,
      text,
      timestamp: Date.now()
    };

    room.chat.push(message);
    if (room.chat.length > 100) {
      room.chat.shift();
    }

    return message;
  }

  getPublicRooms() {
    const rooms = [];
    
    for (const [roomCode, room] of this.rooms) {
      const connectedCount = Array.from(room.participants.values())
        .filter(p => p.connected).length;
      
      if (connectedCount > 0 && connectedCount < config.maxParticipants) {
        rooms.push({
          code: roomCode,
          name: room.name,
          hasPassword: room.hasPassword,
          participantCount: connectedCount,
          maxParticipants: config.maxParticipants,
          createdAt: room.createdAt
        });
      }
    }
    
    rooms.sort((a, b) => b.createdAt - a.createdAt);
    return rooms;
  }

  cleanupExpiredRooms() {
    const now = Date.now();
    for (const [roomCode, room] of this.rooms) {
      if (now - room.createdAt > config.roomExpiryTime) {
        this.deleteRoom(roomCode);
      }
    }
  }
}

export const roomManager = new RoomManager();

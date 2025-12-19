import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export function useVideoCall() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [roomCode, setRoomCode] = useState(null);
  const [odlayerId, setOdlayerId] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [chat, setChat] = useState([]);
  const [error, setError] = useState(null);

  // Media state
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  const peerConnections = useRef(new Map());
  const callbacksRef = useRef({});
  const localStreamRef = useRef(null);

  // Initialize socket
  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      setConnected(true);
      setError(null);

      const storedRoom = sessionStorage.getItem('videocall_room');
      const storedPlayer = sessionStorage.getItem('videocall_player');
      if (storedRoom && storedPlayer) {
        newSocket.emit('reconnect_room', {
          roomCode: storedRoom,
          odlayerId: storedPlayer
        });
      }
    });

    newSocket.on('disconnect', () => setConnected(false));
    newSocket.on('connect_error', (err) => setError('Connection failed: ' + err.message));

    // Room events
    newSocket.on('room_created', (data) => {
      setRoomCode(data.roomCode);
      setOdlayerId(data.odlayerId);
      setIsHost(data.isHost);
      sessionStorage.setItem('videocall_room', data.roomCode);
      sessionStorage.setItem('videocall_player', data.odlayerId);
      callbacksRef.current.onRoomCreated?.(data);
    });

    newSocket.on('joined', (data) => {
      setRoomCode(data.roomCode);
      setOdlayerId(data.odlayerId);
      setIsHost(data.isHost);
      setParticipants(data.participants);
      setChat(data.chat || []);
      sessionStorage.setItem('videocall_room', data.roomCode);
      sessionStorage.setItem('videocall_player', data.odlayerId);
      callbacksRef.current.onJoined?.(data);
    });

    newSocket.on('join_error', (data) => {
      setError(data.message);
      callbacksRef.current.onJoinError?.(data);
    });

    newSocket.on('reconnected', (data) => {
      setRoomCode(data.roomCode);
      setOdlayerId(data.odlayerId);
      setIsHost(data.isHost);
      setParticipants(data.participants);
      setChat(data.chat || []);
      callbacksRef.current.onReconnected?.(data);
    });

    newSocket.on('reconnect_error', () => {
      sessionStorage.removeItem('videocall_room');
      sessionStorage.removeItem('videocall_player');
    });

    newSocket.on('participant_joined', (data) => {
      setParticipants(data.participants);
    });

    newSocket.on('participant_left', (data) => {
      setParticipants(prev => prev.filter(p => p.id !== data.id));
      closePeerConnection(data.id);
    });

    newSocket.on('participant_disconnected', (data) => {
      setParticipants(prev => prev.map(p => 
        p.id === data.id ? { ...p, connected: false } : p
      ));
    });

    newSocket.on('participant_reconnected', (data) => {
      setParticipants(prev => prev.map(p => 
        p.id === data.id ? { ...p, connected: true } : p
      ));
    });

    // Chat
    newSocket.on('chat_message', (message) => {
      setChat(prev => [...prev, message]);
    });

    // Room list
    newSocket.on('rooms_list', (data) => {
      callbacksRef.current.onRoomsList?.(data);
    });

    // WebRTC signaling
    newSocket.on('webrtc_peers', (data) => {
      data.peers.forEach(peer => {
        createPeerConnection(peer.id, peer.name, true, newSocket);
      });
    });

    newSocket.on('webrtc_new_peer', (data) => {
      createPeerConnection(data.id, data.name, false, newSocket);
    });

    newSocket.on('webrtc_offer', async (data) => {
      const pc = peerConnections.current.get(data.fromId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        newSocket.emit('webrtc_answer', { targetId: data.fromId, answer });
      }
    });

    newSocket.on('webrtc_answer', async (data) => {
      const pc = peerConnections.current.get(data.fromId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    });

    newSocket.on('webrtc_ice_candidate', async (data) => {
      const pc = peerConnections.current.get(data.fromId);
      if (pc && data.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    newSocket.on('participant_media_state', (data) => {
      setParticipants(prev => prev.map(p =>
        p.id === data.odlayerId ? { ...p, audio: data.audio, video: data.video } : p
      ));
    });

    setSocket(newSocket);

    return () => {
      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
      newSocket.disconnect();
    };
  }, []);

  const createPeerConnection = useCallback((peerId, peerName, isInitiator, sock) => {
    if (peerConnections.current.has(peerId)) return;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnections.current.set(peerId, pc);

    // Add local tracks from ref (always up-to-date)
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sock.emit('webrtc_ice_candidate', { targetId: peerId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.set(peerId, { stream: event.streams[0], name: peerName });
        return newMap;
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        closePeerConnection(peerId);
      }
    };

    if (isInitiator) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          sock.emit('webrtc_offer', { targetId: peerId, offer: pc.localDescription });
        });
    }
  }, [localStream]);

  const closePeerConnection = useCallback((peerId) => {
    const pc = peerConnections.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(peerId);
    }
    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      newMap.delete(peerId);
      return newMap;
    });
  }, []);

  // Start local media
  const startMedia = useCallback(async (video = true, audio = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setVideoEnabled(video);
      setAudioEnabled(audio);
      return stream;
    } catch (err) {
      setError('Failed to access camera/microphone: ' + err.message);
      return null;
    }
  }, []);

  const stopMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
  }, []);

  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
        socket?.emit('media_state', { audio: audioTrack.enabled, video: videoEnabled });
      }
    }
  }, [localStream, socket, videoEnabled]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
        socket?.emit('media_state', { audio: audioEnabled, video: videoTrack.enabled });
      }
    }
  }, [localStream, socket, audioEnabled]);

  // Room actions
  const createRoom = useCallback((name, password = null, roomName = null) => {
    socket?.emit('create_room', { name, password, roomName });
  }, [socket]);

  const joinRoom = useCallback((code, name, password = null) => {
    setError(null);
    socket?.emit('join_room', { roomCode: code, name, password });
  }, [socket]);

  const getRooms = useCallback(() => {
    socket?.emit('get_rooms');
  }, [socket]);

  const joinCall = useCallback(() => {
    socket?.emit('webrtc_join');
  }, [socket]);

  const leaveRoom = useCallback(() => {
    stopMedia();
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    setRemoteStreams(new Map());
    
    socket?.emit('leave_room');
    sessionStorage.removeItem('videocall_room');
    sessionStorage.removeItem('videocall_player');
    
    setRoomCode(null);
    setOdlayerId(null);
    setIsHost(false);
    setParticipants([]);
    setChat([]);
  }, [socket, stopMedia]);

  const sendChat = useCallback((text) => {
    if (text.trim()) {
      socket?.emit('chat', { text: text.trim() });
    }
  }, [socket]);

  const setCallbacks = useCallback((callbacks) => {
    callbacksRef.current = callbacks;
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    connected,
    error,
    clearError,
    roomCode,
    odlayerId,
    isHost,
    participants,
    chat,
    localStream,
    remoteStreams,
    audioEnabled,
    videoEnabled,
    createRoom,
    joinRoom,
    getRooms,
    joinCall,
    leaveRoom,
    sendChat,
    startMedia,
    stopMedia,
    toggleAudio,
    toggleVideo,
    setCallbacks
  };
}

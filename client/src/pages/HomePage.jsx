import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    LogIn,
    Video,
    MessageSquare,
    Lock,
    Heart,
    Sun,
    Moon,
    Users,
    RefreshCw,
    LockOpen
} from 'lucide-react';
import { useVideoCall } from '../hooks/useVideoCall';
import CreateRoomModal from '../components/CreateRoomModal';
import JoinRoomModal from '../components/JoinRoomModal';
import './HomePage.css';

export default function HomePage() {
    const navigate = useNavigate();
    const { connected, createRoom, joinRoom, getRooms, error, clearError, setCallbacks } = useVideoCall();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [rooms, setRooms] = useState([]);
    const [roomsLoading, setRoomsLoading] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') || 'dark';
        }
        return 'dark';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        if (connected) {
            handleRefreshRooms();
            const interval = setInterval(handleRefreshRooms, 10000);
            return () => clearInterval(interval);
        }
    }, [connected]);

    setCallbacks({
        onRoomCreated: (data) => {
            setIsLoading(false);
            navigate(`/room/${data.roomCode}`);
        },
        onJoined: (data) => {
            setIsLoading(false);
            setSelectedRoom(null);
            navigate(`/room/${data.roomCode}`);
        },
        onJoinError: () => {
            setIsLoading(false);
        },
        onRoomsList: (data) => {
            setRooms(data);
            setRoomsLoading(false);
        }
    });

    const handleRefreshRooms = () => {
        setRoomsLoading(true);
        getRooms();
    };

    const handleCreateRoom = (name, password, roomName) => {
        setIsLoading(true);
        clearError();
        createRoom(name, password, roomName);
    };

    const handleJoinRoom = (code, name, password) => {
        setIsLoading(true);
        clearError();
        joinRoom(code, name, password);
    };

    const handleQuickJoin = (room) => {
        setSelectedRoom(room);
        setShowJoinModal(true);
    };

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    return (
        <div className="home-page">
            <button className="theme-toggle btn btn-ghost btn-icon" onClick={toggleTheme}>
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <main className="home-content">
                <header className="home-header">
                    <div className="logo">
                        <Video className="logo-icon" size={40} strokeWidth={1.5} />
                        <h1>Video Call</h1>
                    </div>
                    <p className="tagline">Simple video calls with friends. No signup required.</p>

                    <div className="connection-status">
                        <span className={`status-dot ${connected ? 'connected' : 'disconnected'}`} />
                        <span>{connected ? 'Connected' : 'Connecting...'}</span>
                    </div>
                </header>

                <div className="action-cards">
                    <button
                        className="action-card glass"
                        onClick={() => setShowCreateModal(true)}
                        disabled={!connected}
                    >
                        <Plus className="card-icon" size={32} />
                        <h3>Create Room</h3>
                        <p>Start a new video call</p>
                    </button>

                    <button
                        className="action-card glass"
                        onClick={() => {
                            setSelectedRoom(null);
                            setShowJoinModal(true);
                        }}
                        disabled={!connected}
                    >
                        <LogIn className="card-icon" size={32} />
                        <h3>Join Room</h3>
                        <p>Enter a room code to join</p>
                    </button>
                </div>

                <div className="room-list-section">
                    <div className="room-list-header">
                        <h2>Active Rooms</h2>
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={handleRefreshRooms}
                            disabled={roomsLoading}
                        >
                            <RefreshCw size={16} className={roomsLoading ? 'spinning' : ''} />
                            Refresh
                        </button>
                    </div>

                    {rooms.length === 0 ? (
                        <div className="room-list-empty">
                            <p>No active rooms. Create one to start a call!</p>
                        </div>
                    ) : (
                        <div className="room-list">
                            {rooms.map(room => (
                                <div key={room.code} className="room-item glass">
                                    <div className="room-info">
                                        <div className="room-name">
                                            {room.hasPassword ? <Lock size={14} /> : <LockOpen size={14} />}
                                            <span>{room.name}</span>
                                        </div>
                                        <div className="room-meta">
                                            <span className="room-code">{room.code}</span>
                                            <span className="room-players">
                                                <Users size={12} />
                                                {room.participantCount}/{room.maxParticipants}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => handleQuickJoin(room)}
                                        disabled={isLoading}
                                    >
                                        Join
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="features">
                    <div className="feature">
                        <Video size={16} />
                        <span>HD Video</span>
                    </div>
                    <div className="feature">
                        <MessageSquare size={16} />
                        <span>Live Chat</span>
                    </div>
                    <div className="feature">
                        <Lock size={16} />
                        <span>Private Rooms</span>
                    </div>
                </div>
            </main>

            <footer className="home-footer">
                <p>
                    Built with <Heart size={14} className="heart-icon" /> by{' '}
                    <a href="https://github.com/yunkhngn" target="_blank" rel="noopener noreferrer">
                        yunkhngn
                    </a>
                </p>
            </footer>

            {showCreateModal && (
                <CreateRoomModal
                    onClose={() => {
                        setShowCreateModal(false);
                        clearError();
                    }}
                    onSubmit={handleCreateRoom}
                    isLoading={isLoading}
                    error={error}
                />
            )}

            {showJoinModal && (
                <JoinRoomModal
                    onClose={() => {
                        setShowJoinModal(false);
                        setSelectedRoom(null);
                        clearError();
                    }}
                    onSubmit={handleJoinRoom}
                    isLoading={isLoading}
                    error={error}
                    prefilledCode={selectedRoom?.code}
                    requiresPassword={selectedRoom?.hasPassword}
                />
            )}
        </div>
    );
}

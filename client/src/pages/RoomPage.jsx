import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Copy,
    Check,
    Link2,
    Sun,
    Moon,
    Loader2,
    LogIn,
    Users
} from 'lucide-react';
import { useVideoCall } from '../hooks/useVideoCall';
import VideoGrid from '../components/VideoGrid';
import CallControls from '../components/CallControls';
import ChatPanel from '../components/ChatPanel';
import './RoomPage.css';

export default function RoomPage() {
    const { roomCode } = useParams();
    const navigate = useNavigate();
    
    const [showJoinForm, setShowJoinForm] = useState(false);
    const [joinName, setJoinName] = useState('');
    const [joinPassword, setJoinPassword] = useState('');
    const [joinError, setJoinError] = useState(null);
    const [needsPassword, setNeedsPassword] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [mediaStarted, setMediaStarted] = useState(false);
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

    const {
        connected,
        roomCode: connectedRoom,
        odlayerId,
        participants,
        chat,
        localStream,
        remoteStreams,
        audioEnabled,
        videoEnabled,
        joinRoom,
        joinCall,
        leaveRoom,
        sendChat,
        startMedia,
        toggleAudio,
        toggleVideo,
        setCallbacks
    } = useVideoCall();

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Check if need to show join form
    useEffect(() => {
        if (odlayerId) {
            setShowJoinForm(false);
            return;
        }

        if (connectedRoom === roomCode) {
            setShowJoinForm(false);
            return;
        }

        if (connected && roomCode && !odlayerId) {
            const storedRoom = sessionStorage.getItem('videocall_room');
            const storedPlayer = sessionStorage.getItem('videocall_player');

            if (storedRoom === roomCode && storedPlayer) {
                const timer = setTimeout(() => {
                    if (!odlayerId && connectedRoom !== roomCode) {
                        setShowJoinForm(true);
                    }
                }, 2000);
                return () => clearTimeout(timer);
            } else {
                const timer = setTimeout(() => {
                    if (!odlayerId && connectedRoom !== roomCode) {
                        setShowJoinForm(true);
                    }
                }, 500);
                return () => clearTimeout(timer);
            }
        }
    }, [connected, roomCode, odlayerId, connectedRoom]);

    // Handle callbacks
    useEffect(() => {
        setCallbacks({
            onJoinError: (data) => {
                setJoinError(data.message);
                if (data.requiresPassword) {
                    setNeedsPassword(true);
                }
            },
            onJoined: () => {
                setShowJoinForm(false);
                setJoinError(null);
            },
            onReconnected: () => {
                setShowJoinForm(false);
            }
        });
    }, [setCallbacks]);

    // Start media and join call when in room
    useEffect(() => {
        if (odlayerId && !mediaStarted) {
            startMedia(true, true).then((stream) => {
                if (stream) {
                    setMediaStarted(true);
                    joinCall();
                }
            });
        }
    }, [odlayerId, mediaStarted, startMedia, joinCall]);

    const handleLeave = () => {
        leaveRoom();
        navigate('/');
    };

    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(roomCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleCopyLink = async () => {
        try {
            const link = `${window.location.origin}/room/${roomCode}`;
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const handleJoinSubmit = (e) => {
        e.preventDefault();
        if (!joinName.trim()) return;
        setJoinError(null);
        joinRoom(roomCode, joinName.trim(), needsPassword ? joinPassword : null);
    };

    // Join form
    if (showJoinForm) {
        return (
            <div className="room-page join-page">
                <div className="join-container">
                    <div className="modal join-modal">
                        <div className="modal-header">
                            <h2 className="modal-title">Join Video Call</h2>
                        </div>
                        <div className="modal-body">
                            <p className="join-info">
                                Joining room <strong>{roomCode}</strong>
                            </p>

                            <form onSubmit={handleJoinSubmit}>
                                <div className="form-group">
                                    <label className="form-label">Your Name</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="Enter your name"
                                        value={joinName}
                                        onChange={(e) => setJoinName(e.target.value)}
                                        maxLength={20}
                                        autoFocus
                                    />
                                </div>

                                {needsPassword && (
                                    <div className="form-group">
                                        <label className="form-label">Room Password</label>
                                        <input
                                            type="password"
                                            className="input"
                                            placeholder="Enter password"
                                            value={joinPassword}
                                            onChange={(e) => setJoinPassword(e.target.value)}
                                        />
                                    </div>
                                )}

                                {joinError && (
                                    <p className="error-text">{joinError}</p>
                                )}

                                <div className="form-actions">
                                    <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={!joinName.trim()}>
                                        <LogIn size={16} />
                                        Join Call
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Waiting for media
    if (!mediaStarted && odlayerId) {
        return (
            <div className="room-page loading-page">
                <div className="loading-container">
                    <Loader2 size={48} className="spinner" />
                    <p>Starting camera and microphone...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="room-page video-call-layout">
            {/* Header */}
            <header className="call-header">
                <div className="header-left">
                    <code className="room-code">{roomCode}</code>
                    <button className="btn btn-ghost btn-xs" onClick={handleCopyCode} title="Copy code">
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                    <button className="btn btn-ghost btn-xs" onClick={handleCopyLink} title="Copy link">
                        <Link2 size={14} />
                    </button>
                </div>
                <div className="header-center">
                    <Users size={16} />
                    <span>{participants.filter(p => p.connected).length} in call</span>
                </div>
                <div className="header-right">
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={toggleTheme}>
                        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                </div>
            </header>

            {/* Main content */}
            <main className="call-main">
                <div className={`video-area ${showChat ? 'with-chat' : ''}`}>
                    <VideoGrid
                        localStream={localStream}
                        remoteStreams={remoteStreams}
                        audioEnabled={audioEnabled}
                        videoEnabled={videoEnabled}
                    />
                </div>

                {showChat && (
                    <aside className="chat-sidebar">
                        <ChatPanel
                            messages={chat}
                            onSend={sendChat}
                        />
                    </aside>
                )}
            </main>

            {/* Controls */}
            <footer className="call-footer">
                <CallControls
                    audioEnabled={audioEnabled}
                    videoEnabled={videoEnabled}
                    onToggleAudio={toggleAudio}
                    onToggleVideo={toggleVideo}
                    onLeave={handleLeave}
                    onToggleChat={() => setShowChat(!showChat)}
                    showChat={showChat}
                />
            </footer>
        </div>
    );
}

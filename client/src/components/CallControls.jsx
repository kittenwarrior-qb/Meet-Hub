import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare } from 'lucide-react';
import './CallControls.css';

export default function CallControls({
    audioEnabled,
    videoEnabled,
    onToggleAudio,
    onToggleVideo,
    onLeave,
    onToggleChat,
    showChat
}) {
    return (
        <div className="call-controls">
            <button
                className={`control-btn ${!audioEnabled ? 'off' : ''}`}
                onClick={onToggleAudio}
                title={audioEnabled ? 'Mute' : 'Unmute'}
            >
                {audioEnabled ? <Mic size={22} /> : <MicOff size={22} />}
            </button>

            <button
                className={`control-btn ${!videoEnabled ? 'off' : ''}`}
                onClick={onToggleVideo}
                title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
                {videoEnabled ? <Video size={22} /> : <VideoOff size={22} />}
            </button>

            <button
                className={`control-btn chat ${showChat ? 'active' : ''}`}
                onClick={onToggleChat}
                title="Toggle chat"
            >
                <MessageSquare size={22} />
            </button>

            <button
                className="control-btn leave"
                onClick={onLeave}
                title="Leave call"
            >
                <PhoneOff size={22} />
            </button>
        </div>
    );
}

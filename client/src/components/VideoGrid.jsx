import { useRef, useEffect } from 'react';
import { Mic, MicOff, Video, VideoOff, User } from 'lucide-react';
import './VideoGrid.css';

export default function VideoGrid({ localStream, remoteStreams, audioEnabled, videoEnabled }) {
    const localVideoRef = useRef(null);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    const totalParticipants = 1 + remoteStreams.size;
    const gridClass = totalParticipants <= 1 ? 'single' : 
                      totalParticipants <= 2 ? 'duo' :
                      totalParticipants <= 4 ? 'quad' : 'multi';

    return (
        <div className={`video-grid ${gridClass}`}>
            {/* Local video */}
            <div className="video-tile local">
                {localStream && videoEnabled ? (
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="video-element"
                    />
                ) : (
                    <div className="video-placeholder">
                        <User size={48} />
                    </div>
                )}
                <div className="video-label">
                    <span>You</span>
                    <div className="media-indicators">
                        {audioEnabled ? <Mic size={14} /> : <MicOff size={14} className="muted" />}
                        {videoEnabled ? <Video size={14} /> : <VideoOff size={14} className="muted" />}
                    </div>
                </div>
            </div>

            {/* Remote videos */}
            {Array.from(remoteStreams.entries()).map(([odlayerId, { stream, name }]) => (
                <RemoteVideo key={odlayerId} stream={stream} name={name} />
            ))}
        </div>
    );
}

function RemoteVideo({ stream, name }) {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    const hasVideo = stream?.getVideoTracks().some(t => t.enabled);
    const hasAudio = stream?.getAudioTracks().some(t => t.enabled);

    return (
        <div className="video-tile remote">
            {stream && hasVideo ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="video-element"
                />
            ) : (
                <div className="video-placeholder">
                    <User size={48} />
                </div>
            )}
            <div className="video-label">
                <span>{name || 'Participant'}</span>
                <div className="media-indicators">
                    {hasAudio ? <Mic size={14} /> : <MicOff size={14} className="muted" />}
                    {hasVideo ? <Video size={14} /> : <VideoOff size={14} className="muted" />}
                </div>
            </div>
        </div>
    );
}

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import './CreateRoomModal.css';

export default function CreateRoomModal({ onClose, onSubmit, isLoading, error }) {
    const [name, setName] = useState('');
    const [roomName, setRoomName] = useState('');
    const [password, setPassword] = useState('');
    const [usePassword, setUsePassword] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        onSubmit(name.trim(), usePassword ? password : null, roomName.trim() || null);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal create-room-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Create Room</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="input-group">
                        <label className="input-label">Your Name</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Enter your name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={20}
                            autoFocus
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Room Name <span className="label-optional">(optional)</span></label>
                        <input
                            type="text"
                            className="input"
                            placeholder="e.g. Casual Game, Tournament Match..."
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            maxLength={30}
                        />
                    </div>

                    <div className="password-toggle">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={usePassword}
                                onChange={(e) => setUsePassword(e.target.checked)}
                            />
                            <span className="checkbox-custom" />
                            <span>Private room (password protected)</span>
                        </label>
                    </div>

                    {usePassword && (
                        <div className="input-group">
                            <label className="input-label">Room Password</label>
                            <input
                                type="password"
                                className="input"
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    )}

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={!name.trim() || isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={16} className="spinner" />
                                    Creating...
                                </>
                            ) : (
                                'Create Room'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

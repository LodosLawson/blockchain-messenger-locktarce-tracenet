import { useState, useEffect } from 'react';
import axios from 'axios';
import ValidatorStatus from '../Validation/ValidatorStatus';
import './Feed.css';

function Feed({ token, ws }) {
    const [posts] = useState([
        {
            id: 1,
            author: 'TechNews',
            content: 'Blockchain technology is revolutionizing how we communicate! 🚀',
            image: null,
            likes: 42,
            timestamp: Date.now() - 3600000
        },
        {
            id: 2,
            author: 'CryptoDaily',
            content: 'Decentralized messaging platforms are the future of privacy.',
            image: null,
            likes: 28,
            timestamp: Date.now() - 7200000
        },
        {
            id: 3,
            author: 'WebDev',
            content: 'Just deployed my first blockchain app! The possibilities are endless.',
            image: null,
            likes: 15,
            timestamp: Date.now() - 10800000
        }
    ]);

    const [pendingMessages, setPendingMessages] = useState([]);
    const [validatorStats, setValidatorStats] = useState({ validationCount: 0, totalEarned: 0 });
    const [validating, setValidating] = useState(null);

    useEffect(() => {
        fetchPendingMessages();

        // Send heartbeat to track activity
        const interval = setInterval(() => {
            axios.post('/api/validation/heartbeat', {
                activityType: 'browsing'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            }).catch(err => console.error('Heartbeat failed:', err));
        }, 5000);

        return () => clearInterval(interval);
    }, [token]);

    useEffect(() => {
        if (!ws) return;

        const handleMessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'validator_stats') {
                    setValidatorStats(data.stats || { validationCount: 0, totalEarned: 0 });
                } else if (data.type === 'transaction_validated') {
                    // Refresh pending messages when a transaction is validated
                    fetchPendingMessages();
                } else if (data.type === 'validation_assigned') {
                    // New validation opportunity
                    fetchPendingMessages();
                }
            } catch (error) {
                console.error('WebSocket message error:', error);
            }
        };

        ws.addEventListener('message', handleMessage);
        return () => ws.removeEventListener('message', handleMessage);
    }, [ws]);

    const fetchPendingMessages = async () => {
        try {
            const response = await axios.get('/api/messages/pending', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPendingMessages(response.data.pending || []);
        } catch (error) {
            console.error('Error fetching pending messages:', error);
        }
    };

    const handleValidate = async (transactionHash) => {
        setValidating(transactionHash);
        try {
            const response = await axios.post('/api/messages/validate',
                { transactionHash },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                // Show success feedback
                alert(`✅ Validation successful! You earned ${response.data.reward} LTC`);
                fetchPendingMessages();
            }
        } catch (error) {
            console.error('Validation error:', error);
            alert(error.response?.data?.error || 'Failed to validate message');
        } finally {
            setValidating(null);
        }
    };

    return (
        <div className="feed-container">
            <div className="feed-header">
                <h2 className="feed-title">Social Feed</h2>
                <p className="text-sm text-muted">Browse while earning validation rewards</p>
            </div>

            {/* Validator Status */}
            <ValidatorStatus stats={validatorStats} />

            {/* Pending Validations */}
            {pendingMessages.length > 0 && (
                <div className="validation-section glass">
                    <div className="validation-header">
                        <h3 className="font-semibold">🎯 Validation Opportunities</h3>
                        <span className="validation-count">{pendingMessages.length} pending</span>
                    </div>
                    <div className="pending-messages">
                        {pendingMessages.map(msg => (
                            <div key={msg.hash} className="pending-message">
                                <div className="message-info">
                                    <div className="message-meta">
                                        <span className="message-from">{msg.from}</span>
                                        <span className="text-muted">→</span>
                                        <span className="message-to">{msg.to}</span>
                                    </div>
                                    <p className="message-content">{msg.message}</p>
                                    <div className="message-footer">
                                        <span className="text-xs text-muted">
                                            {new Date(msg.timestamp).toLocaleString()}
                                        </span>
                                        <span className="validation-progress">
                                            {msg.validationCount}/3 validations
                                        </span>
                                    </div>
                                </div>
                                <button
                                    className="validate-btn"
                                    onClick={() => handleValidate(msg.hash)}
                                    disabled={validating === msg.hash}
                                >
                                    {validating === msg.hash ? '⏳' : '✅'} Validate
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="posts-list">
                {posts.map(post => (
                    <div key={post.id} className="post-card card fade-in">
                        <div className="post-header">
                            <div className="user-avatar">{post.author[0]}</div>
                            <div>
                                <p className="font-semibold">{post.author}</p>
                                <p className="text-xs text-muted">
                                    {new Date(post.timestamp).toLocaleString()}
                                </p>
                            </div>
                        </div>

                        <div className="post-content">
                            <p>{post.content}</p>
                        </div>

                        {post.image && (
                            <div className="post-image">
                                <img src={post.image} alt="Post" />
                            </div>
                        )}

                        <div className="post-footer">
                            <button className="post-action">
                                ❤️ {post.likes}
                            </button>
                            <button className="post-action">
                                💬 Comment
                            </button>
                            <button className="post-action">
                                🔄 Share
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="feed-info glass">
                <p className="text-sm">
                    <span className="font-semibold">💡 Tip:</span> While you browse this feed,
                    you're actively validating transactions from other users and earning LTC!
                </p>
            </div>
        </div>
    );
}

export default Feed;

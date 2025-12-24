import { useState, useEffect } from 'react';
import axios from 'axios';
import ValidatorStatus from '../Validation/ValidatorStatus';
import './Feed.css';

function Feed({ token, ws, currentUser }) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Create Post State
    const [newPostContent, setNewPostContent] = useState('');
    const [creatingPost, setCreatingPost] = useState(false);

    // Comment State
    const [activeCommentPostId, setActiveCommentPostId] = useState(null);
    const [commentContent, setCommentContent] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);

    const [pendingMessages, setPendingMessages] = useState([]);
    const [validatorStats, setValidatorStats] = useState({ validationCount: 0, totalEarned: 0 });
    const [validating, setValidating] = useState(null);

    useEffect(() => {
        fetchPosts();
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
                } else if (data.type === 'block_mined') {
                    // Refresh feed when new block mined
                    fetchPosts();
                }
            } catch (error) {
                console.error('WebSocket message error:', error);
            }
        };

        ws.addEventListener('message', handleMessage);
        return () => ws.removeEventListener('message', handleMessage);
    }, [ws]);

    const fetchPosts = async () => {
        try {
            const response = await axios.get('/api/social/feed', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPosts(response.data.posts || []);
        } catch (error) {
            console.error('Error fetching feed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePost = async (e) => {
        e.preventDefault();
        if (!newPostContent.trim() || creatingPost) return;

        setCreatingPost(true);
        try {
            const response = await axios.post('/api/social/post', {
                content: newPostContent
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setNewPostContent('');
                // Optimistically add post or wait for fetch
                fetchPosts();
            }
        } catch (error) {
            console.error('Create post error:', error);
            alert('Failed to creates post');
        } finally {
            setCreatingPost(false);
        }
    };

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

    const handleLike = async (postId) => {
        // Optimistic update
        setPosts(posts.map(p =>
            p.id === postId ? { ...p, likes: (p.likes || 0) + 1 } : p
        ));

        try {
            await axios.post('/api/social/like', { postId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.error('Like failed:', error);
            // Revert
            setPosts(posts.map(p =>
                p.id === postId ? { ...p, likes: (p.likes || 0) - 1 } : p
            ));
        }
    };

    const toggleComment = (postId) => {
        if (activeCommentPostId === postId) {
            setActiveCommentPostId(null);
            setCommentContent('');
        } else {
            setActiveCommentPostId(postId);
            setCommentContent('');
        }
    };

    const submitComment = async (e, postId) => {
        e.preventDefault();
        if (!commentContent.trim() || submittingComment) return;

        setSubmittingComment(true);
        try {
            const response = await axios.post('/api/social/comment', {
                postId,
                content: commentContent
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                alert('✅ Comment added!');
                setActiveCommentPostId(null);
                setCommentContent('');
            }
        } catch (error) {
            console.error('Comment failed:', error);
            alert('Failed to comment');
        } finally {
            setSubmittingComment(false);
        }
    };

    return (
        <div className="feed-container">
            <div className="feed-header">
                <h2 className="feed-title">Social Feed</h2>
                <p className="text-sm text-muted">Browse while earning validation rewards</p>
            </div>

            {/* Create Post Section */}
            <div className="create-post-section glass mb-lg p-md rounded-xl">
                <form onSubmit={handleCreatePost}>
                    <textarea
                        className="input w-full resize-none min-h-[100px] mb-sm"
                        placeholder="What's on your mind? (Stored on Blockchain)"
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                    />
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={!newPostContent.trim() || creatingPost}
                        >
                            {creatingPost ? 'Posting...' : 'Post to Blockchain'}
                        </button>
                    </div>
                </form>
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
                {loading ? (
                    <div className="text-center p-lg">Loading feed from blockchain...</div>
                ) : posts.length === 0 ? (
                    <div className="text-center p-lg glass rounded-xl">
                        <p className="text-muted">No posts yet. Be the first to post!</p>
                    </div>
                ) : (
                    posts.map(post => (
                        <div key={post.id} className="post-card card fade-in">
                            <div className="post-header">
                                <div className="user-avatar">{post.author[0].toUpperCase()}</div>
                                <div>
                                    <p className="font-semibold">{post.author}</p>
                                    <p className="text-xs text-muted">
                                        {new Date(post.timestamp).toLocaleString()}
                                    </p>
                                </div>
                                {post.pending && <span className="badge badge-warning ml-auto">Pending Block</span>}
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
                                <button className="post-action" onClick={() => handleLike(post.id)}>
                                    ❤️ {post.likes || 0}
                                </button>
                                <button className="post-action" onClick={() => toggleComment(post.id)}>
                                    💬 Comment
                                </button>
                                <button className="post-action">
                                    🔄 Share
                                </button>
                            </div>

                            {activeCommentPostId === post.id && (
                                <form onSubmit={(e) => submitComment(e, post.id)} className="mt-sm pt-sm border-t border-white/5 slide-in">
                                    <input
                                        type="text"
                                        className="input w-full text-sm"
                                        placeholder="Write a comment..."
                                        value={commentContent}
                                        onChange={(e) => setCommentContent(e.target.value)}
                                        autoFocus
                                    />
                                    <div className="flex justify-end mt-xs">
                                        <button
                                            type="submit"
                                            className="btn btn-sm btn-ghost"
                                            disabled={!commentContent.trim() || submittingComment}
                                        >
                                            Reply
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    ))
                )}
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

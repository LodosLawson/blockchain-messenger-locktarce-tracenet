import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './ChatWindow.css';

function ChatWindow({ currentUser, otherUser, token, ws, isMobile }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        fetchMessages();
    }, [otherUser]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (ws) {
            const handleMessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'new_message' && data.message.fromId === otherUser.id) {
                    fetchMessages();
                }
            };

            ws.addEventListener('message', handleMessage);
            return () => ws.removeEventListener('message', handleMessage);
        }
    }, [ws, otherUser]);

    const fetchMessages = async () => {
        try {
            const response = await axios.get(`/api/messages/conversation/${otherUser.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(response.data.messages);
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        setSending(true);
        try {
            await axios.post('/api/messages/send', {
                toUserId: otherUser.id,
                message: newMessage
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setNewMessage('');
            fetchMessages();
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="chat-window">
            {!isMobile && (
                <div className="chat-header glass">
                    <div className="user-avatar">{otherUser.username[0].toUpperCase()}</div>
                    <div>
                        <h3 className="font-semibold">{otherUser.username}</h3>
                        <p className="text-xs text-muted">Online</p>
                    </div>
                </div>
            )}

            <div className="messages-container">
                {messages.length === 0 ? (
                    <div className="empty-messages">
                        <p className="text-muted">No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`message ${msg.from === currentUser.publicKey ? 'sent' : 'received'}`}
                        >
                            <div className="message-bubble">
                                <p>{msg.message}</p>
                                <div className="message-meta">
                                    <span className="text-xs">
                                        {new Date(msg.timestamp).toLocaleTimeString()}
                                    </span>
                                    {msg.validated && (
                                        <span className="badge badge-success">✓ Validated</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="message-input-container">
                <input
                    type="text"
                    className="input message-input"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={sending}
                />
                <button type="submit" className="btn btn-primary" disabled={sending || !newMessage.trim()}>
                    {sending ? 'Sending...' : 'Send'}
                </button>
            </form>
        </div>
    );
}

export default ChatWindow;

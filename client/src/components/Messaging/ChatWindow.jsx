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
        <div className="chat-window flex flex-col h-full relative">
            {!isMobile && (
                <div className="chat-header glass-panel p-md flex items-center gap-md z-10">
                    <div className="user-avatar">{otherUser.username[0].toUpperCase()}</div>
                    <div>
                        <h3 className="font-semibold text-lg">{otherUser.username}</h3>
                        <div className="flex items-center gap-xs">
                            <span className="w-2 h-2 rounded-full bg-success"></span>
                            <p className="text-xs text-muted">Online</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="messages-container flex-1 overflow-y-auto p-md flex flex-col gap-sm">
                {messages.length === 0 ? (
                    <div className="empty-messages flex items-center justify-center h-full">
                        <div className="text-center p-lg glass-panel rounded-xl">
                            <span className="text-2xl mb-sm block">👋</span>
                            <p className="text-muted">No messages yet. Start the conversation!</p>
                        </div>
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`message flex ${msg.from === currentUser.publicKey ? 'justify-end' : 'justify-start'} slide-in`}
                            style={{ animationDelay: `${index * 20}ms` }}
                        >
                            <div
                                className={`message-bubble p-md rounded-xl max-w-[80%] ${msg.from === currentUser.publicKey
                                        ? 'bg-accent-primary text-white rounded-tr-none'
                                        : 'bg-tertiary text-primary rounded-tl-none glass-panel'
                                    }`}
                            >
                                <p className="text-sm leading-relaxed">{msg.message}</p>
                                <div className="message-meta flex items-center justify-end gap-xs mt-xs opacity-70">
                                    <span className="text-[10px]">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {msg.validated && (
                                        <span className="text-[10px]">✓</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="message-input-container p-md glass-panel border-t border-border-color flex gap-sm sticky bottom-0 z-20">
                <input
                    type="text"
                    className="input flex-1"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={sending}
                />
                <button
                    type="submit"
                    className="btn btn-primary w-12 h-12 rounded-full flex items-center justify-center p-0 flex-shrink-0"
                    disabled={sending || !newMessage.trim()}
                >
                    {sending ? (
                        <span className="animate-spin">↻</span>
                    ) : (
                        <span>➤</span>
                    )}
                </button>
            </form>
        </div>
    );
}

export default ChatWindow;

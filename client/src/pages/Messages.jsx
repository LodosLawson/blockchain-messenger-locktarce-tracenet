import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { MessageSquare, Send, Loader2, Search, User } from 'lucide-react';

const Messages = ({ user, ws }) => {
    const [contacts, setContacts] = useState([]);
    const [selectedContact, setSelectedContact] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        loadContacts();
    }, []);

    const loadContacts = async () => {
        try {
            const data = await api.users.getAllUsers();
            setContacts(data.users?.filter(u => u.userId !== user.userId) || []);
        } catch (error) {
            console.error('Error loading contacts:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async (contactId) => {
        try {
            const data = await api.messages.getMessages(contactId);
            setMessages(data.messages || []);
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedContact) return;

        setSending(true);
        try {
            await api.messages.sendMessage(selectedContact.userId, newMessage);
            setMessages([...messages, {
                from: user.userId,
                to: selectedContact.userId,
                content: newMessage,
                timestamp: Date.now()
            }]);
            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-180px)]">
            {/* Contacts sidebar */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow-lg p-4 overflow-y-auto">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Contacts</h2>
                <div className="space-y-2">
                    {contacts.map((contact) => (
                        <button
                            key={contact.userId}
                            onClick={() => {
                                setSelectedContact(contact);
                                loadMessages(contact.userId);
                            }}
                            className={`w-full p-3 rounded-lg text-left transition-all ${selectedContact?.userId === contact.userId
                                    ? 'bg-indigo-50 border-2 border-indigo-500'
                                    : 'hover:bg-gray-50 border-2 border-transparent'
                                }`}
                        >
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                                    <User className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 truncate">{contact.username}</p>
                                    <p className="text-xs text-gray-500 truncate">
                                        {contact.publicKey?.substring(0, 12)}...
                                    </p>
                                </div>
                            </div>
                        </button>
                    ))}
                    {contacts.length === 0 && (
                        <p className="text-gray-500 text-sm text-center py-8">No contacts yet</p>
                    )}
                </div>
            </div>

            {/* Chat area */}
            <div className="lg:col-span-3 bg-white rounded-xl shadow-lg flex flex-col">
                {selectedContact ? (
                    <>
                        {/* Chat header */}
                        <div className="p-4 border-b flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">{selectedContact.username}</h3>
                                <p className="text-xs text-gray-500">
                                    {selectedContact.publicKey?.substring(0, 20)}...
                                </p>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((msg, idx) => {
                                const isOwn = msg.from === user.userId;
                                return (
                                    <div key={idx} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${isOwn
                                                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                                                : 'bg-gray-100 text-gray-900'
                                            }`}>
                                            <p className="text-sm">{msg.content}</p>
                                            <p className={`text-xs mt-1 ${isOwn ? 'text-white/70' : 'text-gray-500'}`}>
                                                {new Date(msg.timestamp).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                            {messages.length === 0 && (
                                <div className="text-center text-gray-500 py-8">
                                    <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                    <p>No messages yet. Start the conversation!</p>
                                </div>
                            )}
                        </div>

                        {/* Message input */}
                        <form onSubmit={handleSendMessage} className="p-4 border-t">
                            <div className="flex space-x-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    disabled={sending}
                                />
                                <button
                                    type="submit"
                                    disabled={sending || !newMessage.trim()}
                                    className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {sending ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Send className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium">Select a contact to start messaging</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Messages;

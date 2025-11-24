import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import axios from 'axios';
import ChatWindow from '../Messaging/ChatWindow';
import WalletView from '../Wallet/WalletView';
import ValidatorStatus from '../Validation/ValidatorStatus';
import Feed from '../Social/Feed';
import BlockchainMonitor from '../Blockchain/BlockchainMonitor';
import PriceChart from '../Market/PriceChart';
import './Dashboard.css';

function Dashboard({ user, token, ws, onLogout }) {
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [balance, setBalance] = useState(0);
    const [validatorStats, setValidatorStats] = useState({ validationCount: 0, totalEarned: 0 });
    const [activeView, setActiveView] = useState('messages');

    useEffect(() => {
        fetchUsers();
        fetchBalance();
        fetchValidatorStatus();

        // Set up heartbeat
        const heartbeat = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'heartbeat',
                    activityType: activeView
                }));
            }
        }, 5000);

        return () => clearInterval(heartbeat);
    }, [activeView, ws]);

    useEffect(() => {
        if (ws) {
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);

                if (data.type === 'validator_stats') {
                    setValidatorStats(data.stats);
                } else if (data.type === 'new_message') {
                    // Refresh messages if viewing conversation
                    if (selectedUser && data.message.fromId === selectedUser.id) {
                        // Message component will handle refresh
                    }
                } else if (data.type === 'block_mined') {
                    fetchBalance();
                }
            };
        }
    }, [ws, selectedUser]);

    const fetchUsers = async () => {
        try {
            const response = await axios.get('/api/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(response.data.users.filter(u => u.id !== user.id));
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    };

    const fetchBalance = async () => {
        try {
            const response = await axios.get('/api/wallet/balance', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBalance(response.data.balance);
        } catch (error) {
            console.error('Failed to fetch balance:', error);
        }
    };

    const fetchValidatorStatus = async () => {
        try {
            const response = await axios.get('/api/validation/status', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.stats) {
                setValidatorStats(response.data.stats);
            }
        } catch (error) {
            console.error('Failed to fetch validator status:', error);
        }
    };

    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleUserSelect = (u) => {
        setSelectedUser(u);
    };

    const handleBackToUsers = () => {
        setSelectedUser(null);
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderMobileContent = () => {
        if (activeView === 'messages') {
            if (selectedUser) {
                return (
                    <div className="h-full flex flex-col">
                        <div className="mobile-header">
                            <button className="back-button" onClick={handleBackToUsers}>
                                ←
                            </button>
                            <div className="user-avatar small">{selectedUser.username[0].toUpperCase()}</div>
                            <span className="font-semibold">{selectedUser.username}</span>
                        </div>
                        <ChatWindow
                            currentUser={user}
                            otherUser={selectedUser}
                            token={token}
                            ws={ws}
                            isMobile={true}
                        />
                    </div>
                );
            }
            return (
                <div className="mobile-user-list">
                    <div className="search-container">
                        <input
                            type="text"
                            className="input"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="users">
                        {filteredUsers.map(u => (
                            <div
                                key={u.id}
                                className="user-item"
                                onClick={() => handleUserSelect(u)}
                            >
                                <div className="user-avatar">{u.username[0].toUpperCase()}</div>
                                <div className="user-details">
                                    <p className="font-semibold">{u.username}</p>
                                    <p className="text-xs text-muted">Tap to message</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        // Other views
        switch (activeView) {
            case 'wallet': return <WalletView balance={balance} token={token} />;
            case 'feed': return <Feed token={token} ws={ws} />;
            case 'blockchain': return <BlockchainMonitor token={token} ws={ws} />;
            default: return null;
        }
    };

    return (
        <div className="dashboard-container">
            {/* Sidebar (Desktop) */}
            <div className="sidebar glass">
                <div className="sidebar-header">
                    <h2 className="sidebar-title">Blockchain Messenger</h2>
                    <div className="user-info">
                        <div className="user-avatar">{user.username[0].toUpperCase()}</div>
                        <div>
                            <p className="font-semibold">{user.username}</p>
                            <p className="text-xs text-muted">{balance.toFixed(2)} LTC</p>
                        </div>
                    </div>
                </div>

                <div className="sidebar-nav">
                    <button
                        className={`nav-item ${activeView === 'messages' ? 'active' : ''}`}
                        onClick={() => setActiveView('messages')}
                    >
                        <span>💬</span> Messages
                    </button>
                    <button
                        className={`nav-item ${activeView === 'wallet' ? 'active' : ''}`}
                        onClick={() => setActiveView('wallet')}
                    >
                        <span>💰</span> Wallet
                    </button>
                    <button
                        className={`nav-item ${activeView === 'feed' ? 'active' : ''}`}
                        onClick={() => setActiveView('feed')}
                    >
                        <span>📱</span> Social Feed
                    </button>
                    <button
                        className={`nav-item ${activeView === 'blockchain' ? 'active' : ''}`}
                        onClick={() => setActiveView('blockchain')}
                    >
                        <span>⛓️</span> Blockchain
                    </button>
                </div>

                {activeView === 'messages' && (
                    <div className="user-list">
                        <div className="search-container">
                            <input
                                type="text"
                                className="input"
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="users">
                            {filteredUsers.map(u => (
                                <div
                                    key={u.id}
                                    className={`user-item ${selectedUser?.id === u.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedUser(u)}
                                >
                                    <div className="user-avatar">{u.username[0].toUpperCase()}</div>
                                    <div className="user-details">
                                        <p className="font-semibold">{u.username}</p>
                                        <p className="text-xs text-muted">Click to message</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button className="btn btn-secondary w-full mt-lg" onClick={onLogout}>
                    Logout
                </button>
            </div>

            {/* Main Content */}
            <div className="main-content">
                {!isMobile && (
                    <>
                        <PriceChart token={token} />
                        <ValidatorStatus stats={validatorStats} />
                    </>
                )}

                <div className="content-area">
                    {isMobile ? renderMobileContent() : (
                        <>
                            {activeView === 'messages' && (
                                selectedUser ? (
                                    <ChatWindow
                                        currentUser={user}
                                        otherUser={selectedUser}
                                        token={token}
                                        ws={ws}
                                    />
                                ) : (
                                    <div className="empty-state">
                                        <h3>Select a user to start messaging</h3>
                                        <p className="text-muted">Choose someone from the list to begin a conversation</p>
                                    </div>
                                )
                            )}

                            {activeView === 'wallet' && (
                                <WalletView balance={balance} token={token} />
                            )}

                            {activeView === 'feed' && (
                                <Feed token={token} ws={ws} />
                            )}

                            {activeView === 'blockchain' && (
                                <BlockchainMonitor token={token} ws={ws} />
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Bottom Navigation (Mobile) */}
            {isMobile && (
                <div className="bottom-nav">
                    <button
                        className={`bottom-nav-item ${activeView === 'messages' ? 'active' : ''}`}
                        onClick={() => setActiveView('messages')}
                    >
                        <span>💬</span>
                        Messages
                    </button>
                    <button
                        className={`bottom-nav-item ${activeView === 'wallet' ? 'active' : ''}`}
                        onClick={() => setActiveView('wallet')}
                    >
                        <span>💰</span>
                        Wallet
                    </button>
                    <button
                        className={`bottom-nav-item ${activeView === 'feed' ? 'active' : ''}`}
                        onClick={() => setActiveView('feed')}
                    >
                        <span>📱</span>
                        Feed
                    </button>
                    <button
                        className={`bottom-nav-item ${activeView === 'blockchain' ? 'active' : ''}`}
                        onClick={() => setActiveView('blockchain')}
                    >
                        <span>⛓️</span>
                        Chain
                    </button>
                </div>
            )}
        </div>
    );
}

export default Dashboard;

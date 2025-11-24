import React from 'react';

const Sidebar = ({ user, balance, activeView, setActiveView, onLogout }) => {
    return (
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

            <button className="btn btn-secondary w-full mt-lg" onClick={onLogout}>
                Logout
            </button>
        </div>
    );
};

export default Sidebar;

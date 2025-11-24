import React from 'react';

const BottomNav = ({ activeView, setActiveView }) => {
    return (
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
    );
};

export default BottomNav;

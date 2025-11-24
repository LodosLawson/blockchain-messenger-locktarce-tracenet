import { useEffect, useRef } from 'react';
import './TransactionFeed.css';

function TransactionFeed({ transactions }) {
    const feedRef = useRef(null);

    useEffect(() => {
        // Auto-scroll to top when new transactions arrive
        if (feedRef.current) {
            feedRef.current.scrollTop = 0;
        }
    }, [transactions]);

    const formatHash = (hash) => {
        if (!hash) return 'N/A';
        return `${hash.substring(0, 6)}...${hash.substring(hash.length - 6)}`;
    };

    const formatTimestamp = (timestamp) => {
        const now = Date.now();
        const diff = now - timestamp;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return new Date(timestamp).toLocaleDateString();
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'message': return '💬';
            case 'transfer': return '💸';
            case 'reward': return '🎁';
            case 'validation': return '✅';
            default: return '📄';
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'message': return '#3b82f6';
            case 'transfer': return '#10b981';
            case 'reward': return '#f59e0b';
            case 'validation': return '#8b5cf6';
            default: return '#6b7280';
        }
    };

    return (
        <div className="transaction-feed" ref={feedRef}>
            {transactions.length === 0 ? (
                <div className="feed-empty">
                    <p className="text-muted">No recent transactions</p>
                </div>
            ) : (
                transactions.map((tx, index) => (
                    <div key={index} className="feed-item fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                        <div className="feed-icon" style={{ background: getTypeColor(tx.type) }}>
                            {getTypeIcon(tx.type)}
                        </div>
                        <div className="feed-content">
                            <div className="feed-header">
                                <span className="feed-type" style={{ color: getTypeColor(tx.type) }}>
                                    {tx.type}
                                </span>
                                <span className="feed-time text-xs text-muted">
                                    {formatTimestamp(tx.timestamp)}
                                </span>
                            </div>
                            <div className="feed-details">
                                <div className="feed-row">
                                    <span className="text-xs text-muted">From:</span>
                                    <span className="text-xs hash">{formatHash(tx.from)}</span>
                                </div>
                                <div className="feed-row">
                                    <span className="text-xs text-muted">To:</span>
                                    <span className="text-xs hash">{formatHash(tx.to)}</span>
                                </div>
                                {tx.amount > 0 && (
                                    <div className="feed-row">
                                        <span className="text-xs text-muted">Amount:</span>
                                        <span className="text-xs font-semibold text-success">
                                            {tx.amount} LTC
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

export default TransactionFeed;

import { useState } from 'react';
import './BlockCard.css';

function BlockCard({ block }) {
    const [expanded, setExpanded] = useState(false);

    const formatHash = (hash) => {
        if (!hash) return 'N/A';
        return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
    };

    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleString();
    };

    return (
        <div className="block-card glass">
            <div className="block-header" onClick={() => setExpanded(!expanded)}>
                <div className="block-info">
                    <div className="block-index">Block #{block.index}</div>
                    <div className="block-time text-xs text-muted">
                        {formatTimestamp(block.timestamp)}
                    </div>
                </div>
                <div className="block-meta">
                    <span className="tx-count">{block.transactionCount} tx</span>
                    <span className="expand-icon">{expanded ? '▼' : '▶'}</span>
                </div>
            </div>

            <div className="block-details">
                <div className="detail-row">
                    <span className="detail-label">Hash:</span>
                    <span className="detail-value hash">{formatHash(block.hash)}</span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">Previous:</span>
                    <span className="detail-value hash">{formatHash(block.previousHash)}</span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">Nonce:</span>
                    <span className="detail-value">{block.nonce}</span>
                </div>
            </div>

            {expanded && block.transactions && block.transactions.length > 0 && (
                <div className="block-transactions">
                    <div className="transactions-header">Transactions:</div>
                    {block.transactions.map((tx, index) => (
                        <div key={index} className="transaction-item">
                            <div className="tx-type-badge">{tx.type}</div>
                            <div className="tx-details">
                                <div className="tx-row">
                                    <span className="text-xs text-muted">From:</span>
                                    <span className="text-xs">{formatHash(tx.from)}</span>
                                </div>
                                <div className="tx-row">
                                    <span className="text-xs text-muted">To:</span>
                                    <span className="text-xs">{formatHash(tx.to)}</span>
                                </div>
                                <div className="tx-row">
                                    <span className="text-xs text-muted">Amount:</span>
                                    <span className="text-xs font-semibold">{tx.amount} LTC</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default BlockCard;

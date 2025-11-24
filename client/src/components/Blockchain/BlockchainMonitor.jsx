import { useState, useEffect } from 'react';
import axios from 'axios';
import BlockCard from './BlockCard';
import TransactionFeed from './TransactionFeed';
import OnlineValidators from './OnlineValidators';
import './BlockchainMonitor.css';

function BlockchainMonitor({ token, ws }) {
    const [stats, setStats] = useState({
        chainLength: 0,
        pendingTransactions: 0,
        circulatingSupply: 0,
        maxSupply: 100000000,
        isValid: true
    });
    const [blocks, setBlocks] = useState([]);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [validators, setValidators] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBlockchainData();

        // Request real-time updates via WebSocket
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'request_blockchain_stats' }));
            ws.send(JSON.stringify({ type: 'request_validators' }));
        }

        // Set up interval to refresh data
        const interval = setInterval(fetchBlockchainData, 10000); // Every 10 seconds

        return () => clearInterval(interval);
    }, [token]);

    useEffect(() => {
        if (!ws) return;

        const handleMessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'blockchain_stats') {
                    setStats(prev => ({ ...prev, ...data.stats }));
                } else if (data.type === 'blockchain_update') {
                    setStats(prev => ({ ...prev, ...data.stats }));
                    fetchBlocks(); // Refresh blocks when blockchain updates
                } else if (data.type === 'validators_list' || data.type === 'validators_list_update') {
                    setValidators(data.validators || []);
                } else if (data.type === 'block_mined') {
                    // New block mined, refresh data
                    fetchBlockchainData();
                }
            } catch (error) {
                console.error('WebSocket message error:', error);
            }
        };

        ws.addEventListener('message', handleMessage);
        return () => ws.removeEventListener('message', handleMessage);
    }, [ws]);

    const fetchBlockchainData = async () => {
        try {
            await Promise.all([
                fetchStats(),
                fetchBlocks(),
                fetchRecentTransactions(),
                fetchValidators()
            ]);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching blockchain data:', error);
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await axios.get('/api/blockchain/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchBlocks = async () => {
        try {
            const response = await axios.get('/api/blockchain/blocks?limit=5', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBlocks(response.data.blocks);
        } catch (error) {
            console.error('Error fetching blocks:', error);
        }
    };

    const fetchRecentTransactions = async () => {
        try {
            const response = await axios.get('/api/blockchain/transactions/recent?limit=10', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRecentTransactions(response.data.transactions);
        } catch (error) {
            console.error('Error fetching transactions:', error);
        }
    };

    const fetchValidators = async () => {
        try {
            const response = await axios.get('/api/blockchain/validators/online', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setValidators(response.data.validators);
        } catch (error) {
            console.error('Error fetching validators:', error);
        }
    };

    if (loading) {
        return (
            <div className="blockchain-monitor">
                <div className="loading">Loading blockchain data...</div>
            </div>
        );
    }

    return (
        <div className="blockchain-monitor">
            <div className="monitor-header">
                <h2 className="monitor-title">⛓️ Blockchain Monitor</h2>
                <p className="text-sm text-muted">Real-time blockchain activity and network statistics</p>
            </div>

            {/* Blockchain Statistics */}
            <div className="stats-grid">
                <div className="stat-card glass">
                    <div className="stat-icon">📊</div>
                    <div>
                        <p className="text-xs text-muted">Chain Length</p>
                        <p className="stat-value">{stats.chainLength}</p>
                    </div>
                </div>
                <div className="stat-card glass">
                    <div className="stat-icon">⏳</div>
                    <div>
                        <p className="text-xs text-muted">Pending Transactions</p>
                        <p className="stat-value">{stats.pendingTransactions}</p>
                    </div>
                </div>
                <div className="stat-card glass">
                    <div className="stat-icon">💰</div>
                    <div>
                        <p className="text-xs text-muted">Circulating Supply</p>
                        <p className="stat-value">{stats.circulatingSupply?.toFixed(2)}</p>
                    </div>
                </div>
                <div className="stat-card glass">
                    <div className="stat-icon">👥</div>
                    <div>
                        <p className="text-xs text-muted">Online Validators</p>
                        <p className="stat-value">{validators.length}</p>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="monitor-grid">
                {/* Recent Blocks */}
                <div className="monitor-section">
                    <h3 className="section-title">Recent Blocks</h3>
                    <div className="blocks-list">
                        {blocks.map(block => (
                            <BlockCard key={block.index} block={block} />
                        ))}
                    </div>
                </div>

                {/* Transaction Feed */}
                <div className="monitor-section">
                    <h3 className="section-title">Transaction Feed</h3>
                    <TransactionFeed transactions={recentTransactions} />
                </div>

                {/* Online Validators */}
                <div className="monitor-section full-width">
                    <h3 className="section-title">Online Validators</h3>
                    <OnlineValidators validators={validators} />
                </div>
            </div>
        </div>
    );
}

export default BlockchainMonitor;

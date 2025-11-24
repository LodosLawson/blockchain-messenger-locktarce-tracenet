import { useState, useEffect } from 'react';
import axios from 'axios';
import './WalletView.css';

function WalletView({ balance, token }) {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    const [currentPrice, setCurrentPrice] = useState(0);

    useEffect(() => {
        fetchTransactions();
        fetchPrice();
    }, []);

    const fetchPrice = async () => {
        try {
            const response = await axios.get('/api/tokenomics/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const marketStats = response.data;
            // Calculate price based on fixed $1000 market cap
            if (marketStats.circulatingSupply > 0) {
                setCurrentPrice(1000 / marketStats.circulatingSupply);
            }
        } catch (error) {
            console.error('Failed to fetch price:', error);
        }
    };

    const fetchTransactions = async () => {
        try {
            const response = await axios.get('/api/wallet/transactions', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTransactions(response.data.transactions);
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTransactionType = (tx) => {
        if (tx.type === 'reward') {
            return { label: 'Reward', color: 'success' };
        } else if (tx.type === 'transfer') {
            return { label: 'Transfer', color: 'warning' };
        } else {
            return { label: 'Message', color: 'warning' };
        }
    };

    return (
        <div className="wallet-view">
            <div className="wallet-header glass">
                <h2 className="wallet-title">Your Wallet</h2>
                <div className="balance-card">
                    <p className="text-sm text-muted">Total Balance</p>
                    <h1 className="balance-amount">{balance.toFixed(2)} <span className="text-sm">LTC</span></h1>
                    {currentPrice > 0 && (
                        <p className="text-sm text-success mt-sm">
                            ≈ ${(balance * currentPrice).toFixed(2)} USD
                        </p>
                    )}
                </div>
            </div>

            <div className="transactions-section">
                <h3 className="section-title">Transaction History</h3>

                {loading ? (
                    <div className="loading-state">
                        <p className="text-muted">Loading transactions...</p>
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="empty-state">
                        <p className="text-muted">No transactions yet</p>
                    </div>
                ) : (
                    <div className="transactions-list">
                        {transactions.map((tx, index) => {
                            const txType = getTransactionType(tx);
                            return (
                                <div key={index} className="transaction-item card">
                                    <div className="transaction-info">
                                        <div className="flex items-center gap-md">
                                            <span className={`badge badge-${txType.color}`}>
                                                {txType.label}
                                            </span>
                                            <div>
                                                <p className="font-semibold">
                                                    {tx.type === 'reward'
                                                        ? `${tx.data?.reason === 'mining' ? 'Mining' : 'Validation'} Reward`
                                                        : tx.type === 'message'
                                                            ? 'Message Transaction'
                                                            : 'Transfer'}
                                                </p>
                                                <p className="text-xs text-muted">
                                                    {new Date(tx.timestamp).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={`transaction-amount ${tx.amount > 0 ? 'positive' : 'negative'}`}>
                                            {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)} LTC
                                        </div>
                                    </div>
                                    {tx.data?.validatedCount && (
                                        <p className="text-xs text-muted mt-sm">
                                            Validated {tx.data.validatedCount} transactions
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default WalletView;

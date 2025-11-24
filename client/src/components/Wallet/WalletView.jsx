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
        <div className="wallet-view fade-in">
            <div className="wallet-header glass-panel">
                <h2 className="wallet-title text-xl font-bold">Your Wallet</h2>
                <div className="balance-card mt-md">
                    <p className="text-sm text-muted font-medium">Total Balance</p>
                    <h1 className="balance-amount text-2xl font-bold mt-sm">{balance.toFixed(2)} <span className="text-sm text-accent">LTC</span></h1>
                    {currentPrice > 0 && (
                        <p className="text-sm text-success mt-xs font-medium">
                            ≈ ${(balance * currentPrice).toFixed(2)} USD
                        </p>
                    )}
                </div>
            </div>

            <div className="transactions-section mt-lg">
                <h3 className="section-title text-lg font-semibold mb-md">Transaction History</h3>

                {loading ? (
                    <div className="loading-state flex justify-center p-lg">
                        <div className="pulse text-muted">Loading transactions...</div>
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="empty-state text-center p-lg glass-panel rounded-lg">
                        <p className="text-muted">No transactions yet</p>
                    </div>
                ) : (
                    <div className="transactions-list flex flex-col gap-md">
                        {transactions.map((tx, index) => {
                            const txType = getTransactionType(tx);
                            return (
                                <div key={index} className="transaction-item card flex justify-between items-center slide-in" style={{ animationDelay: `${index * 50}ms` }}>
                                    <div className="transaction-info flex items-center gap-md">
                                        <div className={`badge badge-${txType.color}`}>
                                            {txType.label}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm">
                                                {tx.type === 'reward'
                                                    ? `${tx.data?.reason === 'mining' ? 'Mining' : 'Validation'} Reward`
                                                    : tx.type === 'message'
                                                        ? 'Message Fee'
                                                        : 'Transfer'}
                                            </p>
                                            <p className="text-xs text-muted">
                                                {new Date(tx.timestamp).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`transaction-amount font-bold ${tx.amount > 0 ? 'text-success' : 'text-muted'}`}>
                                        {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)} LTC
                                    </div>
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

import { useState, useEffect } from 'react';
import axios from 'axios';
import UserSearch from '../Shared/UserSearch';
import './WalletView.css';

function WalletView({ balance, token }) {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    const [currentPrice, setCurrentPrice] = useState(0);

    // Transfer state
    const [showTransfer, setShowTransfer] = useState(false);
    const [recipient, setRecipient] = useState(null);
    const [amount, setAmount] = useState('');
    const [transferring, setTransferring] = useState(false);

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

    const handleTransfer = async (e) => {
        e.preventDefault();
        if (!recipient || !amount || transferring) return;

        setTransferring(true);
        try {
            const response = await axios.post('/api/wallet/transfer',
                { toUsername: recipient.username, amount: parseFloat(amount) },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                alert(`✅ Successfully sent ${amount} LTC to ${recipient.username}`);
                setShowTransfer(false);
                setRecipient(null);
                setAmount('');
                fetchTransactions();
                // Trigger balance update via parent if possible, or reload page. 
                // Since balance is passed as prop, we might need to rely on parent refresh or just window.location.reload() for now if we can't update parent.
                // But better: wait for WebSocket update (block mined) which should update parent balance.
            }
        } catch (error) {
            console.error('Transfer failed:', error);
            alert(error.response?.data?.error || 'Transfer failed');
        } finally {
            setTransferring(false);
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
                <div className="flex justify-between items-start">
                    <h2 className="wallet-title text-xl font-bold">Your Wallet</h2>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowTransfer(!showTransfer)}
                    >
                        {showTransfer ? 'Cancel' : 'Send Coins'}
                    </button>
                </div>

                <div className="balance-card mt-md">
                    <p className="text-sm text-muted font-medium">Total Balance</p>
                    <h1 className="balance-amount text-2xl font-bold mt-sm">{balance.toFixed(2)} <span className="text-sm text-accent">LTC</span></h1>
                    {currentPrice > 0 && (
                        <p className="text-sm text-success mt-xs font-medium">
                            ≈ ${(balance * currentPrice).toFixed(2)} USD
                        </p>
                    )}
                </div>

                {showTransfer && (
                    <div className="transfer-section mt-md p-md glass rounded-xl border border-border-color slide-in">
                        <h3 className="font-semibold mb-sm">Send LTC</h3>
                        <form onSubmit={handleTransfer} className="flex flex-col gap-sm">
                            <div className="form-group">
                                <label className="text-xs text-muted mb-xs block">Recipient</label>
                                <UserSearch
                                    token={token}
                                    onSelect={(user) => setRecipient(user)}
                                    placeholder="Search by username..."
                                />
                            </div>
                            <div className="form-group">
                                <label className="text-xs text-muted mb-xs block">Amount (LTC)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="input w-full"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    min="0.01"
                                />
                            </div>
                            <button
                                type="submit"
                                className="btn btn-success mt-sm"
                                disabled={!recipient || !amount || transferring}
                            >
                                {transferring ? 'Sending...' : `Send ${amount ? amount + ' LTC' : ''}`}
                            </button>
                        </form>
                    </div>
                )}
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
                                            {tx.type === 'transfer' && (
                                                <p className="text-xs text-muted">
                                                    {tx.data?.fromUsername ? `From: ${tx.data.fromUsername}` : ''}
                                                    {tx.data?.toUsername ? ` To: ${tx.data.toUsername}` : ''}
                                                </p>
                                            )}
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

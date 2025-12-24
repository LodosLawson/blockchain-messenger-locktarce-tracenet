import { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
    Send,
    Loader2,
    CheckCircle,
    AlertCircle,
    Search,
    User,
    Coins,
    ArrowRightLeft
} from 'lucide-react';

const Wallet = ({ user, ws }) => {
    const [balance, setBalance] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        loadData();

        // Real-time balance updates
        if (ws) {
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'balance_update' || data.type === 'block_mined') {
                    loadBalance();
                    loadTransactions();
                }
            };
        }
    }, [ws]);

    const loadData = async () => {
        try {
            const [balanceData, txData, usersData] = await Promise.all([
                api.wallet.getBalance(),
                api.wallet.getTransactions().catch(() => ({ transactions: [] })),
                api.users.getAllUsers().catch(() => ({ users: [] }))
            ]);

            setBalance(balanceData.balance || 0);
            setTransactions(txData.transactions || []);
            setUsers(usersData.users || []);
        } catch (error) {
            console.error('Error loading wallet data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadBalance = async () => {
        try {
            const data = await api.wallet.getBalance();
            setBalance(data.balance || 0);
        } catch (error) {
            console.error('Error loading balance:', error);
        }
    };

    const loadTransactions = async () => {
        try {
            const data = await api.wallet.getTransactions();
            setTransactions(data.transactions || []);
        } catch (error) {
            console.error('Error loading transactions:', error);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();

        if (!selectedUser || !amount) {
            setMessage({ type: 'error', text: 'Please select a recipient and enter an amount' });
            return;
        }

        const amountNum = parseFloat(amount);
        if (amountNum <= 0 || amountNum > balance) {
            setMessage({ type: 'error', text: 'Invalid amount' });
            return;
        }

        setSending(true);
        setMessage(null);

        try {
            await api.wallet.sendTransaction(selectedUser.publicKey, amountNum);
            setMessage({ type: 'success', text: 'Transaction sent successfully!' });
            setAmount('');
            setSelectedUser(null);
            loadBalance();
            loadTransactions();
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Failed to send transaction' });
        } finally {
            setSending(false);
        }
    };

    const filteredUsers = users.filter(u =>
        u.userId !== user.userId &&
        u.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Send transaction form */}
            <div className="lg:col-span-2 space-y-6">
                {/* Balance card */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
                    <p className="text-white/80 text-sm mb-2">Your Balance</p>
                    <h2 className="text-5xl font-bold mb-4">{balance.toFixed(2)}</h2>
                    <div className="flex items-center space-x-2">
                        <Coins className="w-5 h-5" />
                        <span>Blockchain Coins</span>
                    </div>
                </div>

                {/* Send form */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">Send Coins</h3>

                    {message && (
                        <div className={`mb-4 p-4 rounded-lg flex items-start space-x-3 ${message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                            }`}>
                            {message.type === 'success' ? (
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            )}
                            <p className={`text-sm ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                                {message.text}
                            </p>
                        </div>
                    )}

                    <form onSubmit={handleSend} className="space-y-4">
                        {/* User search */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Recipient
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search users..."
                                    className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                            </div>

                            {/* User list */}
                            {searchQuery && (
                                <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                                    {filteredUsers.map((u) => (
                                        <button
                                            key={u.userId}
                                            type="button"
                                            onClick={() => {
                                                setSelectedUser(u);
                                                setSearchQuery('');
                                            }}
                                            className="w-full px-4 py-3 hover:bg-gray-50 flex items-center space-x-3 text-left"
                                        >
                                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                                                <User className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900">{u.username}</p>
                                                <p className="text-xs text-gray-500 truncate">
                                                    {u.publicKey?.substring(0, 20)}...
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                    {filteredUsers.length === 0 && (
                                        <p className="px-4 py-3 text-gray-500 text-sm">No users found</p>
                                    )}
                                </div>
                            )}

                            {/* Selected user */}
                            {selectedUser && (
                                <div className="mt-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
                                            <User className="w-4 h-4 text-white" />
                                        </div>
                                        <span className="font-medium text-gray-900">{selectedUser.username}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedUser(null)}
                                        className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                                    >
                                        Change
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Amount */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Amount
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                max={balance}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                disabled={sending}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Available: {balance.toFixed(2)} coins
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={sending || !selectedUser || !amount}
                            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                            {sending ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Sending...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    <span>Send Coins</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>

            {/* Recent transactions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Transactions</h3>
                <div className="space-y-3">
                    {transactions.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-8">No transactions yet</p>
                    ) : (
                        transactions.slice(0, 10).map((tx, idx) => (
                            <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <ArrowRightLeft className="w-4 h-4 text-gray-400" />
                                    <span className={`text-sm font-bold ${tx.toAddress === user.publicKey ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                        {tx.toAddress === user.publicKey ? '+' : '-'}{tx.amount}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600 truncate">
                                    {tx.toAddress === user.publicKey ? 'From: ' : 'To: '}
                                    {(tx.toAddress === user.publicKey ? tx.fromAddress : tx.toAddress)?.substring(0, 16)}...
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {new Date(tx.timestamp).toLocaleString()}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Wallet;

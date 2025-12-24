import { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
    Wallet as WalletIcon,
    TrendingUp,
    Users,
    Activity,
    Coins,
    ArrowUpRight,
    Loader2
} from 'lucide-react';

const Dashboard = ({ user, ws }) => {
    const [stats, setStats] = useState(null);
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();

        // WebSocket listeners for real-time updates
        if (ws) {
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);

                if (data.type === 'balance_update' || data.type === 'block_mined') {
                    loadBalance();
                }

                if (data.type === 'blockchain_stats') {
                    setStats(data.stats);
                }
            };

            // Request blockchain stats
            ws.send(JSON.stringify({ type: 'request_blockchain_stats' }));
        }
    }, [ws]);

    const loadData = async () => {
        try {
            const [balanceData, statsData] = await Promise.all([
                api.wallet.getBalance(),
                api.blockchain.getStats()
            ]);

            setBalance(balanceData.balance || 0);
            setStats(statsData);
        } catch (error) {
            console.error('Error loading data:', error);
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    const statCards = [
        {
            title: 'Your Balance',
            value: `${balance.toFixed(2)} Coins`,
            icon: WalletIcon,
            color: 'from-indigo-500 to-purple-600',
            change: '+3 coins (welcome bonus)'
        },
        {
            title: 'Blockchain Height',
            value: stats?.chainLength || 0,
            icon: Activity,
            color: 'from-blue-500 to-cyan-600',
            change: 'blocks mined'
        },
        {
            title: 'Pending Transactions',
            value: stats?.pendingTransactions || 0,
            icon: TrendingUp,
            color: 'from-green-500 to-emerald-600',
            change: 'waiting confirmation'
        },
        {
            title: 'Total Supply',
            value: `${((stats?.circulatingSupply || 0) / 1000).toFixed(1)}K`,
            icon: Coins,
            color: 'from-yellow-500 to-orange-600',
            change: `of ${((stats?.maxSupply || 0) / 1000).toFixed(0)}K coins`
        },
    ];

    return (
        <div className="space-y-6">
            {/* Welcome header */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
                <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.username}!</h1>
                <p className="text-white/90">Here's what's happening with your blockchain messenger</p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((card, idx) => {
                    const Icon = card.icon;
                    return (
                        <div key={idx} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`w-12 h-12 bg-gradient-to-br ${card.color} rounded-lg flex items-center justify-center`}>
                                    <Icon className="w-6 h-6 text-white" />
                                </div>
                                <ArrowUpRight className="w-5 h-5 text-gray-400" />
                            </div>
                            <h3 className="text-gray-600 text-sm font-medium mb-1">{card.title}</h3>
                            <p className="text-2xl font-bold text-gray-900 mb-1">{card.value}</p>
                            <p className="text-xs text-gray-500">{card.change}</p>
                        </div>
                    );
                })}
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all group">
                        <WalletIcon className="w-8 h-8 text-gray-400 group-hover:text-indigo-600 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-700 group-hover:text-indigo-700">Send Coins</p>
                    </button>

                    <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group">
                        <Users className="w-8 h-8 text-gray-400 group-hover:text-purple-600 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-700 group-hover:text-purple-700">Send Message</p>
                    </button>

                    <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group">
                        <Activity className="w-8 h-8 text-gray-400 group-hover:text-blue-600 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-700 group-hover:text-blue-700">View Blocks</p>
                    </button>
                </div>
            </div>

            {/* User info */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Your Wallet Address</h2>
                <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm break-all">
                    {user?.publicKey || 'Loading...'}
                </div>
                <p className="text-xs text-gray-500 mt-2">This is your unique blockchain address</p>
            </div>
        </div>
    );
};

export default Dashboard;

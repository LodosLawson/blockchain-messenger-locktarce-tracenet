import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Box, Loader2, ChevronDown, ChevronUp, Clock, Hash, Package } from 'lucide-react';

const BlockchainExplorer = () => {
    const [blocks, setBlocks] = useState([]);
    const [stats, setStats] = useState(null);
    const [expandedBlock, setExpandedBlock] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [blocksData, statsData] = await Promise.all([
                api.blockchain.getBlocks(20),
                api.blockchain.getStats()
            ]);

            setBlocks(blocksData.blocks || []);
            setStats(statsData);
        } catch (error) {
            console.error('Error loading blockchain data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header stats */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
                <h1 className="text-3xl font-bold mb-4">Blockchain Explorer</h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <p className="text-white/80 text-sm mb-1">Total Blocks</p>
                        <p className="text-2xl font-bold">{stats?.chainLength || 0}</p>
                    </div>
                    <div>
                        <p className="text-white/80 text-sm mb-1">Pending Transactions</p>
                        <p className="text-2xl font-bold">{stats?.pendingTransactions || 0}</p>
                    </div>
                    <div>
                        <p className="text-white/80 text-sm mb-1">Circulating Supply</p>
                        <p className="text-2xl font-bold">{((stats?.circulatingSupply || 0) / 1000).toFixed(1)}K</p>
                    </div>
                </div>
            </div>

            {/* Blocks list */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Blocks</h2>
                <div className="space-y-4">
                    {blocks.map((block, idx) => (
                        <div
                            key={idx}
                            className="border-2 border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors"
                        >
                            {/* Block header */}
                            <button
                                onClick={() => setExpandedBlock(expandedBlock === idx ? null : idx)}
                                className="w-full flex items-center justify-between"
                            >
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                                        <Box className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-bold text-gray-900">Block #{block.index}</h3>
                                        <p className="text-xs text-gray-500">
                                            {new Date(block.timestamp).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <div className="text-right">
                                        <p className="text-sm text-gray-600">
                                            {block.transactions?.length || 0} transactions
                                        </p>
                                    </div>
                                    {expandedBlock === idx ? (
                                        <ChevronUp className="w-5 h-5 text-gray-400" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                    )}
                                </div>
                            </button>

                            {/* Expanded block details */}
                            {expandedBlock === idx && (
                                <div className="mt-4 pt-4 border-t space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <div className="flex items-center space-x-2 text-gray-600 mb-1">
                                                <Hash className="w-4 h-4" />
                                                <span className="text-sm font-medium">Hash</span>
                                            </div>
                                            <p className="text-xs font-mono bg-gray-50 p-2 rounded break-all">
                                                {block.hash}
                                            </p>
                                        </div>
                                        <div>
                                            <div className="flex items-center space-x-2 text-gray-600 mb-1">
                                                <Hash className="w-4 h-4" />
                                                <span className="text-sm font-medium">Previous Hash</span>
                                            </div>
                                            <p className="text-xs font-mono bg-gray-50 p-2 rounded break-all">
                                                {block.previousHash}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="flex items-center space-x-2 text-gray-600 mb-1">
                                                <Package className="w-4 h-4" />
                                                <span className="text-sm font-medium">Nonce</span>
                                            </div>
                                            <p className="text-sm font-mono bg-gray-50 p-2 rounded">
                                                {block.nonce}
                                            </p>
                                        </div>
                                        <div>
                                            <div className="flex items-center space-x-2 text-gray-600 mb-1">
                                                <Clock className="w-4 h-4" />
                                                <span className="text-sm font-medium">Timestamp</span>
                                            </div>
                                            <p className="text-sm bg-gray-50 p-2 rounded">
                                                {new Date(block.timestamp).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Transactions */}
                                    {block.transactions && block.transactions.length > 0 && (
                                        <div>
                                            <h4 className="font-medium text-gray-900 mb-2">Transactions</h4>
                                            <div className="space-y-2">
                                                {block.transactions.map((tx, txIdx) => (
                                                    <div key={txIdx} className="bg-gray-50 p-3 rounded-lg">
                                                        <div className="grid grid-cols-3 gap-2 text-xs">
                                                            <div>
                                                                <span className="text-gray-600">From:</span>
                                                                <p className="font-mono truncate">{tx.fromAddress?.substring(0, 16)}...</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-600">To:</span>
                                                                <p className="font-mono truncate">{tx.toAddress?.substring(0, 16)}...</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-600">Amount:</span>
                                                                <p className="font-bold text-indigo-600">{tx.amount}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BlockchainExplorer;

import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import Blockchain from './blockchain/Blockchain.js';
import Transaction from './blockchain/Transaction.js';
// Initialize P2P Service
const p2pService = new P2PService(blockchain);
// const P2P_PORT = process.env.P2P_PORT || 6001;
// try {
//     p2pService.listen(P2P_PORT);
// } catch (error) {
//     console.warn(`⚠️ Failed to start P2P service on port ${P2P_PORT}:`, error.message);
// }

// Set up broadcasting
blockchain.onTransactionAdded = (tx) => p2pService.broadcastTransaction(tx);
blockchain.onBlockMined = (block) => p2pService.broadcastBlock(block);

// Load blockchain from disk if exists
const savedData = loadBlockchain();
if (savedData) {
    blockchain.loadFromData(savedData);
    verifyBlockchainIntegrity(blockchain);
}

const randomDistributor = new RandomRewardDistributor();
const feeManager = new FeeManager(blockchain, randomDistributor);
const marketCapTracker = new MarketCapTracker(blockchain);
const validatorPool = new ValidatorPool(blockchain);
const activityTracker = new ActivityTracker(validatorPool);

// Start cleanup interval
activityTracker.startCleanupInterval();

// Track new user registrations for initial bonus
const pendingBonuses = new Map(); // userId -> publicKey

console.log('🚀 Starting server initialization...');

// Create HTTP server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
    console.log(`⛓️  Blockchain initialized`);
    console.log(`💰 Max Supply: ${blockchain.MAX_SUPPLY.toLocaleString()} coins`);
    console.log(`🎁 Initial Bonus: ${blockchain.INITIAL_USER_BONUS} coins`);
    console.log(`📊 Market Cap: $${marketCapTracker.getMarketCap()}`);
    console.log(`✅ Validator pool ready`);
    // console.log(`📡 P2P Service active on port ${P2P_PORT}`);

    // Initial save
    saveBlockchain(blockchain);
});

// Periodic auto-save every 5 minutes
const AUTO_SAVE_INTERVAL = 5 * 60 * 1000; // 5 minutes
const autoSaveTimer = setInterval(() => {
    console.log('⏰ Periodic auto-save triggered');
    saveBlockchain(blockchain);
}, AUTO_SAVE_INTERVAL);

// Graceful shutdown handler
function gracefulShutdown(signal) {
    console.log(`\n${signal} received. Saving blockchain before shutdown...`);

    // Clear auto-save timer
    clearInterval(autoSaveTimer);

    // Save blockchain
    saveBlockchain(blockchain);
    console.log('✅ Blockchain saved successfully. Shutting down...');

    // Close server
    server.close(() => {
        console.log('👋 Server closed');
        process.exit(0);
    });

    // Force exit after 10 seconds if server doesn't close
    setTimeout(() => {
        console.error('⚠️  Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
}

// Register shutdown handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'auth') {
                // Authenticate WebSocket connection
                try {
                    const decoded = jwt.verify(data.token, JWT_SECRET);
                    ws.userId = decoded.userId;
                    ws.username = decoded.username;

                    // Register as validator
                    const user = getUserById(decoded.userId);
                    if (user) {
                        validatorPool.registerValidator(decoded.userId, user.publicKey);
                        randomDistributor.registerUser(decoded.userId);
                        activityTracker.trackActivity(decoded.userId, 'connected');

                        // Check if user needs initial bonus (legacy check, now handled in auth.js)
                        if (pendingBonuses.has(decoded.userId)) {
                            pendingBonuses.delete(decoded.userId);
                        }
                    }

                    ws.send(JSON.stringify({
                        type: 'auth_success',
                        message: 'Authenticated successfully'
                    }));

                    // Broadcast validator list update to all clients
                    broadcastValidatorListUpdate();
                } catch (error) {
                    ws.send(JSON.stringify({
                        type: 'auth_error',
                        message: 'Invalid token'
                    }));
                }
            } else if (data.type === 'heartbeat') {
                // Update activity
                if (ws.userId) {
                    activityTracker.trackActivity(ws.userId, data.activityType || 'browsing');

                    // Send validator stats
                    const stats = validatorPool.getValidatorStats(ws.userId);
                    const selectionInfo = randomDistributor.getUserSelectionInfo(ws.userId);

                    ws.send(JSON.stringify({
                        type: 'validator_stats',
                        stats: stats || { validationCount: 0, totalEarned: 0 },
                        selectionInfo: selectionInfo
                    }));
                }
            } else if (data.type === 'request_blockchain_stats') {
                // Send blockchain statistics
                if (ws.userId) {
                    ws.send(JSON.stringify({
                        type: 'blockchain_stats',
                        stats: {
                            chainLength: blockchain.chain.length,
                            pendingTransactions: blockchain.pendingTransactions.length,
                            circulatingSupply: blockchain.getCirculatingSupply(),
                            maxSupply: blockchain.MAX_SUPPLY
                        }
                    }));
                }
            } else if (data.type === 'request_validators') {
                // Send online validators list
                if (ws.userId) {
                    const validators = validatorPool.getActiveValidatorsWithDetails();
                    ws.send(JSON.stringify({
                        type: 'validators_list',
                        validators: validators.map(v => ({
                            userId: v.userId,
                            validationCount: v.validationCount,
                            totalEarned: v.totalEarned,
                            tier: v.tier
                        }))
                    }));
                }
            }
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    });

    ws.on('close', () => {
        if (ws.userId) {
            validatorPool.removeValidator(ws.userId);
            randomDistributor.removeUser(ws.userId);
            console.log(`User ${ws.username} disconnected`);

            // Broadcast validator list update
            broadcastValidatorListUpdate();
        }
    });
});

// Helper function to broadcast validator list updates
function broadcastValidatorListUpdate() {
    const validators = validatorPool.getActiveValidatorsWithDetails();
    const message = JSON.stringify({
        type: 'validators_list_update',
        count: validators.length,
        validators: validators.map(v => ({
            userId: v.userId,
            validationCount: v.validationCount,
            totalEarned: v.totalEarned,
            tier: v.tier
        }))
    });

    wss.clients.forEach(client => {
        if (client.readyState === 1) {
            client.send(message);
        }
    });
}

// Initialize route dependencies
initializeAuthRouter(blockchain, marketCapTracker);
initializeMessagesRouter(blockchain, validatorPool, activityTracker, wss);
initializeWalletRouter(blockchain);
initializeValidationRouter(validatorPool, activityTracker);
initializeTokenomicsRouter(feeManager, blockchain, marketCapTracker);
initializeBlockchainRouter(blockchain, validatorPool);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
blockchain.minePendingTransactions('SYSTEM_MINING_REWARD', validatorRewards);

// Save blockchain to disk
saveBlockchain(blockchain);

console.log(`⛏️  Block mined! Pending transactions: ${blockchain.pendingTransactions.length}`);

// Update market cap tracker
marketCapTracker.onTransaction();

// Notify all clients about new block
wss.clients.forEach(client => {
    if (client.readyState === 1) {
        const balance = client.userId ? blockchain.getBalanceOfAddress(
            getUserById(client.userId)?.publicKey
        ) : 0;

        client.send(JSON.stringify({
            type: 'block_mined',
            message: 'New block added to chain',
            balance: balance,
            blockIndex: blockchain.chain.length - 1,
            pendingCount: blockchain.pendingTransactions.length
        }));
    }
});

// Broadcast blockchain update
wss.clients.forEach(client => {
    if (client.readyState === 1) {
        client.send(JSON.stringify({
            type: 'blockchain_update',
            stats: {
                chainLength: blockchain.chain.length,
                pendingTransactions: blockchain.pendingTransactions.length,
                circulatingSupply: blockchain.getCirculatingSupply()
            }
        }));
    }
});
    }
}, 30000);

// Periodic market cap update (every 5 minutes)
setInterval(() => {
    const stats = marketCapTracker.getStats();
    console.log(`📊 Market Stats - Price: $${stats.currentPrice.toFixed(6)} | Supply: ${stats.circulatingSupply.toFixed(2)} | Cap: $${stats.marketCap}`);
}, 300000);

export default app;
export { pendingBonuses };
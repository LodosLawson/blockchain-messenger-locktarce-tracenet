import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Core Components (Default Exports)
import Blockchain from './blockchain/Blockchain.js';
import P2PService from './network/P2PService.js';

// Database & Persistence (Named Exports)
import { initializeDB, getUserById } from './database/db.js';
import { initializePersistence, saveBlockchain, loadBlockchain, verifyBlockchainIntegrity } from './utils/blockchainPersistence.js';

// Validation & Tokenomics Components (Default Exports)
import ValidatorPool from './validation/ValidatorPool.js';
import ActivityTracker from './validation/ActivityTracker.js';
import RandomRewardDistributor from './tokenomics/RandomRewardDistributor.js';
import FeeManager from './tokenomics/FeeManager.js';
import MarketCapTracker from './tokenomics/MarketCapTracker.js';

// Import routers
import authRouter, { initializeAuthRouter } from './routes/auth.js';
import messagesRouter, { initializeMessagesRouter } from './routes/messages.js';
import walletRouter, { initializeWalletRouter } from './routes/wallet.js';
import validationRouter, { initializeValidationRouter } from './routes/validation.js';
import tokenomicsRouter, { initializeTokenomicsRouter } from './routes/tokenomics.js';
import blockchainRouter, { initializeBlockchainRouter } from './routes/blockchain.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 SERVER PROCESS STARTING...');
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', process.env.PORT);

// Initialize Database and Persistence
try {
    console.log('📂 Initializing database...');
    initializeDB();
    console.log('💾 Initializing persistence...');
    initializePersistence();
    console.log('✅ Initialization complete');
} catch (error) {
    console.error('❌ Critical Initialization Error:', error);
    console.error(error.stack);
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;
const P2P_PORT = process.env.P2P_PORT || 6001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'client/dist')));

// Initialize Blockchain components
const blockchain = new Blockchain();
const p2pService = new P2PService(blockchain);

// Initialize P2P Service
try {
    // In Cloud Run (production), we don't bind to a separate P2P port.
    // We only start the P2P server if NOT in production or if specifically configured.
    if (process.env.NODE_ENV !== 'production') {
        p2pService.listen(P2P_PORT);
        console.log(`📡 P2P Service active on port ${P2P_PORT}`);
    } else {
        console.log('📡 P2P Service listener skipped in production (Cloud Run mode)');
    }
} catch (error) {
    console.warn(`⚠️ Failed to start P2P service on port ${P2P_PORT}:`, error.message);
}

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

// Update market cap tracker
marketCapTracker.onTransaction();

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/validation', validationRouter);
app.use('/api/tokenomics', tokenomicsRouter);
app.use('/api/blockchain', blockchainRouter);

// Health check endpoint for Cloud Run
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// P2P Routes
app.post('/api/peers', (req, res) => {
    const { peer } = req.body;
    if (peer) {
        p2pService.connectToPeers([peer]);
        res.json({ success: true, message: `Connected to ${peer}` });
    } else {
        res.status(400).json({ error: 'Peer URL required' });
    }
});

app.get('/api/peers', (req, res) => {
    res.json(p2pService.getPeers());
});

// Handle new user registration (called from auth route - legacy)
app.post('/api/internal/register-bonus', (req, res) => {
    const { userId, publicKey } = req.body;
    if (userId && publicKey) {
        pendingBonuses.set(userId, publicKey);
        res.json({ success: true });
    } else {
        res.status(400).json({ error: 'Missing userId or publicKey' });
    }
});

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

// Periodic market cap update (every 5 minutes)
setInterval(() => {
    const stats = marketCapTracker.getStats();
    console.log(`📊 Market Stats - Price: $${stats.currentPrice.toFixed(6)} | Supply: ${stats.circulatingSupply.toFixed(2)} | Cap: $${stats.marketCap}`);
}, 300000);

// Catch-all route for SPA (React Router)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// Global Error Handlers
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    // Keep running if possible, but log it
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

export default app;
export { pendingBonuses };
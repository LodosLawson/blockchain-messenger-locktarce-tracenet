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
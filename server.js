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
import socialRouter, { initializeSocialRouter } from './routes/social.js';
import networkRouter, { initializeNetworkRouter } from './routes/network.js';

// ... (omitted lines)

initializeBlockchainRouter(blockchain, validatorPool);
initializeSocialRouter(blockchain);
initializeNetworkRouter(p2pService);

// ... (omitted lines)

app.use('/api/blockchain', blockchainRouter);
app.use('/api/social', socialRouter);
app.use('/api', networkRouter); // Mounts /api/peers

// Health check endpoint for Cloud Run
app.get('/health', (req, res) => {
    res.status(200).send('OK');
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
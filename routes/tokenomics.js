import express from 'express';
import { verifyToken } from './auth.js';
import { FEE_STRUCTURE } from '../tokenomics/FeeManager.js';

const router = express.Router();

let feeManager, blockchain, marketCapTracker;

export const initializeTokenomicsRouter = (fm, bc, mct) => {
    feeManager = fm;
    blockchain = bc;
    marketCapTracker = mct;
};

// Get tokenomics stats
router.get('/stats', verifyToken, (req, res) => {
    try {
        const stats = marketCapTracker.getStats();
        const systemBalance = blockchain.getBalanceOfAddress(blockchain.systemWallet);

        res.json({
            success: true,
            stats: {
                ...stats,
                systemWalletBalance: systemBalance
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// Get price history
router.get('/price-history', verifyToken, (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const history = marketCapTracker.getPriceHistory(limit);

        res.json({
            success: true,
            history
        });
    } catch (error) {
        console.error('Get price history error:', error);
        res.status(500).json({ error: 'Failed to get price history' });
    }
});

// Get fee structure
router.get('/fee-structure', verifyToken, (req, res) => {
    try {
        res.json({
            success: true,
            fees: FEE_STRUCTURE
        });
    } catch (error) {
        console.error('Get fee structure error:', error);
        res.status(500).json({ error: 'Failed to get fee structure' });
    }
});

export default router;

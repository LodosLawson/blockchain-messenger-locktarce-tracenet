import express from 'express';
import { verifyToken } from './auth.js';
import { getUserById } from '../database/db.js';

const router = express.Router();

let blockchain;

export const initializeWalletRouter = (bc) => {
    blockchain = bc;
};

// Get wallet balance
router.get('/balance', verifyToken, (req, res) => {
    try {
        const user = getUserById(req.user.userId);
        const balance = blockchain.getBalanceOfAddress(user.publicKey);
        const transactions = blockchain.getAllTransactionsForAddress(user.publicKey);

        res.json({
            success: true,
            balance,
            publicKey: user.publicKey,
            transactions
        });
    } catch (error) {
        console.error('Get balance error:', error);
        res.status(500).json({ error: 'Failed to get balance' });
    }
});

// Get transaction history
router.get('/transactions', verifyToken, (req, res) => {
    try {
        const user = getUserById(req.user.userId);
        const transactions = blockchain.getAllTransactionsForAddress(user.publicKey);

        res.json({
            success: true,
            transactions
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Failed to get transactions' });
    }
});

export default router;

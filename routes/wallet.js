import express from 'express';
import crypto from 'crypto';
import { verifyToken } from './auth.js';
import { getUserById } from '../database/db.js';
import Transaction from '../blockchain/Transaction.js';
import { saveBlockchain } from '../utils/blockchainPersistence.js';

const router = express.Router();

let blockchain;

export const initializeWalletRouter = (bc) => {
    blockchain = bc;
};

// Get wallet balance
router.get('/balance', verifyToken, (req, res) => {
    try {
        const user = getUserById(req.user.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

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

// Send transaction
router.post('/send', verifyToken, (req, res) => {
    try {
        const { recipientPublicKey, amount } = req.body;
        const user = getUserById(req.user.userId);

        if (!user) return res.status(404).json({ error: 'User not found' });
        if (!recipientPublicKey || !amount) {
            return res.status(400).json({ error: 'Recipient and amount required' });
        }

        // Create transaction
        const tx = new Transaction(
            user.publicKey,
            recipientPublicKey,
            parseFloat(amount),
            'transfer'
        );

        // Sign transaction
        const privateKey = crypto.createPrivateKey(user.privateKey);
        tx.signTransaction(privateKey);

        // Add to blockchain
        blockchain.addTransaction(tx);

        // Save immediately (optional, but good for persistence)
        saveBlockchain(blockchain);

        res.json({
            success: true,
            transaction: tx,
            message: 'Transaction sent successfully'
        });
    } catch (error) {
        console.error('Send transaction error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Get transaction history
router.get('/transactions', verifyToken, (req, res) => {
    try {
        const user = getUserById(req.user.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

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

// Search users
router.get('/users/search', verifyToken, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json({ users: [] });

        const { searchUsers } = await import('../database/db.js');
        const users = searchUsers(q);
        res.json({ users });
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ error: 'Failed to search users' });
    }
});

// Get all users (limit to 50)
router.get('/users', verifyToken, async (req, res) => {
    try {
        const { getAllUsers } = await import('../database/db.js');
        const users = getAllUsers();
        res.json({ users: users.slice(0, 50) });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
});

export default router;

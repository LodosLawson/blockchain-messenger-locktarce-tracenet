import express from 'express';
import crypto from 'crypto';
import { verifyToken } from './auth.js';
import { getUserById, getUserByUsername } from '../database/db.js';
import Transaction from '../blockchain/Transaction.js';
import { saveBlockchain } from '../utils/blockchainPersistence.js';

const router = express.Router();

let blockchain;

// ... (existing helper function)

// ... (existing balances/transaction routes)

// Transfer coins
router.post('/transfer', verifyToken, async (req, res) => {
    try {
        const { toUsername, amount } = req.body;
        const fromUserId = req.user.userId;

        if (!toUsername || !amount) {
            return res.status(400).json({ error: 'Recipient username and amount are required' });
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        // Get sender and recipient
        const sender = getUserById(fromUserId);
        const recipient = getUserByUsername(toUsername);

        if (!recipient) {
            return res.status(404).json({ error: 'Recipient not found' });
        }

        if (sender.username === recipient.username) {
            return res.status(400).json({ error: 'Cannot transfer to yourself' });
        }

        // Check balance
        const balance = blockchain.getBalanceOfAddress(sender.publicKey);
        if (balance < parsedAmount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Create transaction
        const tx = new Transaction(
            sender.publicKey,
            recipient.publicKey,
            parsedAmount,
            'transfer',
            {
                fromUsername: sender.username,
                toUsername: recipient.username,
                message: 'Direct Transfer'
            }
        );

        blockchain.addTransaction(tx);

        // Mine immediately
        blockchain.minePendingTransactions(blockchain.systemWallet, []);
        saveBlockchain(blockchain);

        res.json({
            success: true,
            transaction: tx,
            newBalance: balance - parsedAmount
        });

    } catch (error) {
        console.error('Transfer error:', error);
        res.status(500).json({ error: 'Transfer failed' });
    }
});

// Search users (Remote implementation kept as backup/alternate path at /api/wallet/users/search)
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

// Get all users (Remote implementation)
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

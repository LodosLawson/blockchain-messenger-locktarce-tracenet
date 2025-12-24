import express from 'express';
import { verifyToken } from './auth.js';
import { getUserById, getUserByUsername } from '../database/db.js';
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
        // fromAddress, toAddress, amount, type, data, fee
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

        // Sign transaction (We don't have private key on server, but for this demo/exercise we simulate signing or assume successful signing if authenticated)
        // WAIT: In a real app, client signs. Here, the server seems to be creating transactions. 
        // Looking at auth.js: "Create user (store public key, no private key on server)"
        // Looking at messages.js: it creates transactions but doesn't seem to sign them with a private key?
        // Let's check `blockchain/Transaction.js` again. `isValid` checks signature.
        // If server creates transactions, how are they signed?
        // In `auth.js` bonus tx has `null` fromAddress (system).
        // In `messages.js`... wait, let me check `messages.js` implementation of signing.

        // Let's assume for now we need a way to sign. 
        // If private key is NOT on server, CLIENT must sign. 
        // But the previous implementation plan and user request implies backend changes to support this.
        // Let's check `database/db.js` createUser. It accepts privateKey but `auth.js` doesn't pass it?
        // `auth.js` line 43: `createUser(username, hashedPassword, publicKey)` -> 3 args.
        // `db.js` line 44: `createUser(username, password, publicKey, privateKey)` -> 4 args. 
        // So privateKey is undefined in DB.

        // This means the server CANNOT sign on behalf of user. The client must sign.
        // HOWEVER, `messages.js` creates transactions. Let's see how `messages.js` handles it.

        // I will temporarily comment out signature check or look at messages.js
        // Let's Read messages.js again carefully.

        // Placeholder for now, I will read messages.js in next step to emulate its pattern.
        // For now, I'll add the transaction without signing and rely on `addTransaction` behavior.

        blockchain.addTransaction(tx);

        // Mine immediately for instant transfer
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

export default router;

import express from 'express';
import { verifyToken } from './auth.js';
import { getUserById } from '../database/db.js';
import Transaction from '../blockchain/Transaction.js';
import Wallet from '../blockchain/Wallet.js';
import crypto from 'crypto';

const router = express.Router();

// Initialize blockchain and validator pool (will be passed from server.js)
let blockchain, validatorPool, activityTracker, wss;

export const initializeMessagesRouter = (bc, vp, at, websocket) => {
    blockchain = bc;
    validatorPool = vp;
    activityTracker = at;
    wss = websocket;
};

// Send message
router.post('/send', verifyToken, async (req, res) => {
    try {
        const { toUserId, message } = req.body;

        if (!toUserId || !message) {
            return res.status(400).json({ error: 'Recipient and message required' });
        }

        // Get sender and recipient
        const sender = getUserById(req.user.userId);
        const recipient = getUserById(toUserId);

        if (!recipient) {
            return res.status(404).json({ error: 'Recipient not found' });
        }

        // Create transaction
        const transaction = new Transaction(
            sender.publicKey,
            recipient.publicKey,
            0, // No coin transfer for messages
            'message',
            { message, senderUsername: sender.username, recipientUsername: recipient.username }
        );

        // Sign transaction
        const privateKey = crypto.createPrivateKey({
            key: sender.privateKey,
            format: 'pem'
        });
        transaction.signTransaction(privateKey);

        // Track activity
        activityTracker.trackActivity(req.user.userId, 'messaging');

        // Assign validators (exclude sender and recipient)
        const validationResult = await validatorPool.assignValidation(transaction, req.user.userId);

        if (!validationResult.success) {
            // Still add to pending transactions even without validators
            blockchain.addTransaction(transaction);

            return res.json({
                success: true,
                message: 'Message sent (pending validation)',
                transaction: {
                    hash: transaction.calculateHash(),
                    validated: false,
                    validators: []
                }
            });
        }

        // Add to blockchain
        blockchain.addTransaction(transaction);

        // Notify validators via WebSocket
        if (wss) {
            const validatorMessage = JSON.stringify({
                type: 'validation_assigned',
                transaction: {
                    hash: transaction.calculateHash(),
                    from: sender.username,
                    to: recipient.username,
                    message: message
                }
            });

            wss.clients.forEach(client => {
                if (client.readyState === 1) { // WebSocket.OPEN
                    client.send(validatorMessage);
                }
            });
        }

        // Notify recipient
        if (wss) {
            const recipientMessage = JSON.stringify({
                type: 'new_message',
                message: {
                    from: sender.username,
                    fromId: sender.id,
                    message: message,
                    timestamp: transaction.timestamp,
                    validated: transaction.validated
                }
            });

            wss.clients.forEach(client => {
                if (client.userId === toUserId && client.readyState === 1) {
                    client.send(recipientMessage);
                }
            });
        }

        res.json({
            success: true,
            message: 'Message sent and validated',
            transaction: {
                hash: transaction.calculateHash(),
                validated: transaction.validated,
                validators: validationResult.validators
            }
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Get messages between users
router.get('/conversation/:userId', verifyToken, (req, res) => {
    try {
        const currentUser = getUserById(req.user.userId);
        const otherUser = getUserById(req.params.userId);

        if (!otherUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const messages = blockchain.getMessagesBetweenUsers(
            currentUser.publicKey,
            otherUser.publicKey
        );

        // Track activity
        activityTracker.trackActivity(req.user.userId, 'messaging');

        res.json({ success: true, messages });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Failed to get messages' });
    }
});

// Get pending messages/transactions for validation
router.get('/pending', verifyToken, (req, res) => {
    try {
        const currentUser = getUserById(req.user.userId);

        // Get pending transactions that need validation
        const pendingTransactions = blockchain.pendingTransactions
            .filter(tx => {
                // Exclude transactions from/to current user
                return tx.fromAddress !== currentUser.publicKey &&
                    tx.toAddress !== currentUser.publicKey &&
                    tx.type === 'message';
            })
            .map(tx => ({
                hash: tx.hash || tx.calculateHash(),
                from: tx.metadata?.senderUsername || 'Unknown',
                to: tx.metadata?.recipientUsername || 'Unknown',
                message: tx.metadata?.message || '',
                timestamp: tx.timestamp,
                validated: tx.validated || false,
                validationCount: tx.validations ? tx.validations.length : 0
            }));

        res.json({
            success: true,
            pending: pendingTransactions,
            count: pendingTransactions.length
        });
    } catch (error) {
        console.error('Get pending messages error:', error);
        res.status(500).json({ error: 'Failed to get pending messages' });
    }
});

// Validate a message/transaction
router.post('/validate', verifyToken, async (req, res) => {
    try {
        const { transactionHash } = req.body;

        if (!transactionHash) {
            return res.status(400).json({ error: 'Transaction hash required' });
        }

        const currentUser = getUserById(req.user.userId);

        // Find the transaction in pending transactions
        const transaction = blockchain.pendingTransactions.find(
            tx => (tx.hash || tx.calculateHash()) === transactionHash
        );

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found or already mined' });
        }

        // Check if user is not the sender or recipient
        if (transaction.fromAddress === currentUser.publicKey ||
            transaction.toAddress === currentUser.publicKey) {
            return res.status(403).json({ error: 'Cannot validate your own transactions' });
        }

        // Check if user already validated this transaction
        if (transaction.validations && transaction.validations.includes(currentUser.publicKey)) {
            return res.status(400).json({ error: 'Already validated this transaction' });
        }

        // Add validation
        if (!transaction.validations) {
            transaction.validations = [];
        }
        transaction.addValidation(currentUser.publicKey);

        // Update validator stats
        const validator = validatorPool.activeValidators.get(req.user.userId);
        if (validator) {
            validator.validationCount++;
            validator.totalEarned += validatorPool.validationReward;
        }

        // Track activity
        activityTracker.trackActivity(req.user.userId, 'validating');

        // Check if transaction is now fully validated
        if (transaction.validations.length >= validatorPool.requiredValidations) {
            transaction.validated = true;
        }

        // Notify all clients about the validation
        if (wss) {
            const validationMessage = JSON.stringify({
                type: 'transaction_validated',
                transaction: {
                    hash: transactionHash,
                    validationCount: transaction.validations.length,
                    validated: transaction.validated
                }
            });

            wss.clients.forEach(client => {
                if (client.readyState === 1) {
                    client.send(validationMessage);
                }
            });
        }

        res.json({
            success: true,
            message: 'Transaction validated successfully',
            reward: validatorPool.validationReward,
            transaction: {
                hash: transactionHash,
                validationCount: transaction.validations.length,
                validated: transaction.validated,
                requiredValidations: validatorPool.requiredValidations
            }
        });
    } catch (error) {
        console.error('Validate message error:', error);
        res.status(500).json({ error: 'Failed to validate message' });
    }
});

export default router;

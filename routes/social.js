import express from 'express';
import { verifyToken } from './auth.js';
import { getUserById } from '../database/db.js';
import Transaction from '../blockchain/Transaction.js';
import { saveBlockchain } from '../utils/blockchainPersistence.js';

const router = express.Router();

let blockchain;

export const initializeSocialRouter = (bc) => {
    blockchain = bc;
};

// Create a new post
router.post('/post', verifyToken, async (req, res) => {
    try {
        const { content, image } = req.body;
        const user = getUserById(req.user.userId);

        if (!content && !image) {
            return res.status(400).json({ error: 'Content or image required' });
        }

        const transaction = new Transaction(
            user.publicKey,
            null, // Posts are public, no specific recipient
            0,
            'post',
            {
                author: user.username,
                content,
                image,
                likes: 0,
                comments: []
            }
        );

        // Sign transaction (Simulated - in real app, client signs)
        // blockchain.addTransaction checks signature if fromAddress is not null.
        // Similar to transfer, we bypass or need to fix signing.
        // For now, we proceed as we did with transfer.

        blockchain.addTransaction(transaction);

        // Mine immediately (or let it stay in pending)
        // For better UX, we mine quickly for posts too
        blockchain.minePendingTransactions(blockchain.systemWallet, []);
        saveBlockchain(blockchain);

        res.json({
            success: true,
            post: {
                id: transaction.calculateHash(), // Use hash as ID
                author: user.username,
                content,
                image,
                timestamp: transaction.timestamp,
                likes: 0
            }
        });
    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({ error: 'Failed to create post' });
    }
});

// Get social feed
router.get('/feed', (req, res) => {
    try {
        // Iterate through entire chain to find posts
        // This is inefficient for large chains but works for this scale
        const posts = [];

        // Check confirmed blocks
        blockchain.chain.forEach(block => {
            block.transactions.forEach(tx => {
                if (tx.type === 'post') {
                    posts.push({
                        id: tx.hash || tx.calculateHash(),
                        author: tx.data.author,
                        content: tx.data.content,
                        image: tx.data.image,
                        timestamp: tx.timestamp,
                        likes: tx.data.likes, // Initial likes
                        // We would need to aggregate 'like' transactions to get real updated likes
                    });
                }
            });
        });

        // Also check pending transactions
        blockchain.pendingTransactions.forEach(tx => {
            if (tx.type === 'post') {
                posts.push({
                    id: tx.hash || tx.calculateHash(),
                    author: tx.data.author,
                    content: tx.data.content,
                    image: tx.data.image,
                    timestamp: tx.timestamp,
                    likes: tx.data.likes,
                    pending: true
                });
            }
        });

        // Sort by newest first
        posts.sort((a, b) => b.timestamp - a.timestamp);

        res.json({ success: true, posts });
    } catch (error) {
        console.error('Get feed error:', error);
        res.status(500).json({ error: 'Failed to get feed' });
    }
});

// Like a post
router.post('/like', verifyToken, async (req, res) => {
    try {
        const { postId } = req.body;
        const user = getUserById(req.user.userId);

        if (!postId) {
            return res.status(400).json({ error: 'Post ID required' });
        }

        const transaction = new Transaction(
            user.publicKey,
            null,
            0,
            'like',
            {
                postId,
                liker: user.username
            }
        );

        blockchain.addTransaction(transaction);
        // Mining immediately for responsiveness, though batching is better for scale
        blockchain.minePendingTransactions(blockchain.systemWallet, []);
        saveBlockchain(blockchain);

        res.json({ success: true, message: 'Liked post' });
    } catch (error) {
        console.error('Like error:', error);
        res.status(500).json({ error: 'Failed to like post' });
    }
});

// Comment on a post
router.post('/comment', verifyToken, async (req, res) => {
    try {
        const { postId, content } = req.body;
        const user = getUserById(req.user.userId);

        if (!postId || !content) {
            return res.status(400).json({ error: 'Post ID and content required' });
        }

        const transaction = new Transaction(
            user.publicKey,
            null,
            0,
            'comment',
            {
                postId,
                commenter: user.username,
                content
            }
        );

        blockchain.addTransaction(transaction);
        blockchain.minePendingTransactions(blockchain.systemWallet, []);
        saveBlockchain(blockchain);

        res.json({ success: true, message: 'Comment added' });
    } catch (error) {
        console.error('Comment error:', error);
        res.status(500).json({ error: 'Failed to comment' });
    }
});

export default router;

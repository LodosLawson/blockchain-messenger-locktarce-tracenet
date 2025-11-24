import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = 'your-secret-key-change-in-production';

// Initialize blockchain reference (will be passed from server.js)
let blockchain, validatorPool;

export function initializeBlockchainRouter(bc, vp) {
    blockchain = bc;
    validatorPool = vp;
}

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Get blockchain statistics
router.get('/stats', authenticateToken, (req, res) => {
    try {
        const stats = {
            chainLength: blockchain.chain.length,
            pendingTransactions: blockchain.pendingTransactions.length,
            difficulty: blockchain.difficulty,
            miningReward: blockchain.miningReward,
            validationReward: blockchain.validationReward,
            circulatingSupply: blockchain.getCirculatingSupply(),
            maxSupply: blockchain.MAX_SUPPLY,
            isValid: blockchain.isChainValid(),
            latestBlock: {
                index: blockchain.getLatestBlock().index,
                timestamp: blockchain.getLatestBlock().timestamp,
                hash: blockchain.getLatestBlock().hash,
                transactionCount: blockchain.getLatestBlock().transactions.length
            }
        };

        res.json(stats);
    } catch (error) {
        console.error('Error getting blockchain stats:', error);
        res.status(500).json({ error: 'Failed to get blockchain stats' });
    }
});

// Get recent blocks with pagination
router.get('/blocks', authenticateToken, (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        const blocks = blockchain.chain
            .slice()
            .reverse()
            .slice(offset, offset + limit)
            .map(block => ({
                index: block.index,
                timestamp: block.timestamp,
                hash: block.hash,
                previousHash: block.previousHash,
                nonce: block.nonce,
                transactionCount: block.transactions.length,
                transactions: block.transactions.map(tx => ({
                    hash: tx.hash,
                    from: tx.fromAddress,
                    to: tx.toAddress,
                    amount: tx.amount,
                    type: tx.type,
                    timestamp: tx.timestamp
                }))
            }));

        res.json({
            blocks,
            total: blockchain.chain.length,
            limit,
            offset
        });
    } catch (error) {
        console.error('Error getting blocks:', error);
        res.status(500).json({ error: 'Failed to get blocks' });
    }
});

// Get specific block by index
router.get('/blocks/:index', authenticateToken, (req, res) => {
    try {
        const index = parseInt(req.params.index);

        if (index < 0 || index >= blockchain.chain.length) {
            return res.status(404).json({ error: 'Block not found' });
        }

        const block = blockchain.chain[index];

        res.json({
            index: block.index,
            timestamp: block.timestamp,
            hash: block.hash,
            previousHash: block.previousHash,
            nonce: block.nonce,
            difficulty: blockchain.difficulty,
            transactions: block.transactions.map(tx => ({
                hash: tx.hash,
                from: tx.fromAddress,
                to: tx.toAddress,
                amount: tx.amount,
                type: tx.type,
                message: tx.message,
                timestamp: tx.timestamp,
                signature: tx.signature
            }))
        });
    } catch (error) {
        console.error('Error getting block:', error);
        res.status(500).json({ error: 'Failed to get block' });
    }
});

// Get recent transactions
router.get('/transactions/recent', authenticateToken, (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;

        const allTransactions = [];

        // Get transactions from all blocks (excluding genesis)
        for (let i = blockchain.chain.length - 1; i > 0; i--) {
            const block = blockchain.chain[i];
            block.transactions.forEach(tx => {
                allTransactions.push({
                    hash: tx.hash,
                    from: tx.fromAddress,
                    to: tx.toAddress,
                    amount: tx.amount,
                    type: tx.type,
                    message: tx.message,
                    timestamp: tx.timestamp,
                    blockIndex: block.index,
                    blockHash: block.hash
                });
            });

            if (allTransactions.length >= limit) break;
        }

        res.json({
            transactions: allTransactions.slice(0, limit),
            total: allTransactions.length
        });
    } catch (error) {
        console.error('Error getting recent transactions:', error);
        res.status(500).json({ error: 'Failed to get recent transactions' });
    }
});

// Get pending transactions
router.get('/transactions/pending', authenticateToken, (req, res) => {
    try {
        const pending = blockchain.pendingTransactions.map(tx => ({
            hash: tx.hash,
            from: tx.fromAddress,
            to: tx.toAddress,
            amount: tx.amount,
            type: tx.type,
            message: tx.message,
            timestamp: tx.timestamp
        }));

        res.json({
            transactions: pending,
            count: pending.length
        });
    } catch (error) {
        console.error('Error getting pending transactions:', error);
        res.status(500).json({ error: 'Failed to get pending transactions' });
    }
});

// Get online validators
router.get('/validators/online', authenticateToken, (req, res) => {
    try {
        const validators = validatorPool.getActiveValidators();

        const validatorList = validators.map(validatorId => {
            const stats = validatorPool.getValidatorStats(validatorId);
            return {
                userId: validatorId,
                validationCount: stats?.validationCount || 0,
                totalEarned: stats?.totalEarned || 0,
                isActive: true
            };
        });

        res.json({
            validators: validatorList,
            count: validatorList.length
        });
    } catch (error) {
        console.error('Error getting online validators:', error);
        res.status(500).json({ error: 'Failed to get online validators' });
    }
});

// Search transactions by hash
router.get('/transactions/search/:hash', authenticateToken, (req, res) => {
    try {
        const hash = req.params.hash;
        const transaction = blockchain.getTransactionById(hash);

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.json(transaction);
    } catch (error) {
        console.error('Error searching transaction:', error);
        res.status(500).json({ error: 'Failed to search transaction' });
    }
});

export default router;

import express from 'express';

const router = express.Router();
let blockchain = null;
let validatorPool = null;

export function initializeBlockchainRouter(chain, pool) {
    blockchain = chain;
    validatorPool = pool;
}

// Get blockchain statistics
router.get('/stats', (req, res) => {
    if (!blockchain) return res.status(503).json({ error: 'Blockchain not initialized' });

    res.json({
        chainLength: blockchain.chain.length,
        pendingTransactions: blockchain.pendingTransactions.length,
        circulatingSupply: blockchain.getCirculatingSupply(),
        maxSupply: blockchain.MAX_SUPPLY,
        isValid: blockchain.isChainValid()
    });
});

// Get recent blocks
router.get('/blocks', (req, res) => {
    if (!blockchain) return res.status(503).json({ error: 'Blockchain not initialized' });

    const limit = parseInt(req.query.limit) || 10;
    const blocks = blockchain.chain.slice(-limit).reverse();

    res.json({ blocks });
});

// Get recent transactions
router.get('/transactions/recent', (req, res) => {
    if (!blockchain) return res.status(503).json({ error: 'Blockchain not initialized' });

    const limit = parseInt(req.query.limit) || 10;
    let transactions = [];

    // Collect transactions from recent blocks
    for (let i = blockchain.chain.length - 1; i >= 0 && transactions.length < limit; i--) {
        const block = blockchain.chain[i];
        transactions = transactions.concat(block.transactions);
    }

    // Add pending transactions
    transactions = transactions.concat(blockchain.pendingTransactions);

    // Sort by timestamp (newest first) and limit
    transactions.sort((a, b) => b.timestamp - a.timestamp);
    transactions = transactions.slice(0, limit);

    res.json({ transactions });
});

// Get online validators
router.get('/validators/online', (req, res) => {
    if (!validatorPool) return res.status(503).json({ error: 'Validator pool not initialized' });

    const validators = validatorPool.getActiveValidatorsWithDetails();
    res.json({ validators });
});

// Mine pending transactions (for testing/demo)
router.post('/mine', (req, res) => {
    if (!blockchain) return res.status(503).json({ error: 'Blockchain not initialized' });

    try {
        blockchain.minePendingTransactions(blockchain.systemWallet, []);
        res.json({
            success: true,
            message: 'Block mined successfully',
            blockIndex: blockchain.chain.length - 1
        });
    } catch (error) {
        console.error('Mining error:', error);
        res.status(500).json({ error: 'Mining failed' });
    }
});

export default router;

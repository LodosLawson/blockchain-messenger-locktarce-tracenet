import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createUser, getUserByUsername } from '../database/db.js';
import Transaction from '../blockchain/Transaction.js';
import { saveBlockchain } from '../utils/blockchainPersistence.js';

const router = express.Router();
const JWT_SECRET = 'your-secret-key-change-in-production';

// Will be initialized by server
let blockchain, marketCapTracker;

export const initializeAuthRouter = (bc, mct) => {
    blockchain = bc;
    marketCapTracker = mct;
};

// Register
router.post('/register', async (req, res) => {
    try {
        const { username, password, publicKey } = req.body;

        if (!username || !password || !publicKey) {
            return res.status(400).json({ error: 'Username, password, and public key required' });
        }

        // Check if user exists
        const existingUser = getUserByUsername(username);
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Check if we can mint more coins
        if (blockchain && !blockchain.canMintCoins(blockchain.INITIAL_USER_BONUS)) {
            return res.status(400).json({ error: 'Maximum supply reached, cannot create new users' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user (store public key, no private key on server)
        const userId = createUser(username, hashedPassword, publicKey);

        // Give initial bonus and mine a block immediately
        if (blockchain) {
            const bonusTx = new Transaction(
                null,
                publicKey,
                blockchain.INITIAL_USER_BONUS,
                'reward',
                { reason: 'initial_bonus', username }
            );

            blockchain.addTransaction(bonusTx);

            // Mine a block immediately to save the bonus transaction to the blockchain
            blockchain.minePendingTransactions(blockchain.systemWallet, []);

            // Save blockchain to disk
            saveBlockchain(blockchain);

            marketCapTracker.onUserJoin(blockchain.INITIAL_USER_BONUS);

            console.log(`💰 Initial bonus of ${blockchain.INITIAL_USER_BONUS} coins given to ${username} and saved to blockchain`);
        }

        // Generate token
        const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            success: true,
            token,
            user: {
                id: userId,
                username,
                publicKey
            },
            initialBonus: blockchain ? blockchain.INITIAL_USER_BONUS : 3
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        // Get user
        const user = getUserByUsername(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                publicKey: user.publicKey
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Verify token middleware
export const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

export default router;

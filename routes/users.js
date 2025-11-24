import express from 'express';
import { getAllUsers, searchUsers, getUserById } from '../database/db.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// Get all users
router.get('/', verifyToken, (req, res) => {
    try {
        const users = getAllUsers();
        res.json({ success: true, users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
});

// Search users
router.get('/search', verifyToken, (req, res) => {
    try {
        const { q } = req.query;

        if (!q) {
            return res.json({ success: true, users: getAllUsers() });
        }

        const users = searchUsers(q);
        res.json({ success: true, users });
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ error: 'Failed to search users' });
    }
});

// Get user by ID
router.get('/:id', verifyToken, (req, res) => {
    try {
        const user = getUserById(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                publicKey: user.publicKey,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

export default router;

import express from 'express';
import { verifyToken } from './auth.js';
import { getUserById } from '../database/db.js';

const router = express.Router();

let validatorPool, activityTracker;

export const initializeValidationRouter = (vp, at) => {
    validatorPool = vp;
    activityTracker = at;
};

// Get validator status
router.get('/status', verifyToken, (req, res) => {
    try {
        const user = getUserById(req.user.userId);
        const stats = validatorPool.getValidatorStats(req.user.userId);
        const isActive = activityTracker.isUserActive(req.user.userId);

        res.json({
            success: true,
            isValidator: stats !== null,
            isActive,
            stats: stats || { validationCount: 0, totalEarned: 0 }
        });
    } catch (error) {
        console.error('Get validator status error:', error);
        res.status(500).json({ error: 'Failed to get validator status' });
    }
});

// Get all validators
router.get('/all', verifyToken, (req, res) => {
    try {
        const validators = validatorPool.getAllValidatorStats();
        res.json({ success: true, validators });
    } catch (error) {
        console.error('Get validators error:', error);
        res.status(500).json({ error: 'Failed to get validators' });
    }
});

// Track activity (heartbeat)
router.post('/heartbeat', verifyToken, (req, res) => {
    try {
        const { activityType } = req.body;
        activityTracker.trackActivity(req.user.userId, activityType || 'browsing');

        res.json({ success: true, message: 'Activity tracked' });
    } catch (error) {
        console.error('Heartbeat error:', error);
        res.status(500).json({ error: 'Failed to track activity' });
    }
});

export default router;

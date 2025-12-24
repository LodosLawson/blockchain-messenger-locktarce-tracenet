import express from 'express';
import P2PService from '../network/P2PService.js';

const router = express.Router();
let p2pService;

export const initializeNetworkRouter = (p2p) => {
    p2pService = p2p;
};

// Connect to a new peer
router.post('/peers', (req, res) => {
    const { peer } = req.body;
    if (peer) {
        p2pService.connectToPeers([peer]);
        res.json({ success: true, message: `Connected to ${peer}` });
    } else {
        res.status(400).json({ error: 'Peer URL required' });
    }
});

// Get connected peers
router.get('/peers', (req, res) => {
    res.json(p2pService.getPeers());
});

export default router;

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = process.env.NODE_ENV === 'production'
    ? '/tmp/data'
    : path.join(__dirname, '../data');

const PEERS_FILE = path.join(dataDir, 'known_peers.json');
const PEER_HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const PEER_TIMEOUT = 60000; // 1 minute
const MAX_FAILED_ATTEMPTS = 3;

/**
 * Manages peer connections, health monitoring, and discovery
 */
class PeerManager {
    constructor() {
        this.peers = new Map(); // url -> { url, status, lastSeen, reputation, failedAttempts }
        this.healthCheckTimer = null;
        this.loadKnownPeers();
    }

    /**
     * Load known peers from disk
     */
    loadKnownPeers() {
        try {
            if (fs.existsSync(PEERS_FILE)) {
                const data = JSON.parse(fs.readFileSync(PEERS_FILE, 'utf8'));
                data.peers.forEach(peerUrl => {
                    this.addPeer(peerUrl);
                });
                console.log(`📋 Loaded ${this.peers.size} known peers`);
            }
        } catch (error) {
            console.error('⚠️ Error loading known peers:', error);
        }
    }

    /**
     * Save known peers to disk
     */
    saveKnownPeers() {
        try {
            const peerUrls = Array.from(this.peers.keys());
            fs.writeFileSync(PEERS_FILE, JSON.stringify({ peers: peerUrls }, null, 2));
        } catch (error) {
            console.error('⚠️ Error saving known peers:', error);
        }
    }

    /**
     * Add a new peer
     */
    addPeer(url, status = 'unknown') {
        if (!this.peers.has(url)) {
            this.peers.set(url, {
                url,
                status,
                lastSeen: Date.now(),
                reputation: 100, // Start with perfect reputation
                failedAttempts: 0
            });
            this.saveKnownPeers();
            console.log(`➕ Added peer: ${url}`);
        }
    }

    /**
     * Remove a peer
     */
    removePeer(url) {
        if (this.peers.delete(url)) {
            this.saveKnownPeers();
            console.log(`➖ Removed peer: ${url}`);
        }
    }

    /**
     * Update peer status
     */
    updatePeerStatus(url, status) {
        const peer = this.peers.get(url);
        if (peer) {
            peer.status = status;
            peer.lastSeen = Date.now();

            if (status === 'connected') {
                peer.failedAttempts = 0;
                peer.reputation = Math.min(100, peer.reputation + 5); // Improve reputation
            } else if (status === 'failed') {
                peer.failedAttempts++;
                peer.reputation = Math.max(0, peer.reputation - 10); // Decrease reputation

                // Remove peer if too many failures
                if (peer.failedAttempts >= MAX_FAILED_ATTEMPTS) {
                    console.log(`❌ Peer ${url} exceeded max failed attempts. Removing.`);
                    this.removePeer(url);
                }
            }
        }
    }

    /**
     * Get all active peers
     */
    getActivePeers() {
        const now = Date.now();
        return Array.from(this.peers.values())
            .filter(peer =>
                peer.status === 'connected' &&
                (now - peer.lastSeen < PEER_TIMEOUT)
            );
    }

    /**
     * Get all peers sorted by reputation
     */
    getPeersByReputation() {
        return Array.from(this.peers.values())
            .sort((a, b) => b.reputation - a.reputation);
    }

    /**
     * Start health check monitoring
     */
    startHealthCheck(checkCallback) {
        this.healthCheckTimer = setInterval(() => {
            const now = Date.now();
            this.peers.forEach((peer, url) => {
                if (now - peer.lastSeen > PEER_TIMEOUT) {
                    console.log(`⚠️ Peer ${url} timed out`);
                    this.updatePeerStatus(url, 'timeout');

                    // Attempt reconnection if reputation is still good
                    if (peer.reputation > 50 && checkCallback) {
                        checkCallback(url);
                    }
                }
            });
        }, PEER_HEALTH_CHECK_INTERVAL);

        console.log('💓 Peer health check started');
    }

    /**
     * Stop health check monitoring
     */
    stopHealthCheck() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
            console.log('💓 Peer health check stopped');
        }
    }

    /**
     * Get peer statistics
     */
    getStats() {
        const active = this.getActivePeers().length;
        const total = this.peers.size;
        const avgReputation = Array.from(this.peers.values())
            .reduce((sum, peer) => sum + peer.reputation, 0) / total || 0;

        return {
            activePeers: active,
            totalPeers: total,
            averageReputation: Math.round(avgReputation)
        };
    }
}

export default PeerManager;

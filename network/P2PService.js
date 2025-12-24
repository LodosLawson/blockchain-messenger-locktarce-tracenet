import { WebSocket, WebSocketServer } from 'ws';
import crypto from 'crypto';
import { reconstructBlock, reconstructTransaction } from '../utils/blockchainPersistence.js';
import PeerManager from './PeerManager.js';

const MESSAGE_TYPES = {
    CHAIN: 'CHAIN',
    TRANSACTION: 'TRANSACTION',
    REQUEST_CHAIN: 'REQUEST_CHAIN',
    NEW_BLOCK: 'NEW_BLOCK',
    PEER_DISCOVERY: 'PEER_DISCOVERY',
    HEARTBEAT: 'HEARTBEAT'
};

const CONSENSUS_TIMEOUT = 5000; // Wait 5 seconds for consensus responses
const RECONNECT_INTERVAL = 30000; // Try to reconnect every 30 seconds

class P2PService {
    constructor(blockchain) {
        this.blockchain = blockchain;
        this.sockets = new Map(); // url -> socket
        this.peerManager = new PeerManager();
        this.consensusMode = false;
        this.receivedChains = [];
        this.reconnectTimer = null;
    }

    listen(port) {
        const server = new WebSocketServer({ port });
        server.on('connection', (socket) => this.connectSocket(socket));
        console.log(`📡 P2P Server listening on port ${port}`);

        // Start peer health monitoring
        this.peerManager.startHealthCheck((peerUrl) => {
            this.reconnectToPeer(peerUrl);
        });

        // Start periodic peer discovery
        this.startPeerDiscovery();
    }

    connectToPeers(peers) {
        peers.forEach(peer => {
            if (!this.sockets.has(peer)) {
                this.connectToPeer(peer);
            }
        });
    }

    connectToPeer(peerUrl) {
        try {
            const socket = new WebSocket(peerUrl);

            socket.on('open', () => {
                console.log(`✅ Connected to peer: ${peerUrl}`);
                this.peerManager.addPeer(peerUrl, 'connected');
                this.peerManager.updatePeerStatus(peerUrl, 'connected');
                this.connectSocket(socket, peerUrl);
            });

            socket.on('error', (error) => {
                console.error(`❌ Connection failed to ${peerUrl}:`, error.message);
                this.peerManager.updatePeerStatus(peerUrl, 'failed');
            });

            socket.on('close', () => {
                console.log(`🔌 Disconnected from ${peerUrl}`);
                this.sockets.delete(peerUrl);
                this.peerManager.updatePeerStatus(peerUrl, 'disconnected');
            });
        } catch (error) {
            console.error(`❌ Error connecting to ${peerUrl}:`, error);
            this.peerManager.updatePeerStatus(peerUrl, 'failed');
        }
    }

    reconnectToPeer(peerUrl) {
        console.log(`🔄 Attempting to reconnect to ${peerUrl}`);
        this.connectToPeer(peerUrl);
    }

    connectSocket(socket, peerUrl = null) {
        if (peerUrl) {
            this.sockets.set(peerUrl, socket);
        }
        console.log('🤝 Socket connected');
        this.messageHandler(socket, peerUrl);

        // Send our chain to the new peer
        this.sendChain(socket);

        // Send heartbeat
        this.sendHeartbeat(socket);
    }

    /**
     * Request blockchain consensus from all peers
     */
    async requestConsensus() {
        console.log('🗳️  Requesting blockchain consensus from peers...');
        this.consensusMode = true;
        this.receivedChains = [];

        // Request chains from all connected peers
        this.broadcast(JSON.stringify({ type: MESSAGE_TYPES.REQUEST_CHAIN }));

        // Wait for responses
        return new Promise((resolve) => {
            setTimeout(() => {
                this.consensusMode = false;
                const bestChain = this.selectBestChain();
                resolve(bestChain);
            }, CONSENSUS_TIMEOUT);
        });
    }

    /**
     * Select the best chain from received chains (longest valid chain)
     */
    selectBestChain() {
        if (this.receivedChains.length === 0) {
            console.log('ℹ️  No chains received from peers');
            return null;
        }

        // Filter valid chains and sort by length (longest first)
        const validChains = this.receivedChains
            .filter(chainData => {
                try {
                    const chain = chainData.chain.map(reconstructBlock);
                    return this.blockchain.isValidChain(chain);
                } catch (error) {
                    console.error('Invalid chain received:', error);
                    return false;
                }
            })
            .sort((a, b) => b.chain.length - a.chain.length);

        if (validChains.length === 0) {
            console.log('⚠️ No valid chains received');
            return null;
        }

        const bestChain = validChains[0].chain.map(reconstructBlock);
        console.log(`✅ Selected chain with ${bestChain.length} blocks from consensus`);
        return bestChain;
    }

    /**
     * Start peer discovery mechanism
     */
    startPeerDiscovery() {
        setInterval(() => {
            this.broadcast(JSON.stringify({
                type: MESSAGE_TYPES.PEER_DISCOVERY,
                knownPeers: Array.from(this.sockets.keys())
            }));
        }, 60000); // Every minute
    }

    /**
     * Send heartbeat to peers
     */
    sendHeartbeat(socket) {
        const heartbeat = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: MESSAGE_TYPES.HEARTBEAT }));
            } else {
                clearInterval(heartbeat);
            }
        }, 30000); // Every 30 seconds
    }

    messageHandler(socket, peerUrl) {
        socket.on('message', (message) => {
            try {
                const data = JSON.parse(message);

                // Update peer last seen time
                if (peerUrl) {
                    this.peerManager.updatePeerStatus(peerUrl, 'connected');
                }

                switch (data.type) {
                    case MESSAGE_TYPES.CHAIN:
                        if (this.consensusMode) {
                            this.receivedChains.push({ chain: data.chain, from: peerUrl });
                        } else {
                            this.handleChainResponse(data.chain);
                        }
                        break;
                    case MESSAGE_TYPES.TRANSACTION:
                        this.handleTransaction(data.transaction);
                        break;
                    case MESSAGE_TYPES.REQUEST_CHAIN:
                        this.sendChain(socket);
                        break;
                    case MESSAGE_TYPES.NEW_BLOCK:
                        this.handleNewBlock(data.block);
                        break;
                    case MESSAGE_TYPES.PEER_DISCOVERY:
                        this.handlePeerDiscovery(data.knownPeers);
                        break;
                    case MESSAGE_TYPES.HEARTBEAT:
                        // Heartbeat received, peer is alive
                        if (peerUrl) {
                            this.peerManager.updatePeerStatus(peerUrl, 'connected');
                        }
                        break;
                }
            } catch (error) {
                console.error('❌ P2P Message Error:', error);
            }
        });
    }

    sendChain(socket) {
        socket.send(JSON.stringify({
            type: MESSAGE_TYPES.CHAIN,
            chain: this.blockchain.chain
        }));
    }

    broadcastChain() {
        this.sockets.forEach(socket => this.sendChain(socket));
    }

    broadcastTransaction(transaction) {
        this.sockets.forEach(socket => {
            socket.send(JSON.stringify({
                type: MESSAGE_TYPES.TRANSACTION,
                transaction
            }));
        });
    }

    broadcastBlock(block) {
        this.sockets.forEach(socket => {
            socket.send(JSON.stringify({
                type: MESSAGE_TYPES.NEW_BLOCK,
                block
            }));
        });
    }

    handleChainResponse(receivedChain) {
        // Reconstruct chain
        const reconstructedChain = receivedChain.map(reconstructBlock);

        if (reconstructedChain.length > this.blockchain.chain.length) {
            console.log('📥 Received longer chain. Replacing current chain...');
            this.blockchain.replaceChain(reconstructedChain);
        } else {
            console.log('✅ Current chain is up to date or longer.');
        }
    }

    handleTransaction(transactionData) {
        const transaction = reconstructTransaction(transactionData);

        // Check if transaction already exists to avoid infinite loops
        const exists = this.blockchain.pendingTransactions.find(
            tx => tx.calculateHash() === transaction.hash
        );

        if (!exists) {
            console.log('📥 Received new transaction via P2P');
            try {
                this.blockchain.addTransaction(transaction);
                // Re-broadcast to other peers
                this.broadcastTransaction(transaction);
            } catch (error) {
                console.error('Invalid P2P transaction:', error.message);
            }
        }
    }

    handleNewBlock(blockData) {
        const block = reconstructBlock(blockData);
        const lastBlock = this.blockchain.getLatestBlock();

        if (block.previousHash === lastBlock.hash) {
            console.log('📥 Received new valid block via P2P');
            this.blockchain.chain.push(block);
            this.blockchain.pendingTransactions = []; // Clear pending
            // Trigger save
            if (this.blockchain.onSave) this.blockchain.onSave(this.blockchain);

            // Re-broadcast
            this.broadcastBlock(block);
        } else if (block.timestamp > lastBlock.timestamp) {
            // If we are far behind, request full chain
            console.log('📥 Received block from future/fork. Requesting full chain...');
            this.broadcast(JSON.stringify({ type: MESSAGE_TYPES.REQUEST_CHAIN }));
        }
    }

    broadcast(message) {
        this.sockets.forEach(socket => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(message);
            }
        });
    }

    /**
     * Handle peer discovery messages
     */
    handlePeerDiscovery(knownPeers) {
        knownPeers.forEach(peerUrl => {
            if (!this.sockets.has(peerUrl)) {
                console.log(`🔍 Discovered new peer: ${peerUrl}`);
                this.peerManager.addPeer(peerUrl);
                // Optionally connect to new discovered peer
                // this.connectToPeer(peerUrl);
            }
        });
    }

    /**
     * Get list of connected peers
     */
    getPeers() {
        return {
            connected: Array.from(this.sockets.keys()),
            stats: this.peerManager.getStats()
        };
    }

    /**
     * Shutdown P2P service
     */
    shutdown() {
        console.log('🛑 Shutting down P2P service...');
        this.peerManager.stopHealthCheck();

        // Close all connections
        this.sockets.forEach((socket, url) => {
            socket.close();
        });

        this.sockets.clear();
        console.log('✅ P2P service shutdown complete');
    }
}

export default P2PService;

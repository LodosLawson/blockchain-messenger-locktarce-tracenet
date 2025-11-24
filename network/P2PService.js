import { WebSocket, WebSocketServer } from 'ws';
import { reconstructBlock, reconstructTransaction } from '../utils/blockchainPersistence.js';

const MESSAGE_TYPES = {
    CHAIN: 'CHAIN',
    TRANSACTION: 'TRANSACTION',
    REQUEST_CHAIN: 'REQUEST_CHAIN',
    NEW_BLOCK: 'NEW_BLOCK'
};

class P2PService {
    constructor(blockchain) {
        this.blockchain = blockchain;
        this.sockets = [];
        this.peers = []; // List of peer URLs
    }

    listen(port) {
        const server = new WebSocketServer({ port });
        server.on('connection', (socket) => this.connectSocket(socket));
        console.log(`📡 P2P Server listening on port ${port}`);
    }

    connectToPeers(peers) {
        peers.forEach(peer => {
            if (!this.peers.includes(peer)) {
                const socket = new WebSocket(peer);
                socket.on('open', () => this.connectSocket(socket));
                socket.on('error', () => console.error(`❌ Connection failed to ${peer}`));
                this.peers.push(peer);
            }
        });
    }

    connectSocket(socket) {
        this.sockets.push(socket);
        console.log('🤝 Socket connected');
        this.messageHandler(socket);

        // Send our chain to the new peer
        this.sendChain(socket);
    }

    messageHandler(socket) {
        socket.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                switch (data.type) {
                    case MESSAGE_TYPES.CHAIN:
                        this.handleChainResponse(data.chain);
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
                }
            } catch (error) {
                console.error('❌ P2P Message Error:', error);
            }
        });

        socket.on('close', () => {
            this.sockets = this.sockets.filter(s => s !== socket);
            console.log('🔌 Socket disconnected');
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
        this.sockets.forEach(socket => socket.send(message));
    }
}

export default P2PService;

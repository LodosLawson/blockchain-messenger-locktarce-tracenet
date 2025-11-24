import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Block from '../blockchain/Block.js';
import Transaction from '../blockchain/Transaction.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BLOCKCHAIN_FILE = process.env.BLOCKCHAIN_FILE || path.join(__dirname, '../data/blockchain.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

export function reconstructTransaction(txData) {
    const tx = new Transaction(
        txData.fromAddress,
        txData.toAddress,
        txData.amount,
        txData.type,
        txData.data
    );
    tx.timestamp = txData.timestamp;
    tx.signature = txData.signature;
    tx.validated = txData.validated;
    tx.validations = txData.validations || [];
    tx.fee = txData.fee;
    return tx;
}

export function reconstructBlock(blockData) {
    const transactions = blockData.transactions.map(reconstructTransaction);
    const block = new Block(
        blockData.timestamp,
        transactions,
        blockData.previousHash
    );
    block.nonce = blockData.nonce;
    block.hash = blockData.hash;
    return block;
}

export function verifyBlockchainIntegrity(blockchain) {
    if (!blockchain.isChainValid()) {
        console.error('❌ Blockchain integrity check failed!');
        return false;
    }
    console.log('✅ Blockchain integrity verified');
    return true;
}

export function saveBlockchain(blockchain) {
    try {
        const data = {
            chain: blockchain.chain,
            difficulty: blockchain.difficulty,
            miningReward: blockchain.miningReward,
            validationReward: blockchain.validationReward,
            requiredValidations: blockchain.requiredValidations,
            MAX_SUPPLY: blockchain.MAX_SUPPLY,
            INITIAL_USER_BONUS: blockchain.INITIAL_USER_BONUS,
            systemWallet: blockchain.systemWallet,
            pendingTransactions: blockchain.pendingTransactions
        };

        // Write to a temporary file first to prevent corruption
        const tempFile = `${BLOCKCHAIN_FILE}.tmp`;
        fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
        fs.renameSync(tempFile, BLOCKCHAIN_FILE);

        console.log('✅ Blockchain saved to disk');
    } catch (error) {
        console.error('Error saving blockchain:', error);
    }
}

export function loadBlockchain() {
    try {
        if (fs.existsSync(BLOCKCHAIN_FILE)) {
            const data = JSON.parse(fs.readFileSync(BLOCKCHAIN_FILE, 'utf8'));

            // Reconstruct chain
            if (data.chain) {
                data.chain = data.chain.map(reconstructBlock);
            }

            // Reconstruct pending transactions
            if (data.pendingTransactions) {
                data.pendingTransactions = data.pendingTransactions.map(reconstructTransaction);
            }

            console.log(`📂 Blockchain loaded from disk (${data.chain ? data.chain.length : 0} blocks)`);
            return data;
        }
    } catch (error) {
        console.error('Error loading blockchain:', error);
    }
    return null;
}

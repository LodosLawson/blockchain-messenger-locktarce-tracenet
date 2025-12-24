import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import Block from '../blockchain/Block.js';
import Transaction from '../blockchain/Transaction.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = process.env.NODE_ENV === 'production'
    ? '/tmp/data'
    : path.join(__dirname, '../data');

const backupDir = path.join(dataDir, 'backups');

// Configuration
const MAX_BACKUPS = 5; // Keep last 5 backup versions
const BLOCKCHAIN_FILE = process.env.BLOCKCHAIN_FILE || path.join(dataDir, 'blockchain.json');

/**
 * Initialize persistence directories
 */
export const initializePersistence = () => {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    console.log('✅ Persistence directories initialized');
};

// Initialize on module load
if (!fs.existsSync(dataDir)) {
    try {
        fs.mkdirSync(dataDir, { recursive: true });
    } catch (error) {
        console.error('❌ Failed to create data directory:', error);
    }
}
if (!fs.existsSync(backupDir)) {
    try {
        fs.mkdirSync(backupDir, { recursive: true });
    } catch (error) {
        console.error('❌ Failed to create backup directory:', error);
    }
}

/**
 * Calculate SHA-256 checksum of data
 */
function calculateChecksum(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Verify checksum of saved data
 */
function verifyChecksum(data, expectedChecksum) {
    const actualChecksum = calculateChecksum(data);
    return actualChecksum === expectedChecksum;
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

/**
 * Create a backup of the blockchain with timestamp
 */
function createBackup() {
    try {
        if (fs.existsSync(BLOCKCHAIN_FILE)) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(backupDir, `blockchain_${timestamp}.json`);
            fs.copyFileSync(BLOCKCHAIN_FILE, backupFile);
            console.log(`📦 Backup created: ${path.basename(backupFile)}`);

            // Rotate old backups (keep only last MAX_BACKUPS)
            rotateBackups();
        }
    } catch (error) {
        console.error('⚠️ Failed to create backup:', error);
    }
}

/**
 * Rotate backups - keep only the last MAX_BACKUPS versions
 */
function rotateBackups() {
    try {
        const backups = fs.readdirSync(backupDir)
            .filter(file => file.startsWith('blockchain_') && file.endsWith('.json'))
            .map(file => ({
                name: file,
                path: path.join(backupDir, file),
                time: fs.statSync(path.join(backupDir, file)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time); // Sort by newest first

        // Delete old backups
        if (backups.length > MAX_BACKUPS) {
            backups.slice(MAX_BACKUPS).forEach(backup => {
                fs.unlinkSync(backup.path);
                console.log(`🗑️  Deleted old backup: ${backup.name}`);
            });
        }
    } catch (error) {
        console.error('⚠️ Failed to rotate backups:', error);
    }
}

/**
 * Save blockchain with versioned backup and integrity checksum
 */
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
            pendingTransactions: blockchain.pendingTransactions,
            savedAt: new Date().toISOString()
        };

        const jsonData = JSON.stringify(data, null, 2);
        const checksum = calculateChecksum(jsonData);

        // Create backup before overwriting
        createBackup();

        // Atomic write: Write to temp file first, then rename
        const tempFile = `${BLOCKCHAIN_FILE}.tmp`;
        const checksumFile = `${BLOCKCHAIN_FILE}.checksum`;

        fs.writeFileSync(tempFile, jsonData);
        fs.writeFileSync(`${checksumFile}.tmp`, checksum);

        // Atomic rename
        fs.renameSync(tempFile, BLOCKCHAIN_FILE);
        fs.renameSync(`${checksumFile}.tmp`, checksumFile);

        console.log('✅ Blockchain saved to disk with checksum verification');
    } catch (error) {
        console.error('❌ Error saving blockchain:', error);
    }
}

/**
 * Recover blockchain from most recent backup
 */
function recoverFromBackup() {
    try {
        const backups = fs.readdirSync(backupDir)
            .filter(file => file.startsWith('blockchain_') && file.endsWith('.json'))
            .map(file => ({
                name: file,
                path: path.join(backupDir, file),
                time: fs.statSync(path.join(backupDir, file)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time); // Newest first

        if (backups.length > 0) {
            console.log(`🔄 Attempting recovery from backup: ${backups[0].name}`);
            const backupData = fs.readFileSync(backups[0].path, 'utf8');

            // Try to parse and validate backup
            const data = JSON.parse(backupData);

            // Restore from backup
            fs.copyFileSync(backups[0].path, BLOCKCHAIN_FILE);
            console.log('✅ Successfully recovered from backup');

            return data;
        } else {
            console.error('❌ No backups available for recovery');
            return null;
        }
    } catch (error) {
        console.error('❌ Failed to recover from backup:', error);
        return null;
    }
}

/**
 * Load blockchain with checksum verification and automatic recovery
 */
export function loadBlockchain() {
    try {
        if (fs.existsSync(BLOCKCHAIN_FILE)) {
            const jsonData = fs.readFileSync(BLOCKCHAIN_FILE, 'utf8');
            const checksumFile = `${BLOCKCHAIN_FILE}.checksum`;

            // Verify checksum if it exists
            if (fs.existsSync(checksumFile)) {
                const expectedChecksum = fs.readFileSync(checksumFile, 'utf8').trim();

                if (!verifyChecksum(jsonData, expectedChecksum)) {
                    console.error('❌ Blockchain checksum verification failed! Attempting recovery...');
                    const recoveredData = recoverFromBackup();

                    if (recoveredData) {
                        return processBlockchainData(recoveredData);
                    } else {
                        console.error('❌ Recovery failed. Starting with fresh blockchain.');
                        return null;
                    }
                }
                console.log('✅ Blockchain checksum verified');
            } else {
                console.warn('⚠️ No checksum file found. Loading without verification.');
            }

            const data = JSON.parse(jsonData);
            return processBlockchainData(data);
        } else {
            console.log('📂 No existing blockchain file found. Starting fresh.');
        }
    } catch (error) {
        console.error('❌ Error loading blockchain:', error);
        console.log('🔄 Attempting recovery from backup...');

        const recoveredData = recoverFromBackup();
        if (recoveredData) {
            return processBlockchainData(recoveredData);
        }
    }
    return null;
}

/**
 * Process and reconstruct blockchain data
 */
function processBlockchainData(data) {
    // Reconstruct chain
    if (data.chain) {
        data.chain = data.chain.map(reconstructBlock);
    }

    // Reconstruct pending transactions
    if (data.pendingTransactions) {
        data.pendingTransactions = data.pendingTransactions.map(reconstructTransaction);
    }

    console.log(`📂 Blockchain loaded: ${data.chain ? data.chain.length : 0} blocks, ${data.pendingTransactions ? data.pendingTransactions.length : 0} pending`);
    return data;
}

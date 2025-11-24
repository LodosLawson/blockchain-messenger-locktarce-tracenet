import Block from './Block.js';
import Transaction from './Transaction.js';

class Blockchain {
    constructor() {
        this.chain = [this.createGenesisBlock()];
        this.difficulty = 2;
        this.pendingTransactions = [];
        this.miningReward = 10;
        this.validationReward = 0.00001; // LockTrace Coin per validation
        this.requiredValidations = 3;

        // LockTrace Coin Tokenomics
        this.COIN_NAME = 'LockTrace';
        this.COIN_SYMBOL = 'LTC';
        this.MAX_SUPPLY = 100000000; // 100 million LockTrace Coins
        this.INITIAL_USER_BONUS = 3; // 3 LockTrace Coins per new user
        this.systemWallet = 'SYSTEM_WALLET';

        // Persistence and Event callbacks
        this.onSave = null; // Callback function for auto-save
        this.onTransactionAdded = null; // Callback for new transactions
        this.onBlockMined = null; // Callback for new blocks
    }

    createGenesisBlock() {
        return new Block(Date.now(), [], '0');
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    addTransaction(transaction) {
        // Reward transactions can have null fromAddress
        if (transaction.type !== 'reward') {
            if (!transaction.fromAddress || !transaction.toAddress) {
                throw new Error('Transaction must include from and to address');
            }
        }

        if (!transaction.isValid()) {
            throw new Error('Cannot add invalid transaction to chain');
        }

        this.pendingTransactions.push(transaction);
        console.log(`Transaction added to pending pool. Type: ${transaction.type}, Amount: ${transaction.amount}`);

        // Trigger callbacks
        if (this.onTransactionAdded) {
            this.onTransactionAdded(transaction);
        }
        if (this.onSave) {
            this.onSave(this);
        }
    }

    minePendingTransactions(miningRewardAddress, validatorRewards = []) {
        // Create reward transaction for miner
        const rewardTx = new Transaction(
            null,
            miningRewardAddress,
            this.miningReward,
            'reward',
            { reason: 'mining' }
        );

        // Add validator rewards
        for (const validator of validatorRewards) {
            const validatorRewardTx = new Transaction(
                null,
                validator.address,
                validator.amount,
                'reward',
                { reason: 'validation', validatedCount: validator.count }
            );
            this.pendingTransactions.push(validatorRewardTx);
        }

        const block = new Block(
            Date.now(),
            this.pendingTransactions,
            this.getLatestBlock().hash
        );
        block.mineBlock(this.difficulty);

        console.log('Block successfully mined!');
        this.chain.push(block);

        this.pendingTransactions = [rewardTx];

        // Trigger callbacks
        if (this.onBlockMined) {
            this.onBlockMined(block);
        }
        if (this.onSave) {
            this.onSave(this);
        }
    }

    getBalanceOfAddress(address) {
        let balance = 0;
        // console.log(`Checking balance for address: ${address ? address.substring(0, 20) + '...' : 'null'}`);

        for (const block of this.chain) {
            for (const trans of block.transactions) {
                // console.log(`Tx: ${trans.type}, To: ${trans.toAddress ? trans.toAddress.substring(0, 20) + '...' : 'null'}, Amount: ${trans.amount}`);

                if (trans.fromAddress === address) {
                    balance -= trans.amount;
                    if (trans.fee) {
                        balance -= trans.fee;
                    }
                }

                if (trans.toAddress === address) {
                    balance += trans.amount;
                }
            }
        }

        return balance;
    }

    getAllTransactionsForAddress(address) {
        const transactions = [];

        for (const block of this.chain) {
            for (const trans of block.transactions) {
                if (trans.fromAddress === address || trans.toAddress === address) {
                    transactions.push({
                        ...trans,
                        blockTimestamp: block.timestamp
                    });
                }
            }
        }

        return transactions;
    }

    getMessagesBetweenUsers(user1, user2) {
        const messages = [];

        for (const block of this.chain) {
            for (const trans of block.transactions) {
                if (trans.type === 'message') {
                    if (
                        (trans.fromAddress === user1 && trans.toAddress === user2) ||
                        (trans.fromAddress === user2 && trans.toAddress === user1)
                    ) {
                        messages.push({
                            from: trans.fromAddress,
                            to: trans.toAddress,
                            message: trans.data?.message,
                            timestamp: trans.timestamp,
                            validated: trans.validated,
                            validations: trans.validations,
                            fee: trans.fee
                        });
                    }
                }
            }
        }

        return messages.sort((a, b) => a.timestamp - b.timestamp);
    }

    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            if (!currentBlock.hasValidTransactions()) {
                return false;
            }

            if (currentBlock.hash !== currentBlock.calculateHash()) {
                return false;
            }

            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
        }

        return true;
    }

    getPendingTransactions() {
        return this.pendingTransactions;
    }

    getTransactionById(txHash) {
        for (const block of this.chain) {
            for (const trans of block.transactions) {
                if (trans.calculateHash() === txHash) {
                    return trans;
                }
            }
        }

        for (const trans of this.pendingTransactions) {
            if (trans.calculateHash() === txHash) {
                return trans;
            }
        }

        return null;
    }

    getCirculatingSupply() {
        let totalSupply = 0;
        const addresses = new Set();

        for (const block of this.chain) {
            for (const trans of block.transactions) {
                if (trans.fromAddress) addresses.add(trans.fromAddress);
                if (trans.toAddress) addresses.add(trans.toAddress);
            }
        }

        for (const address of addresses) {
            const balance = this.getBalanceOfAddress(address);
            if (balance > 0) {
                totalSupply += balance;
            }
        }

        return totalSupply;
    }

    canMintCoins(amount) {
        const currentSupply = this.getCirculatingSupply();
        return (currentSupply + amount) <= this.MAX_SUPPLY;
    }

    /**
     * Load blockchain state from saved data
     */
    loadFromData(data) {
        if (data.chain && data.chain.length > 0) {
            this.chain = data.chain;
        }
        if (data.pendingTransactions) {
            this.pendingTransactions = data.pendingTransactions;
        }
        if (data.difficulty !== undefined) {
            this.difficulty = data.difficulty;
        }
        if (data.miningReward !== undefined) {
            this.miningReward = data.miningReward;
        }
        if (data.validationReward !== undefined) {
            this.validationReward = data.validationReward;
        }
        if (data.requiredValidations !== undefined) {
            this.requiredValidations = data.requiredValidations;
        }
        if (data.MAX_SUPPLY !== undefined) {
            this.MAX_SUPPLY = data.MAX_SUPPLY;
        }
        if (data.INITIAL_USER_BONUS !== undefined) {
            this.INITIAL_USER_BONUS = data.INITIAL_USER_BONUS;
        }
        if (data.systemWallet !== undefined) {
            this.systemWallet = data.systemWallet;
        }

        console.log(`✅ Blockchain state loaded: ${this.chain.length} blocks, ${this.pendingTransactions.length} pending`);
    }

    /**
     * Set callback for auto-save
     */
    setSaveCallback(callback) {
        this.onSave = callback;
    }
    /**
     * Validate a chain
     */
    isValidChain(chain) {
        if (JSON.stringify(chain[0]) !== JSON.stringify(this.createGenesisBlock())) {
            return false;
        }

        for (let i = 1; i < chain.length; i++) {
            const currentBlock = chain[i];
            const previousBlock = chain[i - 1];

            // Ensure methods exist (in case of plain objects)
            if (!currentBlock.hasValidTransactions || !currentBlock.calculateHash) {
                console.error('Block objects are missing methods. Reconstruction required.');
                return false;
            }

            if (!currentBlock.hasValidTransactions()) {
                return false;
            }

            if (currentBlock.hash !== currentBlock.calculateHash()) {
                return false;
            }

            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
        }
        return true;
    }

    /**
     * Replace current chain with a new one if it's longer and valid
     */
    replaceChain(newChain) {
        if (newChain.length <= this.chain.length) {
            console.log('Received chain is not longer than the current chain.');
            return;
        }

        if (!this.isValidChain(newChain)) {
            console.log('Received chain is not valid.');
            return;
        }

        console.log('Replacing blockchain with the new chain.');
        this.chain = newChain;

        // Trigger auto-save
        if (this.onSave) {
            this.onSave(this);
        }
    }
}

export default Blockchain;

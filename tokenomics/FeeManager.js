// Fee structure for different transaction types
export const FEE_STRUCTURE = {
    MESSAGE: {
        total: 0.03,
        distribution: {
            system: 0.01,
            random: 0.01,
            sender: 0.01 // Sender keeps this
        }
    },
    SHARE: {
        total: 0.10,
        distribution: {
            system: 0.02,
            sharer: 0.02,
            random: 0.06 // Distributed randomly
        }
    },
    VIDEO: {
        total: 0.01,
        distribution: {
            system: 0.005,
            creator: 0.005
        }
    },
    IMAGE: {
        total: 0.01,
        distribution: {
            system: 0.005,
            creator: 0.005
        }
    },
    LINK: {
        total: 0.04,
        distribution: {
            system: 0.02,
            creator: 0.02
        }
    },
    COMMENT: {
        total: 0.04,
        distribution: {
            system: 0.02,
            commenter: 0.02
        }
    },
    LIKE: {
        total: 0.01,
        distribution: {
            contentCreator: 0.01
        }
    }
};

class FeeManager {
    constructor(blockchain, randomDistributor) {
        this.blockchain = blockchain;
        this.randomDistributor = randomDistributor;
        this.systemWallet = 'SYSTEM_WALLET';
    }

    validateBalance(userPublicKey, transactionType) {
        const fee = FEE_STRUCTURE[transactionType].total;
        const balance = this.blockchain.getBalanceOfAddress(userPublicKey);
        return balance >= fee;
    }

    calculateFeeDistribution(transactionType, userPublicKey, recipientPublicKey = null) {
        const feeConfig = FEE_STRUCTURE[transactionType];
        const distributions = [];

        switch (transactionType) {
            case 'MESSAGE':
                // System gets 0.01
                distributions.push({
                    to: this.systemWallet,
                    amount: feeConfig.distribution.system,
                    reason: 'system_fee'
                });

                // Random user gets 0.01
                const randomUser = this.randomDistributor.selectRandomUser(userPublicKey);
                if (randomUser) {
                    distributions.push({
                        to: randomUser,
                        amount: feeConfig.distribution.random,
                        reason: 'random_reward'
                    });
                } else {
                    // If no eligible user, system gets it
                    distributions.push({
                        to: this.systemWallet,
                        amount: feeConfig.distribution.random,
                        reason: 'system_fallback'
                    });
                }

                // Sender keeps 0.01 (no distribution needed, just deduct less)
                break;

            case 'SHARE':
                // System gets 0.02
                distributions.push({
                    to: this.systemWallet,
                    amount: feeConfig.distribution.system,
                    reason: 'system_fee'
                });

                // Sharer gets 0.02
                distributions.push({
                    to: userPublicKey,
                    amount: feeConfig.distribution.sharer,
                    reason: 'sharer_reward'
                });

                // Random distribution of 0.06
                const randomUsers = this.randomDistributor.selectMultipleRandomUsers(userPublicKey, 6);
                const amountPerUser = feeConfig.distribution.random / randomUsers.length;
                randomUsers.forEach(user => {
                    distributions.push({
                        to: user,
                        amount: amountPerUser,
                        reason: 'random_reward'
                    });
                });
                break;

            case 'VIDEO':
            case 'IMAGE':
                distributions.push({
                    to: this.systemWallet,
                    amount: feeConfig.distribution.system,
                    reason: 'system_fee'
                });
                distributions.push({
                    to: userPublicKey,
                    amount: feeConfig.distribution.creator,
                    reason: 'creator_reward'
                });
                break;

            case 'LINK':
            case 'COMMENT':
                distributions.push({
                    to: this.systemWallet,
                    amount: feeConfig.distribution.system,
                    reason: 'system_fee'
                });
                distributions.push({
                    to: userPublicKey,
                    amount: feeConfig.distribution[transactionType === 'COMMENT' ? 'commenter' : 'creator'],
                    reason: 'creator_reward'
                });
                break;

            case 'LIKE':
                // All goes to content creator
                if (recipientPublicKey) {
                    distributions.push({
                        to: recipientPublicKey,
                        amount: feeConfig.distribution.contentCreator,
                        reason: 'like_reward'
                    });
                }
                break;
        }

        return {
            totalFee: feeConfig.total,
            distributions
        };
    }

    getTotalFee(transactionType) {
        return FEE_STRUCTURE[transactionType]?.total || 0;
    }
}

export default FeeManager;

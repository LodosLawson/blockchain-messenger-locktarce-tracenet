class ValidatorPool {
    constructor(blockchain) {
        this.blockchain = blockchain;
        this.activeValidators = new Map(); // userId -> { publicKey, lastActivity, validationCount, tier }
        this.validationReward = 0.00001; // LockTrace Coin reward per validation
        this.requiredValidations = 3;
        this.tiers = {
            HELPER: { name: 'Helper', minValidations: 0, multiplier: 1.0 },
            ACTIVE: { name: 'Active', minValidations: 10, multiplier: 1.2 },
            ELITE: { name: 'Elite', minValidations: 50, multiplier: 1.5 }
        };
    }

    registerValidator(userId, publicKey) {
        this.activeValidators.set(userId, {
            publicKey,
            lastActivity: Date.now(),
            validationCount: 0,
            totalEarned: 0,
            tier: 'HELPER'
        });
        console.log(`Validator registered: ${userId} (Helper tier)`);
    }

    updateActivity(userId) {
        const validator = this.activeValidators.get(userId);
        if (validator) {
            validator.lastActivity = Date.now();
        }
    }

    removeValidator(userId) {
        this.activeValidators.delete(userId);
        console.log(`Validator removed: ${userId}`);
    }

    getActiveValidators() {
        const now = Date.now();
        const activeTimeout = 60000; // 1 minute of inactivity

        // Filter out inactive validators
        const active = [];
        for (const [userId, validator] of this.activeValidators.entries()) {
            if (now - validator.lastActivity < activeTimeout) {
                active.push(userId);
            }
        }

        return active;
    }

    getActiveValidatorsWithDetails() {
        const now = Date.now();
        const activeTimeout = 60000; // 1 minute of inactivity

        const active = [];
        for (const [userId, validator] of this.activeValidators.entries()) {
            if (now - validator.lastActivity < activeTimeout) {
                active.push({
                    userId,
                    publicKey: validator.publicKey,
                    validationCount: validator.validationCount,
                    totalEarned: validator.totalEarned,
                    tier: this.getValidatorTier(validator.validationCount)
                });
            }
        }

        return active;
    }

    getValidatorTier(validationCount) {
        if (validationCount >= this.tiers.ELITE.minValidations) return 'ELITE';
        if (validationCount >= this.tiers.ACTIVE.minValidations) return 'ACTIVE';
        return 'HELPER';
    }

    selectValidatorsForTransaction(excludeUserId = null) {
        const active = this.getActiveValidatorsWithDetails().filter(v => v.userId !== excludeUserId);

        if (active.length < this.requiredValidations) {
            console.log(`Not enough validators. Need ${this.requiredValidations}, have ${active.length}`);
            return [];
        }

        // Randomly select validators
        const shuffled = active.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, this.requiredValidations);
    }

    async assignValidation(transaction, excludeUserId = null) {
        const validators = this.selectValidatorsForTransaction(excludeUserId);

        if (validators.length === 0) {
            return { success: false, message: 'Not enough validators available' };
        }

        // In a real implementation, this would notify validators via WebSocket
        // For now, we'll auto-validate and distribute rewards

        for (const validator of validators) {
            transaction.addValidation(validator.publicKey);

            // Update validator stats
            const validatorData = this.activeValidators.get(validator.userId);
            if (validatorData) {
                validatorData.validationCount++;
                validatorData.totalEarned += this.validationReward;
            }
        }

        transaction.validated = true;

        return {
            success: true,
            validators: validators.map(v => ({
                userId: v.userId,
                reward: this.validationReward
            }))
        };
    }

    getValidatorStats(userId) {
        const validator = this.activeValidators.get(userId);
        if (!validator) {
            return null;
        }

        return {
            validationCount: validator.validationCount,
            totalEarned: validator.totalEarned,
            isActive: Date.now() - validator.lastActivity < 60000
        };
    }

    getAllValidatorStats() {
        const stats = [];
        for (const [userId, validator] of this.activeValidators.entries()) {
            stats.push({
                userId,
                validationCount: validator.validationCount,
                totalEarned: validator.totalEarned,
                isActive: Date.now() - validator.lastActivity < 60000
            });
        }
        return stats;
    }

    getValidatorRewards() {
        const rewards = [];

        for (const [userId, validator] of this.activeValidators.entries()) {
            if (validator.validationCount > 0) {
                rewards.push({
                    address: validator.publicKey,
                    amount: validator.totalEarned,
                    count: validator.validationCount
                });

                // Reset counters after reward distribution
                validator.validationCount = 0;
                validator.totalEarned = 0;
            }
        }

        return rewards;
    }
}

export default ValidatorPool;

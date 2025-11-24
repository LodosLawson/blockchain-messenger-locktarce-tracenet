import crypto from 'crypto';

class Transaction {
    constructor(fromAddress, toAddress, amount, type = 'transfer', data = null, fee = 0) {
        this.fromAddress = fromAddress;
        this.toAddress = toAddress;
        this.amount = amount;
        this.type = type; // 'transfer', 'message', 'reward', 'post', 'comment', 'like', 'share'
        this.data = data; // For messages or additional info
        this.fee = fee; // Transaction fee
        this.feeDistributions = []; // Array of {to, amount, reason}
        this.contentHash = null; // For encrypted content
        this.timestamp = Date.now();
        this.signature = null;
        this.validations = []; // Array of validator addresses
        this.validated = false;
    }

    calculateHash() {
        return crypto
            .createHash('sha256')
            .update(
                this.fromAddress +
                this.toAddress +
                this.amount +
                this.type +
                JSON.stringify(this.data) +
                this.timestamp
            )
            .digest('hex');
    }

    signTransaction(signingKey) {
        if (signingKey.export({ type: 'pkcs1', format: 'pem' }).toString() !== this.fromAddress) {
            throw new Error('You cannot sign transactions for other wallets!');
        }

        const hashTx = this.calculateHash();
        const sign = crypto.createSign('SHA256');
        sign.update(hashTx).end();

        this.signature = sign.sign(signingKey, 'hex');
    }

    isValid() {
        // System transactions (mining rewards, validation rewards) don't need signature
        if (this.fromAddress === null) return true;

        if (!this.signature || this.signature.length === 0) {
            throw new Error('No signature in this transaction');
        }

        try {
            const verify = crypto.createVerify('SHA256');
            verify.update(this.calculateHash());
            return verify.verify(this.fromAddress, this.signature, 'hex');
        } catch (error) {
            return false;
        }
    }

    addValidation(validatorAddress) {
        if (!this.validations.includes(validatorAddress)) {
            this.validations.push(validatorAddress);
        }
    }

    isFullyValidated(requiredValidations = 3) {
        return this.validations.length >= requiredValidations;
    }
}

export default Transaction;

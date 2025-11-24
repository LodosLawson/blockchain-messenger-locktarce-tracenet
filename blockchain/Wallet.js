import crypto from 'crypto';

class Wallet {
    constructor() {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'pkcs1',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs1',
                format: 'pem'
            }
        });

        this.publicKey = publicKey;
        this.privateKey = privateKey;
    }

    getPublicKey() {
        return this.publicKey;
    }

    getPrivateKey() {
        return this.privateKey;
    }

    static fromKeys(publicKey, privateKey) {
        const wallet = Object.create(Wallet.prototype);
        wallet.publicKey = publicKey;
        wallet.privateKey = privateKey;
        return wallet;
    }
}

export default Wallet;

/**
 * Generate RSA key pair for wallet using Web Crypto API
 */
export async function generateKeyPair() {
    try {
        // Generate RSA-OAEP key pair
        const keyPair = await window.crypto.subtle.generateKey(
            {
                name: 'RSA-OAEP',
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: 'SHA-256'
            },
            true, // extractable
            ['encrypt', 'decrypt']
        );

        // Export public key to PEM format
        const publicKeyBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
        const publicKeyPem = bufferToPem(publicKeyBuffer, 'PUBLIC KEY');

        // Export private key to PEM format
        const privateKeyBuffer = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
        const privateKeyPem = bufferToPem(privateKeyBuffer, 'PRIVATE KEY');

        return {
            publicKey: publicKeyPem,
            privateKey: privateKeyPem
        };
    } catch (error) {
        console.error('Error generating key pair:', error);
        throw new Error('Failed to generate wallet keys');
    }
}

/**
 * Convert ArrayBuffer to PEM format
 */
function bufferToPem(buffer, type) {
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    const formatted = base64.match(/.{1,64}/g).join('\n');
    return `-----BEGIN ${type}-----\n${formatted}\n-----END ${type}-----\n`;
}

/**
 * Convert PEM to ArrayBuffer
 */
function pemToBuffer(pem) {
    const base64 = pem
        .replace(/-----BEGIN [A-Z ]+-----/, '')
        .replace(/-----END [A-Z ]+-----/, '')
        .replace(/\s/g, '');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Sign data with private key
 */
export async function signData(data, privateKeyPem) {
    try {
        const privateKeyBuffer = pemToBuffer(privateKeyPem);
        const privateKey = await window.crypto.subtle.importKey(
            'pkcs8',
            privateKeyBuffer,
            {
                name: 'RSA-PSS',
                hash: 'SHA-256'
            },
            false,
            ['sign']
        );

        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);

        const signature = await window.crypto.subtle.sign(
            {
                name: 'RSA-PSS',
                saltLength: 32
            },
            privateKey,
            dataBuffer
        );

        return btoa(String.fromCharCode(...new Uint8Array(signature)));
    } catch (error) {
        console.error('Error signing data:', error);
        throw new Error('Failed to sign data');
    }
}

/**
 * Verify signature with public key
 */
export async function verifySignature(data, signatureBase64, publicKeyPem) {
    try {
        const publicKeyBuffer = pemToBuffer(publicKeyPem);
        const publicKey = await window.crypto.subtle.importKey(
            'spki',
            publicKeyBuffer,
            {
                name: 'RSA-PSS',
                hash: 'SHA-256'
            },
            false,
            ['verify']
        );

        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);

        const signatureBinary = atob(signatureBase64);
        const signatureBytes = new Uint8Array(signatureBinary.length);
        for (let i = 0; i < signatureBinary.length; i++) {
            signatureBytes[i] = signatureBinary.charCodeAt(i);
        }

        return await window.crypto.subtle.verify(
            {
                name: 'RSA-PSS',
                saltLength: 32
            },
            publicKey,
            signatureBytes.buffer,
            dataBuffer
        );
    } catch (error) {
        console.error('Error verifying signature:', error);
        return false;
    }
}

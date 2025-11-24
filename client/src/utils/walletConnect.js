// Wallet connection utility for MetaMask and other Web3 wallets

class WalletConnect {
    constructor() {
        this.ethereum = window.ethereum;
        this.account = null;
        this.chainId = null;
    }

    // Check if MetaMask is installed
    isMetaMaskInstalled() {
        return Boolean(this.ethereum && this.ethereum.isMetaMask);
    }

    // Connect to wallet
    async connectWallet() {
        if (!this.isMetaMaskInstalled()) {
            throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
        }

        try {
            // Request account access
            const accounts = await this.ethereum.request({
                method: 'eth_requestAccounts'
            });

            this.account = accounts[0];

            // Get chain ID
            this.chainId = await this.ethereum.request({
                method: 'eth_chainId'
            });

            // Set up event listeners
            this.setupEventListeners();

            return {
                address: this.account,
                chainId: this.chainId
            };
        } catch (error) {
            if (error.code === 4001) {
                throw new Error('User rejected the connection request');
            }
            throw error;
        }
    }

    // Disconnect wallet
    disconnectWallet() {
        this.account = null;
        this.chainId = null;
        this.removeEventListeners();
    }

    // Get connected wallet address
    getWalletAddress() {
        return this.account;
    }

    // Get chain ID
    getChainId() {
        return this.chainId;
    }

    // Sign a message for authentication
    async signMessage(message) {
        if (!this.account) {
            throw new Error('No wallet connected');
        }

        try {
            const signature = await this.ethereum.request({
                method: 'personal_sign',
                params: [message, this.account]
            });

            return signature;
        } catch (error) {
            if (error.code === 4001) {
                throw new Error('User rejected the signature request');
            }
            throw error;
        }
    }

    // Get wallet balance
    async getBalance() {
        if (!this.account) {
            throw new Error('No wallet connected');
        }

        try {
            const balance = await this.ethereum.request({
                method: 'eth_getBalance',
                params: [this.account, 'latest']
            });

            // Convert from Wei to ETH
            return parseInt(balance, 16) / 1e18;
        } catch (error) {
            throw new Error('Failed to get balance: ' + error.message);
        }
    }

    // Setup event listeners for account and chain changes
    setupEventListeners() {
        if (!this.ethereum) return;

        // Account changed
        this.ethereum.on('accountsChanged', this.handleAccountsChanged.bind(this));

        // Chain changed
        this.ethereum.on('chainChanged', this.handleChainChanged.bind(this));

        // Disconnect
        this.ethereum.on('disconnect', this.handleDisconnect.bind(this));
    }

    // Remove event listeners
    removeEventListeners() {
        if (!this.ethereum) return;

        this.ethereum.removeListener('accountsChanged', this.handleAccountsChanged);
        this.ethereum.removeListener('chainChanged', this.handleChainChanged);
        this.ethereum.removeListener('disconnect', this.handleDisconnect);
    }

    // Handle account change
    handleAccountsChanged(accounts) {
        if (accounts.length === 0) {
            // User disconnected wallet
            this.disconnectWallet();
            window.dispatchEvent(new CustomEvent('walletDisconnected'));
        } else {
            this.account = accounts[0];
            window.dispatchEvent(new CustomEvent('walletAccountChanged', {
                detail: { address: this.account }
            }));
        }
    }

    // Handle chain change
    handleChainChanged(chainId) {
        this.chainId = chainId;
        window.dispatchEvent(new CustomEvent('walletChainChanged', {
            detail: { chainId }
        }));
        // Reload page on chain change (recommended by MetaMask)
        window.location.reload();
    }

    // Handle disconnect
    handleDisconnect() {
        this.disconnectWallet();
        window.dispatchEvent(new CustomEvent('walletDisconnected'));
    }

    // Format address for display (0x1234...5678)
    static formatAddress(address) {
        if (!address) return '';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }

    // Get network name from chain ID
    static getNetworkName(chainId) {
        const networks = {
            '0x1': 'Ethereum Mainnet',
            '0x3': 'Ropsten Testnet',
            '0x4': 'Rinkeby Testnet',
            '0x5': 'Goerli Testnet',
            '0x2a': 'Kovan Testnet',
            '0x89': 'Polygon Mainnet',
            '0x13881': 'Polygon Mumbai',
            '0x38': 'BSC Mainnet',
            '0x61': 'BSC Testnet'
        };

        return networks[chainId] || 'Unknown Network';
    }
}

// Export singleton instance
const walletConnect = new WalletConnect();
export default walletConnect;

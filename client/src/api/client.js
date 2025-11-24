import axios from 'axios';

// Base URL configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create axios instance
const apiClient = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 10000
});

// Request interceptor - Add token to requests
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
    (response) => response.data,
    (error) => {
        if (error.response) {
            // Server responded with error
            const message = error.response.data?.error || error.response.data?.message || 'An error occurred';

            // Handle auth errors
            if (error.response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }

            return Promise.reject(new Error(message));
        } else if (error.request) {
            // Request made but no response
            return Promise.reject(new Error('Server not responding. Please check your connection.'));
        } else {
            // Something else happened
            return Promise.reject(new Error(error.message || 'An unexpected error occurred'));
        }
    }
);

// API Methods
export const api = {
    // Authentication
    auth: {
        register: (username, password) =>
            apiClient.post('/auth/register', { username, password }),

        login: (username, password) =>
            apiClient.post('/auth/login', { username, password }),
    },

    // Wallet
    wallet: {
        getBalance: () =>
            apiClient.get('/wallet/balance'),

        sendTransaction: (recipientPublicKey, amount) =>
            apiClient.post('/wallet/send', { recipientPublicKey, amount }),

        getTransactions: () =>
            apiClient.get('/wallet/transactions'),
    },

    // Messages
    messages: {
        getMessages: (userId) =>
            apiClient.get(`/messages/${userId}`),

        sendMessage: (recipientId, content) =>
            apiClient.post('/messages/send', { recipientId, content }),

        getContacts: () =>
            apiClient.get('/messages/contacts'),
    },

    // Blockchain
    blockchain: {
        getStats: () =>
            apiClient.get('/blockchain/stats'),

        getBlocks: (limit = 10) =>
            apiClient.get(`/blockchain/blocks?limit=${limit}`),

        getBlock: (index) =>
            apiClient.get(`/blockchain/blocks/${index}`),
    },

    // P2P
    peers: {
        getPeers: () =>
            apiClient.get('/peers'),

        addPeer: (peerUrl) =>
            apiClient.post('/peers', { peer: peerUrl }),
    },

    // Validation
    validation: {
        getValidators: () =>
            apiClient.get('/validation/validators'),

        getStats: () =>
            apiClient.get('/validation/stats'),
    },

    // Tokenomics
    tokenomics: {
        getMarketCap: () =>
            apiClient.get('/tokenomics/market-cap'),

        getFees: () =>
            apiClient.get('/tokenomics/fees'),
    },

    // Users
    users: {
        searchUsers: (query) =>
            apiClient.get(`/wallet/users/search?q=${query}`),

        getAllUsers: () =>
            apiClient.get('/wallet/users'),
    }
};

// WebSocket helper
export const createWebSocket = (token) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.VITE_WS_URL ||
        (import.meta.env.DEV ? 'localhost:3000' : window.location.host);

    const ws = new WebSocket(`${protocol}//${host}`);

    ws.onopen = () => {
        console.log('✅ WebSocket connected');
        ws.send(JSON.stringify({ type: 'auth', token }));
    };

    ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
    };

    ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
    };

    return ws;
};

export default apiClient;

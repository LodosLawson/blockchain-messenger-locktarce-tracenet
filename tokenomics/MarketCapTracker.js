import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MarketCapTracker {
    constructor(blockchain) {
        this.blockchain = blockchain;
        this.INITIAL_MARKET_CAP = 1000; // $1000 USD
        this.marketCap = this.INITIAL_MARKET_CAP;
        this.priceHistoryPath = path.join(__dirname, '..', 'database', 'priceHistory.json');
        this.priceHistory = this.loadPriceHistory();
    }

    loadPriceHistory() {
        if (fs.existsSync(this.priceHistoryPath)) {
            const data = fs.readFileSync(this.priceHistoryPath, 'utf8');
            return JSON.parse(data);
        }
        return [];
    }

    savePriceHistory() {
        fs.writeFileSync(this.priceHistoryPath, JSON.stringify(this.priceHistory, null, 2));
    }

    getCurrentPrice() {
        const circulatingSupply = this.blockchain.getCirculatingSupply();
        if (circulatingSupply === 0) return 0;
        return this.marketCap / circulatingSupply;
    }

    getMarketCap() {
        return this.marketCap;
    }

    updateMarketCap(newMarketCap) {
        this.marketCap = newMarketCap;
        this.recordPricePoint();
    }

    recordPricePoint() {
        const price = this.getCurrentPrice();
        const circulatingSupply = this.blockchain.getCirculatingSupply();

        const dataPoint = {
            timestamp: Date.now(),
            price,
            marketCap: this.marketCap,
            circulatingSupply
        };

        this.priceHistory.push(dataPoint);

        // Keep only last 1000 data points to avoid file getting too large
        if (this.priceHistory.length > 1000) {
            this.priceHistory = this.priceHistory.slice(-1000);
        }

        this.savePriceHistory();
    }

    getPriceHistory(limit = 100) {
        return this.priceHistory.slice(-limit);
    }

    getStats() {
        const currentPrice = this.getCurrentPrice();
        const circulatingSupply = this.blockchain.getCirculatingSupply();
        const maxSupply = this.blockchain.MAX_SUPPLY;

        // Calculate price change (24h simulation - using last 24 data points)
        const recentHistory = this.priceHistory.slice(-24);
        let priceChange = 0;
        let priceChangePercent = 0;

        if (recentHistory.length > 1) {
            const oldPrice = recentHistory[0].price;
            priceChange = currentPrice - oldPrice;
            priceChangePercent = (priceChange / oldPrice) * 100;
        }

        return {
            currentPrice,
            marketCap: this.marketCap,
            circulatingSupply,
            maxSupply,
            priceChange,
            priceChangePercent,
            supplyPercentage: (circulatingSupply / maxSupply) * 100
        };
    }

    onUserJoin(coinsGiven) {
        // When a new user joins and gets coins, circulating supply increases
        // This affects the price (price = marketCap / circulatingSupply)
        this.recordPricePoint();
    }

    onUserLeave(coinsRemoved) {
        // If a user leaves and their coins are burned, circulating supply decreases
        // This increases the price
        this.recordPricePoint();
    }

    onTransaction() {
        // Record price point periodically during transactions
        // Don't record every transaction to avoid too many data points
        const lastRecord = this.priceHistory[this.priceHistory.length - 1];
        const now = Date.now();

        // Only record if last record was more than 1 minute ago
        if (!lastRecord || now - lastRecord.timestamp > 60000) {
            this.recordPricePoint();
        }
    }
}

export default MarketCapTracker;

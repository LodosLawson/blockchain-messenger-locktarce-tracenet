import { useState, useEffect } from 'react';
import axios from 'axios';
import './PriceChart.css';

function PriceChart({ token }) {
    const [stats, setStats] = useState({
        currentPrice: 0,
        marketCap: 1000,
        circulatingSupply: 0,
        priceChange: 0,
        priceChangePercent: 0
    });
    const [priceHistory, setPriceHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMarketData();

        // Update every minute
        const interval = setInterval(fetchMarketData, 60000);
        return () => clearInterval(interval);
    }, [token]);

    const fetchMarketData = async () => {
        try {
            const [statsRes, historyRes] = await Promise.all([
                axios.get('/api/tokenomics/stats', {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get('/api/tokenomics/price-history?limit=50', {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            const marketStats = statsRes.data;
            // Hardcode Market Cap to $1000
            marketStats.marketCap = 1000;
            // Recalculate price based on fixed market cap
            if (marketStats.circulatingSupply > 0) {
                marketStats.currentPrice = 1000 / marketStats.circulatingSupply;
            } else {
                marketStats.currentPrice = 0;
            }

            setStats(marketStats);
            setPriceHistory(historyRes.data.history || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching market data:', error);
            setLoading(false);
        }
    };

    const formatPrice = (price) => {
        if (price < 0.000001) return price.toExponential(4);
        if (price < 0.01) return price.toFixed(8);
        return price.toFixed(6);
    };

    const formatNumber = (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
        return num.toFixed(2);
    };

    const renderMiniChart = () => {
        if (priceHistory.length < 2) return null;

        const prices = priceHistory.map(p => p.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const range = maxPrice - minPrice || 1;

        const points = priceHistory.map((point, index) => {
            const x = (index / (priceHistory.length - 1)) * 100;
            const y = 100 - ((point.price - minPrice) / range) * 100;
            return `${x},${y}`;
        }).join(' ');

        return (
            <svg className="mini-chart" viewBox="0 0 100 100" preserveAspectRatio="none">
                <polyline
                    points={points}
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                />
                <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                </defs>
            </svg>
        );
    };

    if (loading) {
        return (
            <div className="price-chart glass">
                <div className="loading">Loading market data...</div>
            </div>
        );
    }

    return (
        <div className="price-chart glass">
            <div className="chart-header">
                <div className="coin-info">
                    <h3 className="coin-name">
                        <span className="coin-icon">🔒</span>
                        LockTrace Coin
                    </h3>
                    <span className="coin-symbol">LTC</span>
                </div>
                <div className="price-display">
                    <div className="current-price">
                        ${formatPrice(stats.currentPrice || 0)}
                    </div>
                    <div className={`price-change ${(stats.priceChangePercent || 0) >= 0 ? 'positive' : 'negative'}`}>
                        {(stats.priceChangePercent || 0) >= 0 ? '▲' : '▼'}
                        {Math.abs(stats.priceChangePercent || 0).toFixed(2)}%
                    </div>
                </div>
            </div>

            <div className="chart-container">
                {renderMiniChart()}
            </div>

            <div className="market-stats">
                <div className="stat-item">
                    <span className="stat-label">Market Cap</span>
                    <span className="stat-value">${formatNumber(stats.marketCap || 0)}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Circulating Supply</span>
                    <span className="stat-value">{formatNumber(stats.circulatingSupply || 0)} LTC</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Max Supply</span>
                    <span className="stat-value">{formatNumber(stats.maxSupply || 0)} LTC</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Supply %</span>
                    <span className="stat-value">{(stats.supplyPercentage || 0).toFixed(2)}%</span>
                </div>
            </div>

            <div className="price-info">
                <p className="text-xs text-muted">
                    💡 Price is calculated from fixed $1,000 market cap divided by circulating supply
                </p>
            </div>
        </div>
    );
}

export default PriceChart;

# LockTrace Coin - Blockchain Messenger

![LockTrace Coin](https://img.shields.io/badge/LockTrace-Coin-blue)
![Version](https://img.shields.io/badge/version-1.0.0-green)
![License](https://img.shields.io/badge/license-MIT-orange)

**LockTrace Coin (LTC)** - A blockchain-based messenger with cryptocurrency rewards for validators.

## 🚀 Features

- 💬 **Blockchain Messaging** - Secure, validated messages on blockchain
- 💰 **LockTrace Coin (LTC)** - Native cryptocurrency with $1,000 market cap
- 🔐 **Validation System** - Earn 0.00001 LTC per transaction validation
- 📊 **Real-time Price Chart** - Live market cap and price tracking
- 🌐 **P2P Network** - Decentralized blockchain synchronization
- 📱 **PWA Support** - Install as mobile/desktop app
- 🎯 **Helper Validators** - Three-tier validator system (Helper, Active, Elite)
- 📈 **Blockchain Monitor** - Real-time stats, blocks, and transactions

## 🎯 Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/locktrace-coin.git
cd locktrace-coin

# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..

# Start backend (Terminal 1)
npm start

# Start frontend (Terminal 2)
cd client
npm run dev
```

Access at: **http://localhost:5173**

## 💰 LockTrace Coin (LTC)

- **Symbol**: LTC
- **Max Supply**: 100,000,000 LTC
- **Market Cap**: $1,000 (fixed)
- **Price**: Dynamic (Market Cap / Circulating Supply)
- **Initial Bonus**: 3 LTC per new user
- **Mining Reward**: 10 LTC per block
- **Validation Reward**: 0.00001 LTC per validation

## 🏗️ Architecture

```
├── blockchain/          # Blockchain core
├── validation/          # Validator pool & tiers
├── tokenomics/          # Market cap tracker
├── routes/             # API endpoints
├── network/            # P2P networking
├── client/             # React frontend
│   ├── components/     # UI components
│   │   ├── Market/     # Price chart
│   │   ├── Blockchain/ # Monitor
│   │   ├── Social/     # Feed & validation
│   │   └── PWA/        # Install prompt
│   └── public/         # PWA assets
└── database/           # Persistent storage
```

## 📦 Deployment

### Docker
```bash
docker build -t locktrace-coin .
docker run -p 3000:3000 locktrace-coin
```

### Docker Compose (Multi-Node)
```bash
docker-compose up -d
```

### Google Cloud Run
```bash
gcloud run deploy locktrace-coin \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## 🔄 Auto-Deployment from GitHub

See [GITHUB_DEPLOYMENT.md](GITHUB_DEPLOYMENT.md) for automatic deployment setup.

## 🧪 Testing

```bash
# Backend tests
npm test

# Frontend tests
cd client
npm test
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login

### Blockchain
- `GET /api/blockchain/stats` - Blockchain statistics
- `GET /api/blockchain/blocks` - Recent blocks
- `GET /api/blockchain/transactions/recent` - Recent transactions

### Tokenomics
- `GET /api/tokenomics/stats` - Market cap & price stats
- `GET /api/tokenomics/price-history` - Price history

### Messages
- `POST /api/messages/send` - Send message
- `GET /api/messages/pending` - Pending validations
- `POST /api/messages/validate` - Validate transaction

## 🎨 Tech Stack

**Backend:**
- Node.js + Express
- WebSocket (ws)
- JWT Authentication
- Custom Blockchain Implementation

**Frontend:**
- React 18
- Vite
- Axios
- CSS3 (Glassmorphism)

**DevOps:**
- Docker
- Google Cloud Run/Compute Engine
- Cloud Build (CI/CD)

## 🔐 Security

- JWT token authentication
- Transaction signatures
- Block hash validation
- Proof of Work mining
- Chain integrity checks

## 📈 Roadmap

- [x] Core blockchain implementation
- [x] LockTrace Coin tokenomics
- [x] Validation system with rewards
- [x] PWA support
- [x] Price chart visualization
- [x] Multi-node P2P network
- [ ] MetaMask wallet integration
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Smart contracts

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Authors

- **Your Name** - Initial work

## 🙏 Acknowledgments

- Blockchain technology inspiration
- React community
- Google Cloud Platform

## 📞 Support

For support, email: your-email@example.com

---

**Made with ❤️ using blockchain technology**

# LockTrace Coin - Blockchain Messenger Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Git
- Google Cloud account (for cloud deployment)

### Local Development
```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Start backend
npm start

# Start frontend (new terminal)
cd client
npm run dev
```

Access at: http://localhost:5173

---

## 📦 Git Deployment

### 1. Initialize Git Repository
```bash
cd plasma-sojourner
git init
git add .
git commit -m "Initial commit: LockTrace Coin Blockchain Messenger v1.0.0"
```

### 2. Create GitHub Repository
```bash
# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/locktrace-coin.git
git branch -M main
git push -u origin main
```

### 3. Update Repository
```bash
git add .
git commit -m "Your commit message"
git push
```

---

## ☁️ Google Cloud Deployment

### Option 1: Google Cloud Run (Recommended - Easiest)

**Step 1: Install Google Cloud SDK**
```bash
# Download from: https://cloud.google.com/sdk/docs/install
# Or use Cloud Shell (built-in)
```

**Step 2: Create Dockerfile**
Already included in project root.

**Step 3: Deploy to Cloud Run**
```bash
# Login to Google Cloud
gcloud auth login

# Set project
gcloud config set project YOUR_PROJECT_ID

# Build and deploy
gcloud run deploy locktrace-coin \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000
```

**Pros:**
- ✅ Automatic scaling
- ✅ Pay per use
- ✅ HTTPS included
- ✅ Easy deployment

**Cons:**
- ⚠️ Stateless (need external database for persistence)

---

### Option 2: Google Compute Engine (Full Control)

**Step 1: Create VM Instance**
```bash
gcloud compute instances create locktrace-node \
  --machine-type=e2-medium \
  --zone=us-central1-a \
  --image-family=ubuntu-2004-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=20GB \
  --tags=http-server,https-server
```

**Step 2: SSH into VM**
```bash
gcloud compute ssh locktrace-node --zone=us-central1-a
```

**Step 3: Setup on VM**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Git
sudo apt install -y git

# Clone your repository
git clone https://github.com/YOUR_USERNAME/locktrace-coin.git
cd locktrace-coin

# Install dependencies
npm install
cd client && npm install && npm run build && cd ..

# Install PM2 for process management
sudo npm install -g pm2

# Start application
pm2 start server.js --name locktrace-backend
pm2 startup
pm2 save

# Setup Nginx reverse proxy
sudo apt install -y nginx

# Configure Nginx
sudo nano /etc/nginx/sites-available/locktrace
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/locktrace /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**Step 4: Setup Firewall**
```bash
gcloud compute firewall-rules create allow-http \
  --allow tcp:80 \
  --target-tags http-server

gcloud compute firewall-rules create allow-https \
  --allow tcp:443 \
  --target-tags https-server

gcloud compute firewall-rules create allow-node \
  --allow tcp:3000 \
  --target-tags http-server
```

**Pros:**
- ✅ Full control
- ✅ Persistent storage
- ✅ Can run multiple nodes
- ✅ Better for blockchain

**Cons:**
- ⚠️ Manual management
- ⚠️ Fixed costs

---

### Option 3: Google Kubernetes Engine (Advanced - Multi-Node)

**Step 1: Create Kubernetes Cluster**
```bash
gcloud container clusters create locktrace-cluster \
  --num-nodes=3 \
  --machine-type=e2-medium \
  --zone=us-central1-a
```

**Step 2: Create Deployment YAML**
```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: locktrace-node
spec:
  replicas: 3
  selector:
    matchLabels:
      app: locktrace
  template:
    metadata:
      labels:
        app: locktrace
    spec:
      containers:
      - name: locktrace
        image: gcr.io/YOUR_PROJECT/locktrace:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
```

**Step 3: Deploy**
```bash
kubectl apply -f deployment.yaml
kubectl expose deployment locktrace-node --type=LoadBalancer --port=80 --target-port=3000
```

**Pros:**
- ✅ Auto-scaling
- ✅ High availability
- ✅ Perfect for P2P network
- ✅ Load balancing

**Cons:**
- ⚠️ Complex setup
- ⚠️ Higher costs

---

## 🔧 Environment Variables

Create `.env` file:
```env
NODE_ENV=production
PORT=3000
JWT_SECRET=your-super-secret-key-change-this
CORS_ORIGIN=https://your-domain.com
```

---

## 📊 Monitoring & Maintenance

### Google Cloud Monitoring
```bash
# Enable monitoring
gcloud services enable monitoring.googleapis.com

# View logs
gcloud logging read "resource.type=gce_instance" --limit 50
```

### PM2 Monitoring (Compute Engine)
```bash
# View status
pm2 status

# View logs
pm2 logs locktrace-backend

# Restart
pm2 restart locktrace-backend

# Monitor
pm2 monit
```

---

## 🌐 Domain Setup

### 1. Reserve Static IP
```bash
gcloud compute addresses create locktrace-ip --region=us-central1
gcloud compute addresses describe locktrace-ip --region=us-central1
```

### 2. Point Domain
- Go to your domain registrar
- Add A record pointing to the static IP
- Wait for DNS propagation (up to 48 hours)

### 3. Setup SSL (Let's Encrypt)
```bash
# On VM
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
sudo certbot renew --dry-run
```

---

## 🔐 Security Best Practices

### 1. Firewall Rules
```bash
# Allow only necessary ports
gcloud compute firewall-rules create allow-ssh \
  --allow tcp:22 \
  --source-ranges YOUR_IP/32
```

### 2. Update Regularly
```bash
# On VM
sudo apt update && sudo apt upgrade -y
npm update
```

### 3. Backup Data
```bash
# Backup blockchain data
gcloud compute disks snapshot locktrace-node \
  --snapshot-names=locktrace-backup-$(date +%Y%m%d) \
  --zone=us-central1-a
```

---

## 💰 Cost Estimation

### Cloud Run (Recommended for Start)
- **Free tier**: 2 million requests/month
- **After free tier**: ~$0.40 per million requests
- **Estimated**: $5-20/month for small usage

### Compute Engine (e2-medium)
- **VM**: ~$25/month
- **Storage**: ~$2/month (20GB)
- **Network**: ~$1-5/month
- **Total**: ~$30-35/month

### Kubernetes Engine (3 nodes)
- **Cluster**: ~$75/month
- **Load Balancer**: ~$18/month
- **Total**: ~$95/month

---

## 🚀 Recommended Deployment Strategy

### For Testing/Development:
**Use Cloud Run** - Easiest and cheapest

### For Production (Single Node):
**Use Compute Engine** - Full control, persistent storage

### For Production (Multi-Node P2P):
**Use Kubernetes Engine** - Best for blockchain network

---

## 📝 Deployment Checklist

### Before Deployment:
- [ ] Update .env with production values
- [ ] Change JWT_SECRET
- [ ] Build frontend: `cd client && npm run build`
- [ ] Test locally
- [ ] Commit all changes to Git

### After Deployment:
- [ ] Test all endpoints
- [ ] Verify WebSocket connections
- [ ] Check blockchain synchronization
- [ ] Setup monitoring
- [ ] Configure backups
- [ ] Setup SSL certificate
- [ ] Test from different devices

---

## 🆘 Troubleshooting

### Issue: WebSocket not connecting
**Solution**: Ensure firewall allows WebSocket connections and Nginx is configured for WebSocket upgrade

### Issue: Blockchain data lost
**Solution**: Check data persistence, ensure volumes are mounted correctly

### Issue: High memory usage
**Solution**: Increase VM size or optimize blockchain data structure

### Issue: P2P nodes not connecting
**Solution**: Check firewall rules, ensure P2P port (default 6001) is open

---

## 📚 Additional Resources

- [Google Cloud Documentation](https://cloud.google.com/docs)
- [Cloud Run Quickstart](https://cloud.google.com/run/docs/quickstarts)
- [Compute Engine Guide](https://cloud.google.com/compute/docs)
- [Kubernetes Engine Tutorial](https://cloud.google.com/kubernetes-engine/docs/tutorials)

---

## 🎯 Quick Deploy Commands

### Cloud Run (Fastest):
```bash
gcloud run deploy locktrace-coin --source . --region us-central1 --allow-unauthenticated
```

### Compute Engine (Recommended):
```bash
# Create VM
gcloud compute instances create locktrace-node --machine-type=e2-medium --zone=us-central1-a

# SSH and setup
gcloud compute ssh locktrace-node --zone=us-central1-a
# Then follow setup steps above
```

---

**Need Help?** Check the logs:
```bash
# Cloud Run
gcloud run services logs read locktrace-coin

# Compute Engine
pm2 logs locktrace-backend
```

**Good luck with your deployment! 🚀**

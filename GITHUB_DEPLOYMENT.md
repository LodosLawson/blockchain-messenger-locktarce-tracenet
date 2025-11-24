# GitHub'a Yükleme ve Otomatik Deployment Rehberi

## 📦 Adım 1: GitHub'a Yükleme

### 1.1 Git Repository Başlatma
```bash
cd plasma-sojourner
git init
git add .
git commit -m "Initial commit: LockTrace Coin Blockchain Messenger v1.0.0"
```

### 1.2 GitHub'da Repository Oluşturma
1. https://github.com adresine gidin
2. "New repository" butonuna tıklayın
3. Repository adı: `locktrace-coin` (veya istediğiniz isim)
4. Public veya Private seçin
5. **README, .gitignore, license EKLEMEYIN** (zaten var)
6. "Create repository" tıklayın

### 1.3 GitHub'a Push
```bash
# GitHub'dan aldığınız URL'i kullanın
git remote add origin https://github.com/KULLANICI_ADINIZ/locktrace-coin.git
git branch -M main
git push -u origin main
```

✅ **Artık projeniz GitHub'da!**

---

## ☁️ Adım 2: Google Cloud Otomatik Deployment

### Seçenek 1: Cloud Build + Cloud Run (Önerilen - En Kolay)

#### 2.1 Cloud Build Yapılandırması
Proje içinde zaten `cloudbuild.yaml` dosyası var. Bu dosya her GitHub push'unda otomatik build ve deploy yapacak.

#### 2.2 Google Cloud Console'da Ayarlar

**A. Cloud Build API'yi Aktifleştirin:**
```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
```

**B. GitHub'ı Bağlayın:**
1. Google Cloud Console'a gidin: https://console.cloud.google.com
2. Sol menüden **Cloud Build** → **Triggers** seçin
3. **"Connect Repository"** tıklayın
4. **GitHub** seçin
5. GitHub hesabınızı bağlayın (authorize edin)
6. Repository'nizi seçin: `KULLANICI_ADINIZ/locktrace-coin`
7. **"Connect"** tıklayın

**C. Trigger Oluşturun:**
1. **"Create Trigger"** tıklayın
2. Ayarlar:
   - **Name**: `deploy-on-push`
   - **Event**: Push to a branch
   - **Branch**: `^main$`
   - **Configuration**: Cloud Build configuration file (yaml or json)
   - **Location**: Repository → `cloudbuild.yaml`
3. **"Create"** tıklayın

✅ **Artık her `git push` yaptığınızda otomatik deploy olacak!**

#### 2.3 İlk Deployment
```bash
# Herhangi bir değişiklik yapın
git add .
git commit -m "Trigger first deployment"
git push
```

Cloud Build otomatik olarak:
1. Kodu çeker
2. Docker image oluşturur
3. Cloud Run'a deploy eder
4. URL verir

**Deployment'ı İzleyin:**
- Cloud Console → Cloud Build → History
- Veya: `gcloud builds list`

---

### Seçenek 2: Cloud Build + Compute Engine

#### 2.1 VM Oluşturun
```bash
gcloud compute instances create locktrace-node \
  --machine-type=e2-medium \
  --zone=us-central1-a \
  --tags=http-server,https-server
```

#### 2.2 SSH Key Ekleyin
```bash
# SSH key oluşturun
ssh-keygen -t rsa -f ~/.ssh/google_compute_engine -C "USERNAME"

# Public key'i kopyalayın
cat ~/.ssh/google_compute_engine.pub

# Cloud Console → Compute Engine → Metadata → SSH Keys'e ekleyin
```

#### 2.3 VM'de Deployment Script
VM'e SSH ile bağlanın:
```bash
gcloud compute ssh locktrace-node --zone=us-central1-a
```

Deploy script oluşturun:
```bash
nano ~/deploy.sh
```

İçeriği:
```bash
#!/bin/bash
cd /home/USERNAME/locktrace-coin
git pull origin main
npm install
cd client && npm install && npm run build && cd ..
pm2 restart locktrace-backend || pm2 start server.js --name locktrace-backend
```

Executable yapın:
```bash
chmod +x ~/deploy.sh
```

#### 2.4 GitHub Webhook
1. GitHub Repository → Settings → Webhooks
2. Add webhook:
   - Payload URL: `http://YOUR_VM_IP:9000/webhook`
   - Content type: `application/json`
   - Secret: Güçlü bir şifre
3. Save

VM'de webhook listener:
```bash
npm install -g webhook
webhook -hooks hooks.json -verbose
```

`hooks.json`:
```json
[
  {
    "id": "deploy-locktrace",
    "execute-command": "/home/USERNAME/deploy.sh",
    "command-working-directory": "/home/USERNAME/locktrace-coin"
  }
]
```

---

## 🔄 Güncelleme Workflow'u

### Her Değişiklikte:
```bash
# 1. Değişiklik yapın
# 2. Test edin locally
npm start

# 3. Commit edin
git add .
git commit -m "Açıklayıcı mesaj"

# 4. Push edin
git push

# 5. Otomatik deploy başlar! 🚀
```

### Deployment'ı İzleyin:
```bash
# Cloud Build logs
gcloud builds list
gcloud builds log BUILD_ID

# Cloud Run status
gcloud run services describe locktrace-coin --region=us-central1

# Compute Engine'de
pm2 logs locktrace-backend
```

---

## 🎯 Hızlı Başlangıç Komutları

### Tüm Süreci Tek Seferde:
```bash
# 1. Git init ve commit
cd plasma-sojourner
git init
git add .
git commit -m "Initial commit: LockTrace Coin v1.0.0"

# 2. GitHub'a push (önce GitHub'da repo oluşturun)
git remote add origin https://github.com/KULLANICI_ADINIZ/locktrace-coin.git
git branch -M main
git push -u origin main

# 3. Cloud Build aktifleştir
gcloud services enable cloudbuild.googleapis.com run.googleapis.com

# 4. İlk deploy (Cloud Build trigger oluşturduktan sonra)
git commit --allow-empty -m "Trigger deployment"
git push
```

---

## 📊 Deployment Durumu Kontrolü

### Cloud Run:
```bash
# Service durumu
gcloud run services list

# URL'i al
gcloud run services describe locktrace-coin \
  --region=us-central1 \
  --format='value(status.url)'

# Logs
gcloud run services logs read locktrace-coin --region=us-central1
```

### Compute Engine:
```bash
# VM durumu
gcloud compute instances list

# SSH bağlan
gcloud compute ssh locktrace-node --zone=us-central1-a

# PM2 status
pm2 status
pm2 logs
```

---

## 🔧 Sorun Giderme

### Build Başarısız Olursa:
```bash
# Build logs kontrol et
gcloud builds list
gcloud builds log BUILD_ID --stream

# Yaygın sorunlar:
# - Dockerfile hatası → Dockerfile'ı kontrol et
# - Dependency hatası → package.json kontrol et
# - Timeout → Build timeout'u artır
```

### Deployment Başarısız Olursa:
```bash
# Cloud Run logs
gcloud run services logs read locktrace-coin --region=us-central1 --limit=50

# Yaygın sorunlar:
# - Port hatası → Dockerfile EXPOSE 3000 kontrol et
# - Environment variables → .env dosyası kontrol et
# - Memory limit → Cloud Run memory artır
```

---

## 💡 İpuçları

1. **Branch Strategy**: `main` branch production için, `dev` branch development için
2. **Versioning**: Git tags kullanın: `git tag v1.0.0 && git push --tags`
3. **Rollback**: Önceki versiyona dön: `gcloud run services update-traffic locktrace-coin --to-revisions=REVISION=100`
4. **Monitoring**: Cloud Monitoring'i aktifleştirin
5. **Alerts**: Build başarısız olursa email bildirimi ayarlayın

---

## 🎉 Tamamlandı!

Artık sisteminiz:
- ✅ GitHub'da versiyonlanıyor
- ✅ Her push'da otomatik deploy oluyor
- ✅ Google Cloud'da çalışıyor
- ✅ Kolayca güncellenebiliyor

**Sonraki adımlar:**
1. Domain bağlayın
2. SSL sertifikası ekleyin
3. Monitoring kurun
4. Backup stratejisi oluşturun

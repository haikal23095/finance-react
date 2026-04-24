<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/c02a8298-18d5-4b27-8af4-69819217e2f7

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

---

# Panduan Deployment Lokal (Docker)

Gunakan metode ini jika Anda ingin menjalankan aplikasi dan database MySQL di komputer lokal menggunakan Docker.

1.  **Persiapan**: Pastikan Docker dan Docker Compose sudah terinstal.
2.  **Jalankan Stack**:
    ```bash
    docker-compose up --build
    ```
3.  **Akses Aplikasi**: Buka `http://localhost:3000` di browser Anda.
    - Database MySQL lokal berjalan di port `3307` (Host).
    - Konfigurasi database otomatis menggunakan nilai di `docker-compose.yml`.

> **Catatan**: Jika Anda ingin melakukan build manual menggunakan Dockerfile lokal, gunakan: `docker build -f Dockerfile-local -t lux-finance-local .`

---

# Panduan Deployment ke Google Cloud

Ikuti langkah-langkah ini untuk menjalankan aplikasi di Google Cloud Run dengan Google Cloud SQL.

### 1. Persiapan Database (Cloud SQL)

1.  **Buat Instance Cloud SQL**:
    Buat instance MySQL (misal: `db-finance`) di region `asia-southeast2` melalui Google Cloud Console.
2.  **Buat Database**:
    ```bash
    gcloud sql databases create luxfinance --instance=db-finance
    ```
3.  **Buat User Database**:
    ```bash
    gcloud sql users create luxuser --instance=db-finance --password=luxpassword
    ```

### 2. Persiapan Artifact Registry

Google sekarang mewajibkan penggunaan Artifact Registry untuk menyimpan Docker image.

1.  **Buat Repository**:
    ```bash
    gcloud artifacts repositories create cloud-run-source-deploy \
       --repository-format=docker \
       --location=asia-southeast2 \
       --description="Docker repository for Cloud Run"
    ```

### 3. Build & Deploy Manual (Opsional)

Jika ingin mencoba deploy manual tanpa CI/CD:

```bash
# Build
gcloud builds submit --tag asia-southeast2-docker.pkg.dev/$(gcloud config get-value project)/cloud-run-source-deploy/lux-finance

# Deploy
gcloud run deploy lux-finance \
  --image asia-southeast2-docker.pkg.dev/$(gcloud config get-value project)/cloud-run-source-deploy/lux-finance \
  --platform managed \
  --region asia-southeast2 \
  --allow-unauthenticated \
  --add-cloudsql-instances=$(gcloud config get-value project):asia-southeast2:db-finance \
  --set-env-vars="NODE_ENV=production,CLOUD_SQL_CONNECTION_NAME=$(gcloud config get-value project):asia-southeast2:db-finance,MYSQL_USER=luxuser,MYSQL_PASSWORD=luxpassword,MYSQL_DATABASE=luxfinance,JWT_SECRET=BUAT_SECRET_RANDOM_DISINI"
```

### 4. Konfigurasi Lanjutan (Jika Diperlukan)

- **JWT_SECRET**: Buat string acak untuk keamanan token (misal: `openssl rand -base64 32`).
- **Aparatus Izin**: Pastikan Service Account Cloud Run memiliki role **Cloud SQL Client**.
- **Vite Allowed Hosts**: Jika muncul error "Host not allowed", pastikan `allowedHosts: true` sudah terset di `vite.config.ts`.

Aplikasi Anda akan siap digunakan pada URL yang diberikan oleh Cloud Run setelah proses deploy selesai.

---

# Panduan CI/CD (GitHub Actions)

Aplikasi ini sudah dilengkapi dengan workflow GitHub Actions untuk otomatisasi build dan deploy setiap kali Anda melakukan `git push` ke branch `main`.

### 1. Buat Service Account di Google Cloud

1.  Buka **IAM & Admin** > **Service Accounts**.
2.  Buat Service Account baru (misal: `github-actions-deployer`).
3.  Tambahkan role penting ini:
    - `Cloud Build Editor`
    - `Cloud Run Admin`
    - `Cloud SQL Client`
    - `Artifact Registry Administrator` (Wajib untuk push image)
    - `Storage Admin`
    - `Service Account User`
4.  Buat **JSON Key**, download, dan simpan isinya.

### 2. Konfigurasi GitHub Secrets

Buka repository GitHub Anda, pilih **Settings** > **Secrets and variables** > **Actions**, lalu tambahkan secret berikut:

| Nama Secret      | Deskripsi                                         |
| :--------------- | :------------------------------------------------ |
| `GCP_SA_KEY`     | Seluruh isi file JSON Service Account tadi        |
| `MYSQL_USER`     | Username database (contoh: `luxuser`)             |
| `MYSQL_PASSWORD` | Password database (contoh: `luxpassword`)         |
| `MYSQL_DATABASE` | Nama database (contoh: `luxfinance`)              |
| `JWT_SECRET`     | String rahasia untuk JWT token (min. 32 karakter) |

### 3. Aktivasi

Setelah semua secret terpasang, cukup jalankan:

```bash
git add .
git commit -m "Add CI/CD workflow"
git push origin main
```

Pantau prosesnya di tab **Actions** pada repository GitHub Anda.

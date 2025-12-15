# GitHub Actions Deployment Setup Guide

Panduan lengkap untuk setup deployment via GitHub Actions ke Cloudflare.

## Prerequisites

- Repository sudah di-push ke GitHub
- Akun Cloudflare yang akan digunakan untuk production
- Resource Cloudflare (D1, R2, KV) sudah dibuat

---

## Step 1: Buat Cloudflare API Token

1. Login ke [Cloudflare Dashboard](https://dash.cloudflare.com) dengan **akun production**
2. Klik icon profile → **My Profile** → **API Tokens**
3. Klik **Create Token**
4. Pilih template **Edit Cloudflare Workers**
5. Tambahkan permissions:
   - **Account** → **D1** → **Edit**
   - **Account** → **Workers R2 Storage** → **Edit**
   - **Account** → **Workers KV Storage** → **Edit**
   - **Account** → **Cloudflare Pages** → **Edit**
6. Klik **Continue to Summary** → **Create Token**
7. **SIMPAN TOKEN INI** (hanya ditampilkan sekali!)

---

## Step 2: Dapatkan Account ID

1. Di Cloudflare Dashboard, klik **Workers & Pages**
2. Di sidebar kanan, cari **Account ID**
3. Copy Account ID tersebut

---

## Step 3: Setup GitHub Secrets

Pergi ke repository GitHub Anda:
**Settings** → **Secrets and variables** → **Actions**

### Secrets (klik "New repository secret")

| Name | Value | Description |
|------|-------|-------------|
| `CLOUDFLARE_API_TOKEN` | Token dari Step 1 | API Token untuk deploy |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID dari Step 2 | Cloudflare Account ID |
| `D1_DATABASE_ID` | `66127bfc-596b-4601-804d-d072c5e9d224` | D1 Database ID |
| `KV_NAMESPACE_ID` | `291fac0292174d0fa0c455221a05a81a` | KV Namespace ID |

---

## Step 4: Setup GitHub Variables

Masih di halaman yang sama, klik tab **Variables** lalu **New repository variable**

| Name | Value | Description |
|------|-------|-------------|
| `D1_DATABASE_NAME` | `saastemplate` | Nama D1 database |
| `R2_BUCKET_NAME` | `saastemplate` | Nama R2 bucket |
| `PAGES_PROJECT_NAME` | `saas-web` | Nama Pages project |
| `PUBLIC_APP_URL` | `https://saas-web.pages.dev` | URL frontend (update setelah deploy pertama) |
| `PUBLIC_API_URL` | `https://saas-api.<account>.workers.dev` | URL API (update setelah deploy pertama) |

---

## Step 5: Jalankan Migration (Pertama Kali)

1. Di GitHub repo, pergi ke tab **Actions**
2. Klik **Run Database Migrations** di sidebar
3. Klik **Run workflow**
4. Isi:
   - Migration file: `001_initial_schema.sql`
   - Confirm: `yes`
5. Klik **Run workflow**

---

## Step 6: Deploy

Ada 2 cara deploy:

### Otomatis (Recommended)
Setiap push ke branch `main` akan otomatis trigger deployment.

### Manual
1. Di GitHub repo, pergi ke tab **Actions**
2. Klik **Deploy to Cloudflare** di sidebar
3. Klik **Run workflow**
4. Pilih apa yang mau di-deploy
5. Klik **Run workflow**

---

## Step 7: Set Workers Secrets (Auth Secret)

Setelah API berhasil deploy, Anda perlu set secret untuk authentication:

```bash
# Jika menggunakan wrangler CLI (login ke akun production dulu)
wrangler login
wrangler secret put AUTH_SECRET

# Atau via Cloudflare Dashboard:
# Workers & Pages → saas-api → Settings → Variables → Add variable → Encrypt
```

Generate AUTH_SECRET dengan:
```bash
openssl rand -hex 32
```

---

## Troubleshooting

### Error: "Could not find D1 database"
- Pastikan `D1_DATABASE_ID` benar
- Pastikan database ada di akun yang sama dengan API Token

### Error: "Authentication error"
- Pastikan `CLOUDFLARE_API_TOKEN` memiliki semua permission yang diperlukan
- Coba buat token baru dengan permission lengkap

### Error: "Pages project not found"
- Pages project akan otomatis dibuat pada deploy pertama
- Atau buat manual di Cloudflare Dashboard

---

## Struktur Workflow

```
.github/workflows/
├── deploy.yml      # Deploy API & Web on push to main
└── migrate.yml     # Manual database migrations
```

### deploy.yml
- Trigger: Push ke `main` atau manual
- Jobs:
  1. **build** - Install, typecheck, build
  2. **deploy-api** - Deploy ke Workers
  3. **deploy-web** - Deploy ke Pages

### migrate.yml
- Trigger: Manual only
- Menjalankan SQL migrations ke D1 production

---

## Security Notes

- ⚠️ Jangan pernah commit API Token ke repository
- ⚠️ Gunakan GitHub Secrets untuk semua credential
- ⚠️ D1 Database ID dan KV ID sebaiknya juga di Secrets
- ✅ Variables untuk nilai non-sensitif (nama resource, URLs)

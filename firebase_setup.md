# Firebase Setup & Deployment Guide

## Step 1: Create Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add project"**
3. Name it `ipo-tracker` (or any name)
4. Disable Google Analytics (optional) → Click **Create project**

---

## Step 2: Enable Firestore Database

1. In your Firebase project → **Build → Firestore Database**
2. Click **"Create database"**
3. Select **"Start in test mode"** (you'll secure it later)
4. Choose region: `asia-south1 (Mumbai)` for India
5. Click **Done**

---

## Step 3: Firestore Collections Structure

> Firebase is NoSQL — no SQL commands needed. Collections are created automatically when you add the first document. Here is the structure for reference:

### `sectors` collection
| Field | Type | Example |
|---|---|---|
| `name` | string | "Technology" |
| `created_at` | string (ISO) | "2026-02-22T11:00:00Z" |

### `ipos` collection
| Field | Type | Example |
|---|---|---|
| `company_name` | string | "Tata Technologies" |
| `sector_id` | string | "abc123" |
| `sector_name` | string | "Technology" |
| `portfolio` | boolean | true |
| `no_of_shares` | number | 100 |
| `buy_price` | number | 500 |
| `groww_link` | string | "https://groww.in/ipo/..." |
| `listed_on` | string | "22-11-2023" |
| `issue_price` | string | "500" |
| `listing_price` | string | "1200" |
| `issue_size` | string | "₹3043 Cr" |
| `qib_subscription` | string | "186.46x" |
| `nii_subscription` | string | "62.11x" |
| `rii_subscription` | string | "8.67x" |
| `total_subscription` | string | "69.43x" |
| `created_at` | string (ISO) | "2026-02-22T11:00:00Z" |

### `alert_rules` collection
| Field | Type | Example |
|---|---|---|
| `type` | string | "base" / "sector" / "company" |
| `sector_id` | string | "abc123" (only for type=sector) |
| `sector_name` | string | "Technology" (only for type=sector) |
| `company_name` | string | "Tata Tech" (only for type=company) |
| `gain_pct` | number | 15.0 |
| `loss_pct` | number | -15.0 |
| `created_at` | string (ISO) | "2026-02-22T11:00:00Z" |

---

## Step 4: Firestore Security Rules

In Firebase Console → **Firestore → Rules**, paste these rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Backend uses Admin SDK which bypasses these rules.
    // These protect direct browser access.
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

> **Note:** Your FastAPI backend uses the **Admin SDK** which bypasses security rules entirely. These rules prevent unauthorized direct browser writes to your database.

---

## Step 5: Generate Service Account Key

1. Firebase Console → ⚙️ **Project Settings → Service accounts**
2. Click **"Generate new private key"**
3. Download the JSON file (e.g., `service-account.json`)
4. **DO NOT commit this file to Git!** It's in `.gitignore`
5. Open the file — it looks like:
```json
{
  "type": "service_account",
  "project_id": "ipo-tracker-xxxxx",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  ...
}
```
6. You need the **entire JSON content** as a single-line string for env vars

---

## Step 6: Create a `.env` file locally

Copy `.env.example` to `.env`:
```
cp .env.example .env
```

Set `FIREBASE_SERVICE_ACCOUNT_JSON` to the **entire content of your service account JSON** (as one line):
```
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"ipo-tracker-...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",...}
```

---

## Step 7: Set GitHub Secrets

Go to your GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**

Add these secrets:

| Secret Name | Value | Where Used |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Your full service account JSON | FastAPI backend |
| `DISCORD_WEBHOOK_URL` | Your Discord webhook URL | Discord alerts |
| `CRON_SECRET` | Random secret string (generate one) | Secure cron endpoint |
| `VERCEL_APP_URL` | Your production Vercel URL, e.g. `https://ipo-tracker.vercel.app` | Cron job trigger |

### How to generate CRON_SECRET:
Run this in PowerShell:
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

### How to create Discord Webhook:
1. Open Discord → Your server → Right-click a channel → **Edit Channel**
2. **Integrations → Webhooks → New Webhook**
3. Copy the webhook URL

---

## Step 8: Set Vercel Environment Variables

Go to [vercel.com](https://vercel.com) → Your project → **Settings → Environment Variables**

Add these variables:

| Variable | Value | Environment |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Your full JSON string | Production, Preview, Development |
| `DISCORD_WEBHOOK_URL` | Discord webhook URL | Production, Preview, Development |
| `CRON_SECRET` | Same secret as GitHub | Production, Preview, Development |
| `VITE_API_BASE_URL` | `https://your-app.vercel.app` | Production |

> **Important:** `VITE_API_BASE_URL` must be empty or not set for local development (Vite will proxy to `localhost:8000`). Set it to your production URL only on Vercel.

---

## Step 9: Deploy to Vercel

### First time setup:
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from project root
cd ipo_tracker_alert
vercel --prod
```

During setup, Vercel will ask:
- **Set up and deploy?** → Y
- **Which scope?** → Your account
- **Link to existing project?** → N (first time)
- **Project name?** → ipo-tracker (or your choice)
- **In which directory is your code?** → `./` (root)

---

## Step 10: Install Backend Dependencies Locally

```bash
cd backend
pip install -r requirements.txt
playwright install chromium
```

## Step 11: Run Locally

**Terminal 1 — Backend:**
```bash
cd backend
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`

---

## Cron Job Verification

The GitHub Actions cron job runs every weekday at 2:00 PM IST (08:30 UTC).

To manually trigger it:
1. GitHub repo → **Actions → IPO Alert Cron Job**
2. Click **"Run workflow"**

Or test the endpoint directly with Postman/curl:
```bash
curl -X POST https://your-app.vercel.app/api/cron/check-alerts \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

# Supabase Setup & Deployment Guide

You've already created the Supabase project "ipo tracker" — great! Follow these steps to connect it to the app.

---

## Step 1: Run the SQL Schema

1. Go to [supabase.com](https://supabase.com) → **Your "ipo tracker" project**
2. In the left sidebar click **SQL Editor** → **New Query**
3. Open the file [`sql/schema.sql`](sql/schema.sql) in this project
4. Copy the **entire contents** and paste into the SQL Editor
5. Click **▶ Run** (top right)

You should see: `Success. No rows returned`

✅ This creates 3 tables: `sectors`, `ipos`, `alert_rules`

---

## Step 2: Get Your API Keys

1. In your Supabase project → **Settings → API** (left sidebar)
2. Note down:
   - **Project URL** — looks like `https://abcxyz.supabase.co`
   - **service_role** key (under "Project API keys") — starts with `eyJ...`

> ⚠️ Use the **service_role** key (not the `anon` key) for the backend — it bypasses Row Level Security so your FastAPI server can read/write data.

---

## Step 3: Create Local `.env` File

Copy the template and fill in your values:

```bash
# Copy template
copy .env.example .env
```

Edit `.env`:
```
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...

DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
CRON_SECRET=your-random-secret
VITE_API_BASE_URL=
```

---

## Step 4: Run Backend Locally

```powershell
cd backend

# Install dependencies
pip install -r requirements.txt

# Install Playwright browser (for Groww scraping)
playwright install chromium

# Start the FastAPI server
uvicorn main:app --reload --port 8000
```

Test it: open `http://localhost:8000/api/health` — you should see `{"status":"ok",...}`

---

## Step 5: Run Frontend Locally

```powershell
cd frontend
npm run dev
```

Open `http://localhost:5173` — app should load fully.

---

## Step 6: Set GitHub Secrets

Go to your GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Value |
|---|---|
| `SUPABASE_URL` | `https://your-ref.supabase.co` |
| `SUPABASE_SERVICE_KEY` | `eyJ...` (service_role key) |
| `DISCORD_WEBHOOK_URL` | Your Discord webhook URL |
| `CRON_SECRET` | Same string as in your `.env` |
| `VERCEL_APP_URL` | Your production Vercel URL (after deploy) |

### Generate CRON_SECRET (PowerShell):
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

### Create Discord Webhook:
1. Discord → your server → right-click channel → **Edit Channel**
2. **Integrations → Webhooks → New Webhook → Copy URL**

---

## Step 7: Set Vercel Environment Variables

Go to [vercel.com](https://vercel.com) → Your project → **Settings → Environment Variables**

| Variable | Value | Where |
|---|---|---|
| `SUPABASE_URL` | `https://your-ref.supabase.co` | Production + Preview + Dev |
| `SUPABASE_SERVICE_KEY` | `eyJ...` | Production + Preview + Dev |
| `DISCORD_WEBHOOK_URL` | Webhook URL | Production + Preview + Dev |
| `CRON_SECRET` | Your secret | Production + Preview + Dev |
| `VITE_API_BASE_URL` | `https://your-app.vercel.app` | **Production only** |

---

## Step 8: Deploy to Vercel

```powershell
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy from project root
vercel --prod
```

---

## Step 9: Verify Cron Job

The GitHub Actions cron runs every weekday at **2:00 PM IST** (08:30 UTC).

To test it manually:

**Option A** — GitHub Actions:
GitHub repo → **Actions → IPO Alert Cron Job → Run workflow**

**Option B** — Direct API call:
```bash
curl -X POST https://your-app.vercel.app/api/cron/check-alerts \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

---

## Database Tables Reference

| Table | Purpose |
|---|---|
| `sectors` | Stores sector names (Technology, Banking, etc.) |
| `ipos` | Stores all tracked IPO companies and scraped data |
| `alert_rules` | Stores base / sector / company alert thresholds |

View and edit data directly in: Supabase → **Table Editor**

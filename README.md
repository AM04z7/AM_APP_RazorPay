# RetainOps · Razorpay CSM Allocation Desk (`App_AM`)

**RetainOps** is a constrained resource-allocation desk for Razorpay's Customer Success Management (CSM) team, built to defend **₹84.07L of ₹89.72L** in annualized net revenue at risk within a strict **15 human conversation/month** capacity boundary (**93.7% coverage · 374× gross ROI · ₹0 false-alarm spend**).

---

## 1. Quick Start (Local Development)

```bash
cd C:\Ideas\RazorPay\App_AM

# 1. Re-export JSON data from the source Excel workbooks (already pre-generated in src/data/)
npm run export-data

# 2. Start local Vite dev server (includes local /api/ai middleware proxy)
npm run dev
```

---

## 2. Adding Your Claude API Key (`ANTHROPIC_API_KEY`)

Create `.env.local` in `C:\Ideas\RazorPay\App_AM\.env.local` (this file is git-ignored so your key is never pushed to GitHub):

```env
ANTHROPIC_API_KEY=sk-ant-...
```

Because `vite.config.ts` reloads `.env.local` dynamically on every `/api/ai` request, you do **not** need to restart the dev server after adding your key.

---

## 3. Deploying to Friend's GitHub + Vercel

1. **Push `App_AM` as the root of your friend's GitHub repository:**
   ```bash
   cd C:\Ideas\RazorPay\App_AM
   git init
   git add .
   git commit -m "feat: RetainOps CSM Allocation Desk + Edge AI Copilot"
   git branch -M main
   git remote add origin https://github.com/<FRIEND_USERNAME>/<REPO_NAME>.git
   git push -u origin main
   ```
2. **Connect to Vercel:**
   - Import the GitHub repository in Vercel (Root Directory: `./`).
   - Under **Settings → Environment Variables**, add `ANTHROPIC_API_KEY`.
   - Vercel will automatically deploy the Vite frontend and `/api/ai` Edge function (`export const config = { runtime: 'edge' }`).

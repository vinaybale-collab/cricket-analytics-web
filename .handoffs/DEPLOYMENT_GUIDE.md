# Cricket Analytics Deployment Guide
**Created:** 2026-01-22
**Status:** Ready to Deploy

---

## PART 1: Deploy Frontend to Vercel (5 minutes)

### Step 1: Open Vercel
1. Open your browser
2. Go to: **https://vercel.com**
3. Click **"Sign Up"** (top right) if you don't have an account
4. Choose **"Continue with GitHub"**
5. Authorize Vercel to access your GitHub

### Step 2: Import Your Project
1. Once logged in, click **"Add New..."** button (top right)
2. Click **"Project"**
3. You'll see a list of your GitHub repos
4. Find **"cricket-analytics-web"** and click **"Import"**

### Step 3: Configure the Project
1. **Project Name:** `cricketdatabuff` (this becomes your URL)
2. **Framework Preset:** Should auto-detect as "Next.js" - leave it
3. **Root Directory:** Click **"Edit"** and type: `cricket-analytics-web`
4. **Environment Variables:** Click **"Environment Variables"**
   - Name: `NEXT_PUBLIC_BACKEND_URL`
   - Value: `http://localhost:8000` (we'll update this later)
   - Click **"Add"**

### Step 4: Deploy
1. Click **"Deploy"** button
2. Wait 2-3 minutes for build to complete
3. You'll see confetti when done!
4. Your site is now live at: **https://cricketdatabuff.vercel.app**

---

## PART 2: Deploy Backend to Replit (10 minutes)

### Step 1: Create Replit Account
1. Open new browser tab
2. Go to: **https://replit.com**
3. Click **"Sign Up"**
4. Choose **"Continue with Google"** or create account with email

### Step 2: Create New Repl
1. Click **"+ Create Repl"** button (blue button, top left)
2. Search for **"Python"** in templates
3. Select **"Python"**
4. **Title:** `cricket-analytics-backend`
5. Click **"Create Repl"**

### Step 3: Upload Your Files
1. In the left sidebar, you'll see a file tree
2. Click the three dots (**...**) next to "Files"
3. Click **"Upload file"**
4. Navigate to: `C:\Users\Vinay Bale\Documents\cricket_analytics\backend\`
5. Upload these files one by one:
   - `main.py`
   - `requirements.txt`
6. Also upload from `C:\Users\Vinay Bale\Documents\cricket_analytics\`:
   - `cricket_analytics.duckdb` (the database file)

### Step 4: Add Your Gemini API Key
1. In left sidebar, click **"Tools"** (wrench icon)
2. Click **"Secrets"**
3. Click **"+ New Secret"**
4. Key: `GEMINI_API_KEY`
5. Value: Paste your Gemini API key
6. Click **"Add Secret"**

### Step 5: Configure the Run Command
1. Click on the file called **".replit"** (or create it)
2. Replace contents with:
```
run = "pip install -r requirements.txt && uvicorn main:app --host 0.0.0.0 --port 8000"
```
3. Save the file (Ctrl+S)

### Step 6: Run the Backend
1. Click the big green **"Run"** button at the top
2. Wait for packages to install (1-2 minutes)
3. You'll see: `Uvicorn running on http://0.0.0.0:8000`
4. **IMPORTANT:** Copy the URL shown in the "Webview" panel
   - It looks like: `https://cricket-analytics-backend.yourusername.repl.co`

---

## PART 3: Connect Frontend to Backend (2 minutes)

### Step 1: Go Back to Vercel
1. Go to: **https://vercel.com/dashboard**
2. Click on your project **"cricketdatabuff"**

### Step 2: Update Environment Variable
1. Click **"Settings"** tab (top menu)
2. Click **"Environment Variables"** (left sidebar)
3. Find `NEXT_PUBLIC_BACKEND_URL`
4. Click the three dots (**...**) → **"Edit"**
5. Change the value to your Replit URL:
   - Example: `https://cricket-analytics-backend.yourusername.repl.co`
6. Click **"Save"**

### Step 3: Redeploy
1. Click **"Deployments"** tab (top menu)
2. Find the latest deployment
3. Click the three dots (**...**) → **"Redeploy"**
4. Click **"Redeploy"** in the popup
5. Wait 2 minutes

---

## PART 4: Get Your Gemini API Key (if you don't have one)

1. Go to: **https://makersuite.google.com/app/apikey**
2. Sign in with Google account
3. Click **"Create API Key"**
4. Copy the key
5. Use this in Replit Secrets (Part 2, Step 4)

---

## YOUR FINAL URLs

| What | URL |
|------|-----|
| **Your Website** | https://cricketdatabuff.vercel.app |
| **Backend API** | https://cricket-analytics-backend.yourusername.repl.co |

---

## COST PROTECTION

Your backend has built-in protection:
- **Daily limit:** 1,400 Gemini requests
- **When limit reached:** Returns "Daily limit reached. Service resumes tomorrow."
- **You will NEVER be charged**

Check remaining requests: Visit `https://your-backend-url/rate-limit`

---

## IF SOMETHING GOES WRONG

### Frontend not loading?
- Check Vercel dashboard for error messages
- Make sure Root Directory is set to `cricket-analytics-web`

### Backend not connecting?
- Make sure Replit is running (green "Run" button)
- Check that GEMINI_API_KEY secret is set
- Verify the URL in Vercel matches your Replit URL exactly

### "CORS error" in browser?
- The backend already has CORS configured for Vercel
- Make sure you're using HTTPS URLs

---

## WHAT WAS IMPLEMENTED

### Backend Endpoints (main.py)
- `POST /analyze` - Simple query analysis
- `POST /analyze-deep` - Multi-step agentic analysis
- `POST /finalize` - Synthesize conversation into article
- `POST /validate` - Validation agent verifies claims
- `POST /publish` - Save validated project
- `GET /rate-limit` - Check remaining free requests

### Frontend Features
- Landing page with workflow diagram
- Chat interface with Finalize/Publish buttons
- Project pages with executive summaries
- "Connect with Me" button (emails vinay.bale@gmail.com)

---

## NEXT SESSION TODO

If continuing in a new session:
1. Test the live deployment end-to-end
2. Add more sample projects if needed
3. Consider adding the database to Replit permanently

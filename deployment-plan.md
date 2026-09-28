# Milestone 1: Nutrition Bot Deployment Plan

This document outlines the steps to deploy the complete Next.js full-stack application (React frontend + `/api/chat` backend) to either **Render** or **Vercel**.

## Architecture & Database Considerations

- **Framework**: Next.js (App Router). The frontend and backend are bundled together.
- **Backend API**: The model interaction (`/api/chat`) runs securely on the server-side, protecting the `GROQ_API_KEY`.
- **Database**: The project currently uses `better-sqlite3` for local storage. 
  - ⚠️ **Important Note for Serverless (Vercel)**: Vercel functions are stateless and ephemeral. A local SQLite database (`nutrition-bot.db`) will NOT persist data across different requests or deployments on Vercel. 
  - **Render** is recommended for this milestone if you want to retain persistent chat history using SQLite, as you can attach a persistent disk.

---

## Preparation (Both Platforms)

Before deploying to either platform, push your code to a GitHub repository:

```bash
git add .
git commit -m "Milestone 1: Complete nutrition bot prototype"
git remote add origin <YOUR_GITHUB_REPO_URL>
git branch -M main
git push -u origin main
```

---

## Option 1: Deploying to Render (Recommended for SQLite Persistence)

Render allows you to run a long-lived Node.js server and attach a persistent disk, which is perfect for keeping your SQLite database intact.

### 1. Create a Web Service
1. Log in to [Render](https://render.com/).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub account and select your `nutrition-bot` repository.

### 2. Configure Settings
Fill out the service details:
- **Name**: `nutrition-bot` (or your choice)
- **Root Directory**: `nutrition-bot` (Since the Next.js app is inside this folder)
- **Environment**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start`

### 3. Add a Persistent Disk (Crucial for SQLite)
1. Scroll down to **Advanced**.
2. Click **Add Disk**.
3. Name the disk (e.g., `sqlite-data`).
4. Set the Mount Path to `/data`.
5. Size: 1GB (Free/Starter tier is sufficient).

### 4. Set Environment Variables
In the **Environment Variables** section, add the following:
- `GROQ_API_KEY`: `<Your_Groq_API_Key>`
- `SQLITE_DB_PATH`: `/data/nutrition-bot.db` (This tells the app to store the database on the persistent disk you just mounted).

### 5. Deploy
Click **Create Web Service**. Render will build and deploy your Next.js app. Your live URL will be available at the top of the dashboard (e.g., `https://nutrition-bot-xyz.onrender.com`).

---

## Option 2: Deploying to Vercel (Fastest, but stateless SQLite)

Vercel is the native platform for Next.js and offers the fastest deployment. However, any chat history saved to the SQLite database will be reset periodically because Vercel uses ephemeral serverless functions.

### 1. Import Project
1. Log in to [Vercel](https://vercel.com/).
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository.

### 2. Configure Project
- **Framework Preset**: Next.js (should be auto-detected).
- **Root Directory**: Click "Edit" and select `nutrition-bot`.
- **Build and Output Settings**: Leave as default (`npm run build`).

### 3. Set Environment Variables
Expand the **Environment Variables** section and add:
- `GROQ_API_KEY`: `<Your_Groq_API_Key>`
*(Note: You do not need to set `SQLITE_DB_PATH` here; it will default to the ephemeral `/tmp` or local directory, which is fine for stateless testing).*

### 4. Deploy
Click **Deploy**. Vercel will build your project and provide a live URL (e.g., `https://nutrition-bot.vercel.app`).

---

## Post-Deployment Verification

Once deployed on either platform, visit your live URL and test the following:
1. **Send a valid query** (e.g., "What is Vitamin C?") and ensure the bot responds and extracts claims.
2. **Test Scope Guard** (e.g., "How many calories should I eat?") and ensure it declines.
3. **Check the Excel Spreadsheet Log** tab to verify that your live queries are being successfully logged and categorized in production.

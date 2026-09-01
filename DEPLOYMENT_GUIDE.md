# 🚀 Continuum — Cloud & Production Deployment Guide

This guide outlines the deployment options for **Continuum (Decision Archaeology Agent)** to get your live public URL for demos and judging.

---

## 📋 Required Environment Variables

Before deploying, ensure you have these 4 environment variables ready:

| Variable | Description | Example / Where to Get |
|:---|:---|:---|
| `OPENROUTER_API_KEY` | LLM synthesis API key | [openrouter.ai/keys](https://openrouter.ai/keys) |
| `SUPABASE_URL` | Supabase project URL | `https://xyzcompany.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase service role secret | Supabase Settings → API → `service_role` |
| `GITHUB_TOKEN` | GitHub Personal Access Token | [github.com/settings/tokens](https://github.com/settings/tokens) |

---

## 🥇 Option 1: Render (Recommended — Free & 1-Click with Docker)

Render supports containerized FastAPI apps with zero size limits on PyTorch or embeddings.

### Steps:
1. Go to [dashboard.render.com](https://dashboard.render.com) and click **"New +" → "Web Service"**.
2. Connect your GitHub repository: `https://github.com/Monish-D609/continuum-decision-archaeology`.
3. Configure the service:
   - **Name:** `continuum-agent` (or your choice)
   - **Runtime:** `Docker` (automatically detects [`Dockerfile`](file:///c:/Users/Monish%20D/Documents/Tribal%20Loss/Dockerfile))
   - **Instance Type:** `Free`
4. Under **Environment Variables**, add:
   - `OPENROUTER_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `GITHUB_TOKEN`
5. Click **"Deploy Web Service"**.
6. Render will build the Docker container and provide a live URL like:  
   `https://continuum-agent.onrender.com`

---

## 🥈 Option 2: Railway (Fastest GitHub Sync)

Railway automatically detects Dockerfile/Procfile and deploys in under 2 minutes.

### Steps:
1. Go to [railway.com](https://railway.com) and log in with GitHub.
2. Click **"New Project" → "Deploy from GitHub repo"**.
3. Select `Monish-D609/continuum-decision-archaeology`.
4. Click **"Add Variables"** and paste your 4 environment variables.
5. In **Settings → Networking**, click **"Generate Domain"** to get a public `.up.railway.app` URL.

---

## 🥉 Option 3: Fly.io (Global Edge Deployment)

Fly.io runs Docker apps on Firecracker micro-VMs close to users.

### Steps:
```bash
# 1. Install flyctl if not installed
# Windows: pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"

# 2. Authenticate
fly auth login

# 3. Launch app (reads Dockerfile automatically)
fly launch --name continuum-decision-archaeology --no-deploy

# 4. Set secrets
fly secrets set OPENROUTER_API_KEY="your_key" \
                SUPABASE_URL="https://your-proj.supabase.co" \
                SUPABASE_SERVICE_KEY="your_key" \
                GITHUB_TOKEN="your_key"

# 5. Deploy
fly deploy
```

---

## 🐳 Option 4: Self-Hosted Docker / VPS (DigitalOcean, AWS, GCP, Hetzner)

If you have a Linux VPS (Ubuntu/Debian):

```bash
# 1. Clone repo
git clone https://github.com/Monish-D609/continuum-decision-archaeology.git
cd continuum-decision-archaeology

# 2. Create .env file
cat <<EOF > .env
OPENROUTER_API_KEY=your_key
SUPABASE_URL=https://your-proj.supabase.co
SUPABASE_SERVICE_KEY=your_key
GITHUB_TOKEN=your_token
PORT=8000
EOF

# 3. Build and launch with Docker Compose
docker compose up -d --build

# 4. Verify health
curl http://localhost:8000/api/health
```

---

## ⚠️ Important Live Demo Checklist

1. **Supabase Inactivity Pause:** Free-tier Supabase projects pause after 7 days of inactivity. Visit your Supabase dashboard to verify your project is active before presenting.
2. **Cold Starts:** Free-tier Render/Fly services sleep after 15 minutes of idle time. Ping `https://your-app-url/api/health` 2 minutes before your live judging slot so the container is warm.
3. **CORS:** The FastAPI app has `allow_origins=["*"]` configured by default, so it can be accessed from any frontend domain or iframe.

# Learnify Deployment & Continuous Integration Guide

This guide explains how to configure server-side AI credentials (`OPENROUTER_API_KEY`) in Vercel and connect your GitHub repository & Personal Access Token (PAT) for continuous deployment.

---

## Architecture Note

Learnify uses a **server-side API proxy** (`/api/index.ts` → `/server/apiApp.ts`) so that API secrets remain strictly on the server and are never bundled into client-side browser code:

- `OPENROUTER_API_KEY` — Primary server-side OpenRouter key (required for AI Tutor, MCQ Generator, Notes, Explainer, Lab Assistant, and Sindhi Voice Explainer).
- `OPENROUTER_MODEL` *(optional)* — Model slug such as `google/gemini-4-hydrogen` (never enter an API key here).
- `GEMINI_API_KEY` *(optional)* — Fallback server-side Google Gemini API key.
- `APP_URL` *(optional)* — Production URL (e.g. `https://learnify-ten-olive.vercel.app`) used for OpenRouter `HTTP-Referer` headers and SEO sitemap generation.

> **Security Rule:** Never use `VITE_OPENROUTER_API_KEY` for production secrets, and never commit `.env` files, API keys, or GitHub/Vercel tokens into source files or `.git/config`.

---

## Part 1: Add `OPENROUTER_API_KEY` to Vercel Environment Variables

### Option A: Vercel Dashboard (Recommended)

1. Sign in to [Vercel Dashboard](https://vercel.com/dashboard) and select your **learnify** project.
2. Open **Settings** → **Environment Variables** in the left navigation.
3. Click **Add New** and configure the primary key:
   - **Key:** `OPENROUTER_API_KEY`
   - **Value:** `<YOUR_OPENROUTER_API_KEY>` (starts with `sk-or-v1-...`)
   - **Environments:** Check **Production**, **Preview**, and **Development**.
   - Toggle **Sensitive** on (recommended) and click **Save**.
4. *(Recommended)* Add `APP_URL`:
   - **Key:** `APP_URL`
   - **Value:** `https://learnify-ten-olive.vercel.app`
   - **Environments:** Check **Production** and **Preview**.
   - Click **Save**.
5. *(Optional)* Add a custom model or Gemini fallback:
   - `OPENROUTER_MODEL` → `google/gemini-4-hydrogen` *(must be a `provider/model` slug, not an API key)*
   - `GEMINI_API_KEY` → `<YOUR_GEMINI_API_KEY>` *(fallback when OpenRouter is unreachable or rate-limited)*
6. **Redeploy to apply changes:**
   - Environment variable changes only take effect on **new deployments**.
   - Go to the **Deployments** tab, open the `...` menu on the latest deployment, and click **Redeploy**.

### Option B: Vercel CLI or Helper Script

You can map all environment variables interactively using the repository script:

```bash
chmod +x scripts/configure-vercel-env.sh
./scripts/configure-vercel-env.sh
```

Or map them directly with Vercel CLI using your Vercel access token (`VERCEL_TOKEN` kept only in your local shell session):

```bash
export VERCEL_TOKEN="<YOUR_VERCEL_TOKEN>"

# Link local directory if not linked yet
npx vercel link --token "$VERCEL_TOKEN"

# Add OPENROUTER_API_KEY to Production & Preview
printf '%s' "<YOUR_OPENROUTER_API_KEY>" | npx vercel env add OPENROUTER_API_KEY production --token "$VERCEL_TOKEN"
printf '%s' "<YOUR_OPENROUTER_API_KEY>" | npx vercel env add OPENROUTER_API_KEY preview --token "$VERCEL_TOKEN"

# Optional production URL
printf '%s' "https://learnify-ten-olive.vercel.app" | npx vercel env add APP_URL production --token "$VERCEL_TOKEN"

# Trigger a fresh production deployment
npx vercel --prod --yes --token "$VERCEL_TOKEN"
```

---

## Part 2: Link Your GitHub Access Token for Continuous Deployment

Vercel deploys automatically whenever commits are pushed to your linked GitHub branch (`main`).

### Step 1: Connect the GitHub Repository in Vercel Project Settings

1. In your Vercel project, go to **Settings** → **Git**.
2. Under **Connected Git Repository**, click **Connect Git Repository** (or verify it points to `meernot1-svg/Learnify-`).
3. Authorize Vercel's GitHub App when prompted and grant repository access (`Learnify-`).
4. Set **Production Branch** to `main`.
5. Every `git push origin main` will now trigger an automatic production build and deployment on Vercel, and every Pull Request will generate a Preview URL.

### Step 2: Configure Your GitHub Personal Access Token (PAT) for Automated Pushes & CI/CD

#### A. GitHub Actions Continuous Deployment (Recommended for Team/Automated Pipelines)

If you run automated checks or deployments from GitHub Actions:

1. Generate a fine-grained or classic GitHub PAT (`repo`, `workflow` scopes if needed) and a Vercel Token (`https://vercel.com/account/tokens`).
2. In your GitHub repository, open **Settings** → **Secrets and variables** → **Actions**.
3. Click **New repository secret** and add:
   - `VERCEL_TOKEN`: `<YOUR_VERCEL_TOKEN>`
   - `VERCEL_ORG_ID`: Your Vercel Team/User ID (found in `.vercel/project.json` after `vercel link` or **Team Settings**)
   - `VERCEL_PROJECT_ID`: Your Vercel Project ID (found in **Project Settings → General**)
   - `GH_PAT` *(only needed if a workflow pushes back or accesses other private repos)*: `<YOUR_GITHUB_PAT>`

#### B. Local Git CLI Push Authentication (Without Saving Tokens in `.git/config`)

Avoid embedding a token directly inside the remote URL (`https://<TOKEN>@github.com/...`), because that writes your secret to `.git/config` on disk. Instead:

1. Keep the clean remote URL:
   ```bash
   git remote set-url origin https://github.com/meernot1-svg/Learnify-.git
   ```
2. Either store credentials safely in your OS keychain:
   ```bash
   # macOS
   git config --global credential.helper osxkeychain
   # Linux (libsecret / cache for 1 hour)
   git config --global credential.helper 'cache --timeout=3600'
   ```
   When `git push origin main` prompts for your password, paste `<YOUR_GITHUB_PAT>`.
3. Or pass the PAT ephemerally for a single push command:
   ```bash
   GH_AUTH=$(printf 'x-access-token:%s' "<YOUR_GITHUB_PAT>" | base64 -w 0)
   git -c "http.extraHeader=Authorization: Basic $GH_AUTH" push origin main
   ```

#### C. Optional: Vercel Deploy Hook URL

If external tools need to trigger a rebuild of `main` without pushing a commit:

1. In Vercel, open **Settings** → **Git** → **Deploy Hooks**.
2. Create a hook named `Main Redeploy` for branch `main`.
3. Trigger a redeploy at any time with:
   ```bash
   curl -X POST "<YOUR_VERCEL_DEPLOY_HOOK_URL>"
   ```

---

## Part 3: Verify the Live Deployment

After deploying, confirm that the serverless API proxy and environment variables are active:

1. Check AI provider health:
   ```bash
   curl -sS https://learnify-ten-olive.vercel.app/api/ai/status
   ```
   Expected response when `OPENROUTER_API_KEY` is configured:
   ```json
   {
     "configured": true,
     "provider": "openrouter",
     "providers": { "openrouter": true, "gemini": false },
     "openrouterModelMode": "default"
   }
   ```
2. Test a live AI request:
   ```bash
   curl -sS -X POST https://learnify-ten-olive.vercel.app/api/ai/chat \
     -H "Content-Type: application/json" \
     -d '{"message":"Say hello in 3 words"}'
   ```
3. If OpenRouter is temporarily unreachable, rate-limited, or misconfigured, the API proxy returns a structured HTTP status (`503`/`504`/`429`/`401`) and Learnify automatically shows an error toast banner in the UI instead of failing silently.

---

## Token Rotation Reminder

If an API key, Vercel token, or GitHub PAT is ever pasted into chat logs, scripts, or screenshots, immediately revoke and regenerate it in:
- **OpenRouter:** Keys → Revoke & Create New Key
- **Vercel:** Account Settings → Tokens
- **GitHub:** Developer Settings → Personal Access Tokens

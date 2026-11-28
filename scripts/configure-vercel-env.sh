#!/usr/bin/env bash
set -euo pipefail

# Maps server-side AI environment variables to the linked Vercel project
# across Production, Preview, and Development targets without exposing secrets.

if ! command -v vercel >/dev/null 2>&1; then
  echo "Error: Vercel CLI is not installed. Install with: npm i -g vercel"
  exit 1
fi

if ! vercel whoami >/dev/null 2>&1; then
  echo "You are not logged in to Vercel CLI. Starting login..."
  vercel login
fi

if [ ! -f ".vercel/project.json" ]; then
  echo "Linking this directory to your Vercel project..."
  vercel link
fi

upsert_vercel_env() {
  local name="$1"
  local value="$2"
  if [ -z "$value" ]; then
    return 0
  fi

  for env_target in production preview development; do
    vercel env rm "$name" "$env_target" -y >/dev/null 2>&1 || true
    printf '%s' "$value" | vercel env add "$name" "$env_target" >/dev/null
    echo "Mapped $name -> $env_target"
  done
}

echo "Enter your OpenRouter API key (input hidden, starts with sk-or-...):"
read -r -s OPENROUTER_KEY_INPUT
echo ""

if [ -z "$OPENROUTER_KEY_INPUT" ]; then
  echo "Error: OPENROUTER_API_KEY cannot be empty."
  exit 1
fi

echo "Optional: Enter GEMINI_API_KEY fallback (press Enter to skip, input hidden):"
read -r -s GEMINI_KEY_INPUT
echo ""

echo "Optional: Enter OPENROUTER_MODEL slug (default: google/gemini-4-hydrogen, press Enter to skip):"
read -r OPENROUTER_MODEL_INPUT

if [[ "$OPENROUTER_MODEL_INPUT" == sk-* ]] || [[ "$OPENROUTER_MODEL_INPUT" == AIza* ]]; then
  echo "Error: OPENROUTER_MODEL must be a model slug like google/gemini-4-hydrogen, not an API key."
  exit 1
fi

echo "Optional: Enter production APP_URL (default: https://learnify-ten-olive.vercel.app, press Enter to use default):"
read -r APP_URL_INPUT
APP_URL_INPUT="${APP_URL_INPUT:-https://learnify-ten-olive.vercel.app}"

upsert_vercel_env "OPENROUTER_API_KEY" "$OPENROUTER_KEY_INPUT"
if [ -n "$GEMINI_KEY_INPUT" ]; then
  upsert_vercel_env "GEMINI_API_KEY" "$GEMINI_KEY_INPUT"
fi
if [ -n "$OPENROUTER_MODEL_INPUT" ]; then
  upsert_vercel_env "OPENROUTER_MODEL" "$OPENROUTER_MODEL_INPUT"
fi
upsert_vercel_env "APP_URL" "$APP_URL_INPUT"

echo ""
echo "Environment variables updated in Vercel."
echo "Next step: run 'vercel --prod' (or push to GitHub) so the latest /api/ai/* routes and secrets take effect."

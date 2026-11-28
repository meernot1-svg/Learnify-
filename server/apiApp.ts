import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

const DEFAULT_OPENROUTER_MODEL = 'google/gemini-4-hydrogen';
const FALLBACK_OPENROUTER_MODELS = [
  'google/gemini-3.8-flash',
  'google/gemini-3.5-flash-lite',
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
  'openrouter/free',
];

function redactSensitiveTokens(text: string): string {
  return text
    .replace(/sk-or-[A-Za-z0-9_-]{8,}/g, '[REDACTED_KEY]')
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, '[REDACTED_KEY]')
    .replace(/AIza[A-Za-z0-9_-]{12,}/g, '[REDACTED_KEY]');
}

function normalizeEnvSecret(value: string | undefined): string {
  const trimmed = (value || '').trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function getOpenRouterKey(): string {
  return normalizeEnvSecret(process.env.OPENROUTER_API_KEY);
}

function getConfiguredOpenRouterModel(): string {
  const raw = normalizeEnvSecret(process.env.OPENROUTER_MODEL);
  if (!raw) return '';
  if (/^(sk-|AIza|ghp_|xox[a-z]-)/i.test(raw) || /\s/.test(raw)) {
    return '';
  }
  if (!/^[a-z0-9._-]+\/[a-z0-9._:-]+$/i.test(raw)) {
    return '';
  }
  return raw;
}

function getGeminiKey(): string {
  return normalizeEnvSecret(process.env.GEMINI_API_KEY);
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    throw new Error('AI API key is not configured. Add OPENROUTER_API_KEY or GEMINI_API_KEY in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function executeWithAiFallback<T>(
  runOpenRouter: () => Promise<T>,
  runGemini: () => Promise<T>
): Promise<T> {
  const hasOpenRouter = Boolean(getOpenRouterKey());
  const hasGemini = Boolean(getGeminiKey());

  if (!hasOpenRouter && !hasGemini) {
    throw new Error('AI API key is not configured. Add OPENROUTER_API_KEY or GEMINI_API_KEY in Settings > Secrets.');
  }

  if (hasOpenRouter) {
    try {
      return await runOpenRouter();
    } catch (openRouterErr) {
      if (hasGemini) {
        return await runGemini();
      }
      throw openRouterErr;
    }
  }

  return await runGemini();
}

type OpenRouterContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
  | { type: 'file'; file: { filename: string; file_data: string } };

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | OpenRouterContentPart[];
}

function buildOpenRouterAttachmentPart(base64Data: string, mimeType: string): OpenRouterContentPart {
  const dataUri = `data:${mimeType};base64,${base64Data}`;
  if (mimeType.startsWith('image/')) {
    return { type: 'image_url', image_url: { url: dataUri } };
  }
  return {
    type: 'file',
    file: {
      filename: 'uploaded-material.pdf',
      file_data: dataUri,
    },
  };
}

class OpenRouterProxyError extends Error {
  status: number;
  code: string;
  retryable: boolean;

  constructor(message: string, status = 502, code = 'OPENROUTER_ERROR', retryable = true) {
    super(redactSensitiveTokens(message));
    this.name = 'OpenRouterProxyError';
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

function classifyNetworkError(err: unknown, providerName = 'OpenRouter'): OpenRouterProxyError {
  const errObj = err as { name?: string; message?: string; cause?: { code?: string; message?: string } };
  const name = String(errObj?.name || '');
  const msg = String(errObj?.message || '');
  const causeCode = String(errObj?.cause?.code || '');

  if (name === 'TimeoutError' || name === 'AbortError' || /timed out|timeout/i.test(msg)) {
    return new OpenRouterProxyError(
      `${providerName} timed out while generating a response. Please try a shorter prompt or retry.`,
      504,
      'AI_TIMEOUT',
      true
    );
  }

  if (
    /ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ECONNRESET|ETIMEDOUT|ENETUNREACH|fetch failed|network/i.test(
      `${causeCode} ${msg}`
    )
  ) {
    return new OpenRouterProxyError(
      `Unable to reach ${providerName} AI servers right now. Please check connectivity and try again.`,
      503,
      'AI_UNREACHABLE',
      true
    );
  }

  return new OpenRouterProxyError(
    redactSensitiveTokens(msg || `${providerName} connection failed.`),
    502,
    'AI_UPSTREAM_FAILURE',
    true
  );
}

function parseJsonSafe(rawText: string): any {
  if (!rawText || !rawText.trim()) return {};
  try {
    return JSON.parse(rawText);
  } catch {
    return {};
  }
}

async function callOpenRouter(
  messages: OpenRouterMessage[],
  expectJson = false,
  preferFast = false
): Promise<string> {
  const apiKey = getOpenRouterKey();
  if (!apiKey) {
    throw new OpenRouterProxyError(
      'OPENROUTER_API_KEY is not configured. Add it in Vercel Project Settings -> Environment Variables.',
      503,
      'AI_NOT_CONFIGURED',
      false
    );
  }
  const configuredModel = getConfiguredOpenRouterModel();
  const baseModels = preferFast
    ? ['google/gemini-3.8-flash', 'google/gemini-3.5-flash-lite', DEFAULT_OPENROUTER_MODEL, ...FALLBACK_OPENROUTER_MODELS]
    : [DEFAULT_OPENROUTER_MODEL, ...FALLBACK_OPENROUTER_MODELS];
  const candidates = Array.from(
    new Set([...(configuredModel ? [configuredModel] : []), ...baseModels])
  );
  const appUrl =
    (process.env.APP_URL || '').trim() ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : '') ||
    'https://learnify-ten-olive.vercel.app';

  let lastError: OpenRouterProxyError = new OpenRouterProxyError(
    'OpenRouter AI service did not return a valid response.',
    502,
    'AI_UPSTREAM_FAILURE',
    true
  );

  for (let i = 0; i < candidates.length; i++) {
    const model = candidates[i];
    const hasMore = i < candidates.length - 1;
    const body: Record<string, unknown> = {
      model,
      messages,
    };
    if (expectJson) {
      body.temperature = 0.3;
    }

    let response: Response;
    try {
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': appUrl,
          'X-Title': 'Learnify',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(45000),
      });
    } catch (networkErr) {
      lastError = classifyNetworkError(networkErr, 'OpenRouter');
      if (hasMore) continue;
      throw lastError;
    }

    const rawText = await response.text().catch(() => '');
    const payload = parseJsonSafe(rawText);

    // OpenRouter can occasionally return HTTP 200 with an embedded upstream error payload
    if (payload?.error) {
      const embeddedMsg = redactSensitiveTokens(
        String(payload.error?.message || payload.error || 'Upstream OpenRouter provider error.')
      );
      const embeddedCode = Number(payload.error?.code) || response.status || 502;
      if (embeddedCode === 401 || embeddedCode === 403) {
        throw new OpenRouterProxyError(
          'OpenRouter API key is invalid or unauthorized. Please verify OPENROUTER_API_KEY.',
          401,
          'AI_AUTH_INVALID',
          false
        );
      }
      if (embeddedCode === 402) {
        lastError = new OpenRouterProxyError(
          'OpenRouter account has insufficient credits for this model.',
          402,
          'AI_INSUFFICIENT_CREDITS',
          false
        );
        if (hasMore) continue;
        throw lastError;
      }
      lastError = new OpenRouterProxyError(
        embeddedMsg,
        embeddedCode >= 400 && embeddedCode < 600 ? embeddedCode : 502,
        embeddedCode === 429 ? 'AI_RATE_LIMITED' : 'AI_UPSTREAM_FAILURE',
        true
      );
      if (hasMore) continue;
      throw lastError;
    }

    if (response.ok) {
      const content = payload?.choices?.[0]?.message?.content;
      const extracted =
        typeof content === 'string'
          ? content
          : Array.isArray(content)
          ? content.map((part: any) => (typeof part?.text === 'string' ? part.text : '')).join('')
          : '';
      if (extracted.trim()) {
        return extracted;
      }
      lastError = new OpenRouterProxyError(
        'OpenRouter returned an empty response. Please try again.',
        502,
        'AI_EMPTY_RESPONSE',
        true
      );
      if (hasMore) continue;
      throw lastError;
    }

    const providerMessage = redactSensitiveTokens(
      String(
        payload?.error?.message ||
          (response.status === 502 || response.status === 503
            ? `OpenRouter AI gateway is temporarily unavailable (HTTP ${response.status}).`
            : response.status === 504
            ? 'OpenRouter AI gateway timed out (HTTP 504).'
            : `OpenRouter request failed (HTTP ${response.status}).`)
      )
    );
    if (response.status === 401 || response.status === 403) {
      throw new OpenRouterProxyError(
        'OpenRouter API key is invalid or unauthorized. Please check OPENROUTER_API_KEY in Vercel/Secrets.',
        401,
        'AI_AUTH_INVALID',
        false
      );
    }
    if (response.status === 429) {
      lastError = new OpenRouterProxyError(
        'AI request quota temporarily exceeded. Please wait a moment and try again.',
        429,
        'AI_RATE_LIMITED',
        true
      );
      if (hasMore) continue;
      throw lastError;
    }
    if (response.status === 402) {
      lastError = new OpenRouterProxyError(
        'OpenRouter account has insufficient credits for this model.',
        402,
        'AI_INSUFFICIENT_CREDITS',
        false
      );
      if (hasMore) continue;
      throw lastError;
    }
    lastError = new OpenRouterProxyError(
      providerMessage,
      response.status >= 500 ? response.status : 502,
      response.status === 504 || response.status === 408 ? 'AI_TIMEOUT' : 'AI_UPSTREAM_FAILURE',
      true
    );
    if (
      hasMore &&
      (response.status === 400 ||
        response.status === 404 ||
        response.status === 408 ||
        response.status === 422 ||
        response.status >= 500)
    ) {
      continue;
    }
    throw lastError;
  }

  throw lastError;
}

function parseJsonArrayResponse(rawText: string): unknown[] {
  const cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start !== -1 && end > start) {
      try {
        const sliced = JSON.parse(cleaned.slice(start, end + 1));
        if (Array.isArray(sliced)) return sliced;
      } catch {}
    }
  }
  return [];
}

// Server-side scrypt hash store for first-run Mentor access code claim when MENTOR_ACCESS_CODE env is unset
let claimedMentorHash: { salt: string; hash: string } | null = null;
let claimedAdminHash: { salt: string; hash: string } | null = null;
const ADMIN_SESSION_SECRET =
  (process.env.ADMIN_SESSION_SECRET || '').trim() || crypto.randomBytes(32).toString('hex');

function hashPasscode(passcode: string, salt?: string): { salt: string; hash: string } {
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(passcode, useSalt, 64).toString('hex');
  return { salt: useSalt, hash: derived };
}

function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function createAdminSessionToken(): string {
  const exp = Date.now() + 4 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ scope: 'admin', exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', ADMIN_SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyAdminSessionToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', ADMIN_SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  if (!timingSafeCompare(sig, expectedSig)) return false;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return decoded?.scope === 'admin' && typeof decoded?.exp === 'number' && decoded.exp > Date.now();
  } catch {
    return false;
  }
}

function resolveLanguageInstruction(rawLang: unknown): string {
  switch (rawLang) {
    case 'ur':
      return 'Respond clearly in standard Urdu (اردو script) while keeping scientific symbols, units, and formulas accurate.';
    case 'ur-latn':
      return 'Respond in clear, natural Roman Urdu (Urdu written in Latin letters) while keeping scientific terms and formulas accurate.';
    case 'sd':
      return 'Respond clearly in standard Sindhi (سنڌي script) while preserving accurate scientific symbols and formulas.';
    default:
      return '';
  }
}

const VALID_LAB_ASSISTANT_ACTIONS = new Set([
  'experiment-plan',
  'what-if',
  'lab-rescue',
  'practical-report',
  'viva-question',
  'viva-evaluate',
  'misconception-diagnose',
  'misconception-verify',
  'local-explorer',
  'teacher-assistant',
  'code-debug',
  'smart-exam',
]);

function isAllowedMimeType(mimeType: unknown): mimeType is string {
  if (typeof mimeType !== 'string') return false;
  return mimeType.startsWith('image/') || mimeType === 'application/pdf';
}

function formatAiError(err: unknown): {
  status: number;
  message: string;
  code: string;
  retryable: boolean;
} {
  if (err instanceof OpenRouterProxyError) {
    return {
      status: err.status,
      message: err.message,
      code: err.code,
      retryable: err.retryable,
    };
  }
  const raw = redactSensitiveTokens(err instanceof Error ? err.message : String(err));
  if (raw.includes('not configured') || raw.includes('Add OPENROUTER_API_KEY') || raw.includes('Add GEMINI_API_KEY')) {
    return { status: 503, message: raw, code: 'AI_NOT_CONFIGURED', retryable: false };
  }
  if (
    raw.includes('API_KEY_INVALID') ||
    raw.includes('PERMISSION_DENIED') ||
    raw.includes('invalid or unauthorized') ||
    raw.includes('401') ||
    raw.includes('403')
  ) {
    return {
      status: 401,
      message: 'AI API key is invalid or missing. Please verify OPENROUTER_API_KEY in Vercel/Secrets.',
      code: 'AI_AUTH_INVALID',
      retryable: false,
    };
  }
  if (raw.includes('insufficient credits') || raw.includes('402')) {
    return {
      status: 402,
      message: 'OpenRouter account has insufficient credits for this request.',
      code: 'AI_INSUFFICIENT_CREDITS',
      retryable: false,
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429') || raw.includes('quota temporarily exceeded')) {
    return {
      status: 429,
      message: 'AI request quota temporarily exceeded. Please wait a moment and try again.',
      code: 'AI_RATE_LIMITED',
      retryable: true,
    };
  }
  if (/timed out|timeout|TimeoutError|AbortError|504/i.test(raw)) {
    return {
      status: 504,
      message: 'The AI service timed out before completing your request. Please try again.',
      code: 'AI_TIMEOUT',
      retryable: true,
    };
  }
  if (/ECONNREFUSED|ENOTFOUND|EAI_AGAIN|fetch failed|unreachable|network|502|503/i.test(raw)) {
    return {
      status: 503,
      message: 'AI service is temporarily unreachable. Please check your connection or retry shortly.',
      code: 'AI_UNREACHABLE',
      retryable: true,
    };
  }
  return {
    status: 502,
    message: raw || 'AI service encountered an unexpected error.',
    code: 'AI_UPSTREAM_FAILURE',
    retryable: true,
  };
}

function sendAiError(res: express.Response, err: unknown, routeTag: string) {
  const formatted = formatAiError(err);
  console.error(`[AI Proxy Error] ${routeTag} (${formatted.status} ${formatted.code}): ${formatted.message}`);
  return res.status(formatted.status).json({
    error: formatted.message,
    code: formatted.code,
    retryable: formatted.retryable,
  });
}

export function createApiApp(): express.Express {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Mentor verification endpoints (server-side only)
  app.get('/api/mentor/status', (_req, res) => {
    const envCode = (process.env.MENTOR_ACCESS_CODE || '').trim();
    res.json({
      configured: Boolean(envCode) || Boolean(claimedMentorHash),
      source: envCode ? 'env' : claimedMentorHash ? 'claimed' : 'unclaimed',
    });
  });

  app.post('/api/mentor/claim', (req, res) => {
    const envCode = (process.env.MENTOR_ACCESS_CODE || '').trim();
    if (envCode) {
      return res.status(409).json({ error: 'Mentor access code is already configured via environment secrets.' });
    }
    if (claimedMentorHash) {
      return res.status(409).json({ error: 'Mentor access code has already been claimed.' });
    }
    const code = typeof req.body?.code === 'string' ? req.body.code.trim().toUpperCase() : '';
    if (code.length < 6 || code.length > 64) {
      return res.status(400).json({ error: 'Access code must be between 6 and 64 characters.' });
    }
    claimedMentorHash = hashPasscode(code);
    return res.json({ verified: true });
  });

  app.post('/api/mentor/verify', (req, res) => {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim().toUpperCase() : '';
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required.' });
    }

    const envCode = (process.env.MENTOR_ACCESS_CODE || '').trim().toUpperCase();
    if (envCode) {
      const ok = timingSafeCompare(code, envCode);
      if (!ok) {
        return res.status(403).json({ error: 'Invalid authorization code.' });
      }
      return res.json({ verified: true });
    }

    if (!claimedMentorHash) {
      return res.status(409).json({ error: 'Mentor access code has not been set up yet.' });
    }

    const candidate = hashPasscode(code, claimedMentorHash.salt);
    if (!timingSafeCompare(candidate.hash, claimedMentorHash.hash)) {
      return res.status(403).json({ error: 'Invalid authorization code.' });
    }
    return res.json({ verified: true });
  });

  // Admin Panel verification endpoints (server-side only)
  app.get('/api/admin/status', (_req, res) => {
    const envCode = (process.env.ADMIN_ACCESS_CODE || '').trim();
    res.json({
      configured: Boolean(envCode) || Boolean(claimedAdminHash),
      source: envCode ? 'env' : claimedAdminHash ? 'claimed' : 'unclaimed',
    });
  });

  app.post('/api/admin/claim', (req, res) => {
    const envCode = (process.env.ADMIN_ACCESS_CODE || '').trim();
    if (envCode) {
      return res.status(409).json({ error: 'Admin access code is already configured via environment secrets.' });
    }
    if (claimedAdminHash) {
      return res.status(409).json({ error: 'Admin access code has already been claimed.' });
    }
    const code = typeof req.body?.code === 'string' ? req.body.code.trim().toUpperCase() : '';
    if (code.length < 6 || code.length > 64) {
      return res.status(400).json({ error: 'Admin access code must be between 6 and 64 characters.' });
    }
    claimedAdminHash = hashPasscode(code);
    return res.json({ verified: true, token: createAdminSessionToken() });
  });

  app.post('/api/admin/verify', (req, res) => {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim().toUpperCase() : '';
    if (!code) {
      return res.status(400).json({ error: 'Admin access code is required.' });
    }

    const envCode = (process.env.ADMIN_ACCESS_CODE || '').trim().toUpperCase();
    if (envCode) {
      if (!timingSafeCompare(code, envCode)) {
        return res.status(403).json({ error: 'Invalid admin access code.' });
      }
      return res.json({ verified: true, token: createAdminSessionToken() });
    }

    if (!claimedAdminHash) {
      return res.status(409).json({ error: 'Admin access code has not been configured yet.' });
    }

    const candidate = hashPasscode(code, claimedAdminHash.salt);
    if (!timingSafeCompare(candidate.hash, claimedAdminHash.hash)) {
      return res.status(403).json({ error: 'Invalid admin access code.' });
    }
    return res.json({ verified: true, token: createAdminSessionToken() });
  });

  app.get('/api/admin/session', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token || !verifyAdminSessionToken(token)) {
      return res.status(401).json({ valid: false });
    }
    return res.json({ valid: true });
  });

  // AI provider status (boolean/metadata only, never exposes secrets)
  app.get('/api/ai/status', (_req, res) => {
    const hasOpenRouter = Boolean(getOpenRouterKey());
    const hasGemini = Boolean(getGeminiKey());
    res.json({
      configured: hasOpenRouter || hasGemini,
      provider: hasOpenRouter ? 'openrouter' : hasGemini ? 'gemini' : 'none',
      providers: {
        openrouter: hasOpenRouter,
        gemini: hasGemini,
      },
      openrouterModelMode: getConfiguredOpenRouterModel() ? 'custom' : 'default',
    });
  });

  // AI Chat endpoint
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
      const rawHistory = Array.isArray(req.body?.history) ? req.body.history : [];
      if (!message || message.length > 10000) {
        return res.status(400).json({ error: 'Message must be between 1 and 10,000 characters.' });
      }

      const langInstruction = resolveLanguageInstruction(req.body?.language);
      const systemPrompt =
        `You are EduAI, a friendly and helpful teaching assistant for the Learnify platform. You help students with subjects like Computer Science, Physics, Chemistry, Biology, Mathematics, and Electrical Engineering. Be concise, clear, and encouraging.${langInstruction ? ` ${langInstruction}` : ''}`;

      const normalizedHistory = rawHistory
        .filter((item: any) => item && (item.role === 'user' || item.role === 'model') && Array.isArray(item.parts))
        .slice(-20)
        .map((item: any) => ({
          role: item.role as 'user' | 'model',
          text: String(item.parts?.[0]?.text || '').slice(0, 8000),
        }));

      const text = await executeWithAiFallback(
        async () => {
          const messages: OpenRouterMessage[] = [
            { role: 'system', content: systemPrompt },
            ...normalizedHistory.map((item) => ({
              role: (item.role === 'model' ? 'assistant' : 'user') as 'assistant' | 'user',
              content: item.text,
            })),
            { role: 'user', content: message },
          ];
          return await callOpenRouter(messages);
        },
        async () => {
          const ai = getGeminiClient();
          const chat = ai.chats.create({
            model: 'gemini-4-hydrogen',
            config: { systemInstruction: systemPrompt },
            history: normalizedHistory.map((item) => ({
              role: item.role,
              parts: [{ text: item.text }],
            })),
          });
          const response = await chat.sendMessage({ message });
          return response.text || '';
        }
      );

      return res.json({ text });
    } catch (err) {
      return sendAiError(res, err, '/api/ai/chat');
    }
  });

  // AI MCQ Generator (supports text and image/PDF, custom count 1-100)
  app.post('/api/ai/mcqs', async (req, res) => {
    try {
      const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
      const base64Data = typeof req.body?.base64Data === 'string' ? req.body.base64Data : undefined;
      const mimeType = req.body?.mimeType;
      const rawCount = Number(req.body?.count);
      const requestedCount = Number.isFinite(rawCount)
        ? Math.min(100, Math.max(1, Math.round(rawCount)))
        : 10;
      const excludeQuestions: string[] = Array.isArray(req.body?.excludeQuestions)
        ? req.body.excludeQuestions
            .filter((q: unknown): q is string => typeof q === 'string' && q.trim().length > 0)
            .slice(-60)
        : [];

      if (!content && !base64Data) {
        return res.status(400).json({ error: 'Provide text content or an uploaded document/image.' });
      }
      if (content.length > 20000) {
        return res.status(400).json({ error: 'Content must be 20,000 characters or fewer.' });
      }
      if (base64Data && !isAllowedMimeType(mimeType)) {
        return res.status(400).json({ error: 'Unsupported file type. Please upload an image or PDF.' });
      }

      const normalizeMcq = (item: any) => {
        if (!item || typeof item !== 'object') return null;
        const question = typeof item.question === 'string' ? item.question.trim() : '';
        const options = Array.isArray(item.options)
          ? item.options.map((o: unknown) => String(o ?? '').trim()).filter(Boolean).slice(0, 4)
          : [];
        if (!question || options.length < 2) return null;
        while (options.length < 4) {
          options.push(`Option ${options.length + 1}`);
        }
        const rawIdx = Number(item.correctIndex);
        const correctIndex = Number.isFinite(rawIdx)
          ? Math.min(3, Math.max(0, Math.round(rawIdx)))
          : 0;
        return { question, options, correctIndex };
      };

      const langInstruction = resolveLanguageInstruction(req.body?.language);
      const generateBatch = async (batchCount: number, avoidList: string[]) => {
        const avoidBlock =
          avoidList.length > 0
            ? `\n\nAvoid repeating or rephrasing any of these already-generated questions:\n- ${avoidList
                .slice(-30)
                .join('\n- ')}`
            : '';

        const promptText = `Generate exactly ${batchCount} distinct, challenging multiple-choice questions based on the following educational material${langInstruction ? ` (${langInstruction})` : ''}:\n\n${
          content || `Analyze the uploaded material and formulate ${batchCount} accurate MCQs.`
        }${avoidBlock}`;

        return await executeWithAiFallback(
          async () => {
            const userParts: OpenRouterContentPart[] = [];
            if (base64Data && mimeType) {
              userParts.push(buildOpenRouterAttachmentPart(base64Data, mimeType));
            }
            userParts.push({
              type: 'text',
              text: `${promptText}\n\nReturn ONLY a raw JSON array of ${batchCount} objects with keys: "question" (string), "options" (array of 4 strings), and "correctIndex" (integer 0-3). Do not include markdown fences or extra text.`,
            });

            const text = await callOpenRouter(
              [
                {
                  role: 'system',
                  content:
                    `You are an educational assessment expert. Respond strictly with valid JSON containing exactly ${batchCount} unique MCQs matching the requested schema.`,
                },
                { role: 'user', content: userParts },
              ],
              true
            );
            return parseJsonArrayResponse(text).map(normalizeMcq).filter(Boolean);
          },
          async () => {
            const ai = getGeminiClient();
            const parts: any[] = [];
            if (base64Data && mimeType) {
              parts.push({
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              });
            }
            parts.push({ text: promptText });

            const response = await ai.models.generateContent({
              model: 'gemini-4-hydrogen',
              contents: { parts },
              config: {
                systemInstruction:
                  `You are an educational assessment expert. Always return exactly ${batchCount} unique multiple choice questions with 4 answer options each and a 0-based correctIndex (0 to 3).`,
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      question: { type: Type.STRING },
                      options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      correctIndex: { type: Type.INTEGER },
                    },
                    required: ['question', 'options', 'correctIndex'],
                  },
                },
              },
            });

            return parseJsonArrayResponse(response.text || '[]').map(normalizeMcq).filter(Boolean);
          }
        );
      };

      const seen = new Set(excludeQuestions.map((q) => q.trim().toLowerCase()));
      const collected: Array<{ question: string; options: string[]; correctIndex: number }> = [];
      const avoid = [...excludeQuestions];

      let attempts = 0;
      const maxAttempts = Math.ceil(requestedCount / 20) + 2;
      while (collected.length < requestedCount && attempts < maxAttempts) {
        const remaining = requestedCount - collected.length;
        const batchSize = Math.min(25, remaining);
        const batch = await generateBatch(batchSize, avoid);
        let addedInPass = 0;
        for (const item of batch) {
          if (!item) continue;
          const key = item.question.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          collected.push(item);
          avoid.push(item.question);
          addedInPass++;
          if (collected.length >= requestedCount) break;
        }
        attempts++;
        if (addedInPass === 0 && batch.length === 0) break;
      }

      return res.json({ mcqs: collected.slice(0, requestedCount) });
    } catch (err) {
      return sendAiError(res, err, '/api/ai/mcqs');
    }
  });

  // AI Flashcards
  app.post('/api/ai/flashcards', async (req, res) => {
    try {
      const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
      if (!content || content.length > 20000) {
        return res.status(400).json({ error: 'Provide study content between 1 and 20,000 characters.' });
      }

      const flashcards = await executeWithAiFallback(
        async () => {
          const text = await callOpenRouter(
            [
              {
                role: 'system',
                content:
                  'You are an educational flashcard generator. Respond strictly with a raw JSON array of 10 objects, each having "front" (string) and "back" (string). Do not include markdown fences.',
              },
              {
                role: 'user',
                content: `Generate 10 educational flashcards from the provided content:\n\n${content}`,
              },
            ],
            true
          );
          return parseJsonArrayResponse(text);
        },
        async () => {
          const ai = getGeminiClient();
          const response = await ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: `Generate 10 educational flashcards from the provided content:\n\n${content}`,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    front: { type: Type.STRING },
                    back: { type: Type.STRING },
                  },
                  required: ['front', 'back'],
                },
              },
            },
          });
          return parseJsonArrayResponse(response.text || '[]');
        }
      );

      return res.json({ flashcards });
    } catch (err) {
      return sendAiError(res, err, '/api/ai/flashcards');
    }
  });

  // AI Notes
  app.post('/api/ai/notes', async (req, res) => {
    try {
      const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
      if (!content || content.length > 20000) {
        return res.status(400).json({ error: 'Provide study content between 1 and 20,000 characters.' });
      }

      const systemInstruction =
        'Generate comprehensive study notes based on the provided content. Use Markdown for formatting with clear headings, bullet points, and bold text for key terms.';

      const text = await executeWithAiFallback(
        async () =>
          await callOpenRouter([
            { role: 'system', content: systemInstruction },
            { role: 'user', content: `Content:\n${content}` },
          ]),
        async () => {
          const ai = getGeminiClient();
          const response = await ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: `Content:\n${content}`,
            config: { systemInstruction },
          });
          return response.text || '';
        }
      );

      return res.json({ text });
    } catch (err) {
      return sendAiError(res, err, '/api/ai/notes');
    }
  });

  // AI Concept Explainer
  app.post('/api/ai/explain', async (req, res) => {
    try {
      const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
      const base64Image = typeof req.body?.base64Image === 'string' ? req.body.base64Image : undefined;
      const mimeType = req.body?.mimeType;
      const instruction =
        typeof req.body?.instruction === 'string' && req.body.instruction.trim()
          ? req.body.instruction.trim().slice(0, 2000)
          : 'Answer with clear, structured text and include SVG or Mermaid diagram code if relevant. Wrap diagrams in ```mermaid or ```svg blocks.';

      if (!prompt && !base64Image) {
        return res.status(400).json({ error: 'Provide a concept prompt or upload an image/PDF.' });
      }
      if (prompt.length > 20000) {
        return res.status(400).json({ error: 'Prompt must be 20,000 characters or fewer.' });
      }
      if (base64Image && !isAllowedMimeType(mimeType)) {
        return res.status(400).json({ error: 'Unsupported file type. Please upload an image or PDF.' });
      }

      const langInstruction = resolveLanguageInstruction(req.body?.language);
      const finalInstruction = langInstruction ? `${instruction} ${langInstruction}` : instruction;
      const finalPrompt = prompt || 'Explain the educational concepts depicted in this material.';

      const text = await executeWithAiFallback(
        async () => {
          const userParts: OpenRouterContentPart[] = [];
          if (base64Image && mimeType) {
            userParts.push(buildOpenRouterAttachmentPart(base64Image, mimeType));
          }
          userParts.push({ type: 'text', text: finalPrompt });
          return await callOpenRouter([
            { role: 'system', content: finalInstruction },
            { role: 'user', content: userParts },
          ]);
        },
        async () => {
          const ai = getGeminiClient();
          const parts: any[] = [];
          if (base64Image && mimeType) {
            parts.push({
              inlineData: {
                mimeType,
                data: base64Image,
              },
            });
          }
          parts.push({ text: finalPrompt });

          const response = await ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: { parts },
            config: {
              systemInstruction: finalInstruction,
            },
          });
          return response.text || '';
        }
      );

      return res.json({ text });
    } catch (err) {
      return sendAiError(res, err, '/api/ai/explain');
    }
  });

  // Sindhi Question (Text or Voice Audio) -> Sindhi Topic Explanation + Spoken Narration Script
  app.post('/api/ai/sindhi-explain', async (req, res) => {
    try {
      const typedQuestion = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
      const audioBase64 = typeof req.body?.audioBase64 === 'string' ? req.body.audioBase64.trim() : '';
      const audioMimeType = typeof req.body?.audioMimeType === 'string' ? req.body.audioMimeType.trim() : '';
      const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim().slice(0, 80) : 'General Science';
      const grade = typeof req.body?.grade === 'string' ? req.body.grade.trim().slice(0, 40) : 'Class 9–10';

      if (!typedQuestion && !audioBase64) {
        return res.status(400).json({ error: 'Please type a Sindhi question or record your voice question.' });
      }
      if (typedQuestion.length > 4000) {
        return res.status(400).json({ error: 'Question must be 4,000 characters or fewer.' });
      }
      if (audioBase64 && !/^audio\/(wav|x-wav|wave|webm|mp3|mpeg|ogg|mp4|m4a)$/i.test(audioMimeType)) {
        return res.status(400).json({ error: 'Unsupported audio recording format.' });
      }

      let resolvedQuestion = typedQuestion;

      // Step 1: Transcribe recorded Sindhi audio if voice input was provided
      if (audioBase64) {
        const cleanAudioBase64 = audioBase64.replace(/^data:audio\/[a-z0-9.+-]+;base64,/i, '');
        const audioFormat = audioMimeType.split('/')[1]?.replace('x-wav', 'wav').replace('wave', 'wav').replace('mpeg', 'mp3') || 'wav';

        resolvedQuestion = await executeWithAiFallback(
          async () => {
            if (audioFormat !== 'wav' && audioFormat !== 'mp3') {
              throw new Error('OpenRouter audio input requires WAV or MP3 format.');
            }
            const text = await callOpenRouter([
              {
                role: 'system',
                content:
                  'You are a Sindhi speech transcriber for students. Transcribe the spoken question faithfully in standard Sindhi script (سنڌي). Output ONLY the transcribed question text.',
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'input_audio',
                    input_audio: {
                      data: cleanAudioBase64,
                      format: audioFormat as 'wav' | 'mp3',
                    },
                  } as any,
                  {
                    type: 'text',
                    text: typedQuestion
                      ? `Transcribe this Sindhi student voice question accurately. Context hint: ${typedQuestion}`
                      : 'Transcribe this Sindhi student voice question accurately in standard Sindhi script (سنڌي).',
                  },
                ],
              },
            ]);
            return text.trim();
          },
          async () => {
            const ai = getGeminiClient();
            const audioPart = {
              inlineData: {
                mimeType: audioMimeType || 'audio/wav',
                data: cleanAudioBase64,
              },
            };
            const promptPart = {
              text: 'Transcribe the student question from this audio accurately into standard Sindhi script (سنڌي). If scientific English words are mixed in, write them cleanly inside the Sindhi question. Return only the transcribed question.',
            };
            try {
              const transcribeRes = await ai.models.generateContent({
                model: 'gemini-3.5-transcribe',
                contents: { parts: [audioPart, promptPart] },
              });
              const t = (transcribeRes.text || '').trim();
              if (t) return t;
            } catch {
              // Fallback to multimodal Gemini 4 Hydrogen audio understanding
            }
            const fallbackRes = await ai.models.generateContent({
              model: 'gemini-4-hydrogen',
              contents: { parts: [audioPart, promptPart] },
            });
            return (fallbackRes.text || '').trim();
          }
        );

        if (!resolvedQuestion) {
          return res.status(422).json({
            error: 'Could not clearly hear a question from your recording. Please try speaking closer to the microphone or type your question.',
          });
        }
      }

      // Step 2: Generate complete Sindhi explanation + natural spoken narration script
      const parseExplanationJson = (rawText: string) => {
        const cleaned = rawText
          .trim()
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();
        const tryParse = (candidate: string) => {
          try {
            const obj = JSON.parse(candidate);
            if (obj && typeof obj === 'object') return obj;
          } catch {}
          return null;
        };
        let parsed = tryParse(cleaned);
        if (!parsed) {
          const start = cleaned.indexOf('{');
          const end = cleaned.lastIndexOf('}');
          if (start !== -1 && end > start) {
            parsed = tryParse(cleaned.slice(start, end + 1));
          }
        }
        return {
          topicTitle:
            typeof parsed?.topicTitle === 'string' && parsed.topicTitle.trim()
              ? parsed.topicTitle.trim()
              : resolvedQuestion.slice(0, 80),
          detectedQuestion:
            typeof parsed?.detectedQuestion === 'string' && parsed.detectedQuestion.trim()
              ? parsed.detectedQuestion.trim()
              : resolvedQuestion,
          explanation:
            typeof parsed?.explanation === 'string' && parsed.explanation.trim()
              ? parsed.explanation.trim()
              : rawText.trim(),
          spokenScript:
            typeof parsed?.spokenScript === 'string' && parsed.spokenScript.trim()
              ? parsed.spokenScript.trim()
              : rawText.replace(/[#*`>$_]+/g, ' ').trim().slice(0, 2200),
          keyTakeaways: Array.isArray(parsed?.keyTakeaways)
            ? parsed.keyTakeaways.map((item: unknown) => String(item ?? '').trim()).filter(Boolean).slice(0, 5)
            : [],
          suggestedLabSubject:
            typeof parsed?.suggestedLabSubject === 'string' &&
            ['physics', 'chemistry', 'biology', 'math', 'computer', 'electrical'].includes(
              parsed.suggestedLabSubject.trim().toLowerCase()
            )
              ? parsed.suggestedLabSubject.trim().toLowerCase()
              : '',
        };
      };

      const systemPrompt = `You are Ustad Learnify, an expert STEM teacher fluent in authentic standard Sindhi (سنڌي script). A ${grade} student asked a question in ${subject}.
Write strictly in pure standard Sindhi (سنڌي) using proper Sindhi words (آهي، ٿو، ڪري، ۾، ۽، جو، جي) — NEVER mix Urdu words (like میں، یہ، ہے) or any non-Sindhi/Chinese characters. Keep responses focused and crisp. Return ONLY valid JSON matching these fields:
- "topicTitle": Short topic title in Sindhi script (max 10 words).
- "detectedQuestion": Clean restatement of the student's question in Sindhi script.
- "explanation": Clear, thorough explanation of the whole topic in standard Sindhi script (سنڌي) with 2–3 brief Markdown headings, an everyday real-life example, and key formula (around 100–160 words).
- "spokenScript": A warm, natural 80–130 word spoken lecture in standard Sindhi script (سنڌي) explaining the whole topic aloud for Text-to-Speech. Plain Sindhi sentences only: NO Markdown (#, *, -), NO bullet numbers, and spell formulas in natural Sindhi words.
- "keyTakeaways": Array of 3 short one-line takeaways in Sindhi script.
- "suggestedLabSubject": One of "physics", "chemistry", "biology", "math", "computer", "electrical", or "" if none fits.`;

      const userPrompt = `Student Question (${subject}, ${grade}):\n${resolvedQuestion}`;

      const runGeminiSindhi = async () => {
        const ai = getGeminiClient();
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                topicTitle: { type: Type.STRING },
                detectedQuestion: { type: Type.STRING },
                explanation: { type: Type.STRING },
                spokenScript: { type: Type.STRING },
                keyTakeaways: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                suggestedLabSubject: { type: Type.STRING },
              },
              required: ['topicTitle', 'detectedQuestion', 'explanation', 'spokenScript', 'keyTakeaways'],
            },
          },
        });
        return parseExplanationJson(response.text || '{}');
      };

      const runOpenRouterSindhi = async () => {
        const text = await callOpenRouter(
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          true,
          false
        );
        return parseExplanationJson(text);
      };

      let result;
      if (getGeminiKey()) {
        try {
          result = await runGeminiSindhi();
        } catch (geminiErr) {
          if (getOpenRouterKey()) {
            result = await runOpenRouterSindhi();
          } else {
            throw geminiErr;
          }
        }
      } else {
        result = await runOpenRouterSindhi();
      }

      return res.json(result);
    } catch (err) {
      return sendAiError(res, err, '/api/ai/sindhi-explain');
    }
  });

  // Server-side Neural Voice TTS (Gemini TTS v1alpha/v1beta + OpenRouter gpt-audio-mini fallback)
  app.post('/api/ai/tts', async (req, res) => {
    try {
      const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
      if (!text || text.length > 5000) {
        return res.status(400).json({ error: 'Voice text must be between 1 and 5,000 characters.' });
      }
      const allowedVoices = new Set(['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr']);
      const requestedVoice = typeof req.body?.voiceName === 'string' ? req.body.voiceName.trim() : 'Kore';
      const voiceName = allowedVoices.has(requestedVoice) ? requestedVoice : 'Kore';
      const style =
        typeof req.body?.style === 'string' && req.body.style.trim()
          ? req.body.style.trim().slice(0, 200)
          : 'Warm, clear, patient Sindhi STEM teacher explaining a complete topic aloud to a student.';

      const geminiKey = getGeminiKey();
      const openRouterKey = getOpenRouterKey();
      if (!geminiKey && !openRouterKey) {
        return res.status(503).json({
          error: 'AI API key is not configured. Add OPENROUTER_API_KEY or GEMINI_API_KEY in Settings > Secrets.',
        });
      }

      const errors: string[] = [];

      // 1. Try Gemini TTS configurations
      if (geminiKey) {
        const geminiAttempts: Array<() => Promise<{ audioBase64: string; mimeType: string } | null>> = [
          async () => {
            const aiAlpha = new GoogleGenAI({
              apiKey: geminiKey,
              apiVersion: 'v1alpha',
              httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
            });
            const r = await aiAlpha.models.generateContent({
              model: 'gemini-3.8-flash-lite-tts',
              contents: [
                {
                  role: 'user',
                  parts: [{ text, speechMetadata: { style } } as any],
                },
              ],
              config: {
                responseModalities: ['AUDIO'],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
              },
            });
            const part = r.candidates?.[0]?.content?.parts?.find((p: any) => p?.inlineData?.data);
            return part?.inlineData?.data
              ? { audioBase64: part.inlineData.data, mimeType: part.inlineData.mimeType || 'audio/wav' }
              : null;
          },
          async () => {
            const aiBeta = getGeminiClient();
            const r = await aiBeta.models.generateContent({
              model: 'gemini-3.8-flash-lite-tts',
              contents: `Speak warmly as a Sindhi STEM teacher:\n\n${text}`,
              config: {
                responseModalities: ['AUDIO'],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
              },
            });
            const part = r.candidates?.[0]?.content?.parts?.find((p: any) => p?.inlineData?.data);
            return part?.inlineData?.data
              ? { audioBase64: part.inlineData.data, mimeType: part.inlineData.mimeType || 'audio/wav' }
              : null;
          },
          async () => {
            const aiBeta = getGeminiClient();
            const r = await aiBeta.models.generateContent({
              model: 'gemini-2.5-flash-preview-tts',
              contents: `Speak clearly and warmly:\n\n${text}`,
              config: {
                responseModalities: ['AUDIO'],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
              },
            });
            const part = r.candidates?.[0]?.content?.parts?.find((p: any) => p?.inlineData?.data);
            return part?.inlineData?.data
              ? { audioBase64: part.inlineData.data, mimeType: part.inlineData.mimeType || 'audio/wav' }
              : null;
          },
        ];

        for (const attempt of geminiAttempts) {
          try {
            const result = await attempt();
            if (result?.audioBase64) {
              return res.json({
                audioBase64: result.audioBase64,
                mimeType: result.mimeType,
                voiceName,
              });
            }
          } catch (e) {
            errors.push(e instanceof Error ? e.message : String(e));
          }
        }
      }

      // 2. Fallback to OpenRouter audio output model (openai/gpt-audio-mini)
      if (openRouterKey) {
        const openAiVoiceMap: Record<string, string> = {
          Kore: 'nova',
          Zephyr: 'shimmer',
          Puck: 'alloy',
          Charon: 'onyx',
          Fenrir: 'echo',
        };
        const appUrl =
          (process.env.APP_URL || '').trim() ||
          (process.env.VERCEL_PROJECT_PRODUCTION_URL
            ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
            : '') ||
          'https://learnify-ten-olive.vercel.app';

        for (const audioModel of ['openai/gpt-audio-mini', 'openai/gpt-audio']) {
          try {
            const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${openRouterKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': appUrl,
                'X-Title': 'Learnify',
              },
              body: JSON.stringify({
                model: audioModel,
                modalities: ['text', 'audio'],
                audio: {
                  voice: openAiVoiceMap[voiceName] || 'nova',
                  format: 'wav',
                },
                messages: [
                  {
                    role: 'system',
                    content:
                      'You are a warm Sindhi STEM teacher voice narrator. Read the user-provided Sindhi lesson word-for-word naturally and clearly in Sindhi pronunciation with zero extra commentary.',
                  },
                  {
                    role: 'user',
                    content: text,
                  },
                ],
              }),
              signal: AbortSignal.timeout(45000),
            });
            const rawAudioText = await orRes.text().catch(() => '');
            const payload = parseJsonSafe(rawAudioText);
            const audioData = payload?.choices?.[0]?.message?.audio?.data;
            if (orRes.ok && !payload?.error && typeof audioData === 'string' && audioData.trim()) {
              return res.json({
                audioBase64: audioData.trim(),
                mimeType: 'audio/wav',
                voiceName,
              });
            }
            const errMsg = redactSensitiveTokens(
              String(payload?.error?.message || `OpenRouter audio status ${orRes.status}`)
            );
            errors.push(errMsg);
          } catch (e) {
            const netErr = classifyNetworkError(e, 'OpenRouter Audio');
            errors.push(netErr.message);
          }
        }
      }

      throw new Error(errors[errors.length - 1] || 'Voice synthesis failed across configured providers.');
    } catch (err) {
      return sendAiError(res, err, '/api/ai/tts');
    }
  });

  // LearnLab AI Unified Lab, Misconception, Viva, Smart Exam & Teacher Assistant
  app.post('/api/ai/lab-assistant', async (req, res) => {
    try {
      const action = typeof req.body?.action === 'string' ? req.body.action.trim() : '';
      if (!VALID_LAB_ASSISTANT_ACTIONS.has(action)) {
        return res.status(400).json({ error: 'Invalid AI assistant action requested.' });
      }
      const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim().slice(0, 80) : 'Science';
      const topic = typeof req.body?.topic === 'string' ? req.body.topic.trim().slice(0, 500) : '';
      const context = typeof req.body?.context === 'string' ? req.body.context.trim().slice(0, 12000) : '';
      const langInstruction = resolveLanguageInstruction(req.body?.language);

      const actionPrompts: Record<string, { system: string; user: string }> = {
        'experiment-plan': {
          system:
            'You are a Virtual Lab Designer. Produce safe, structured practical plans mapped to standard virtual equipment. Never output executable code. Include sections: Objectives, Validated Equipment, Step-by-Step Instructions, Observation Table Template, Key Calculations, Check Questions, and Conclusion.',
          user: `Subject: ${subject}\nTopic: ${topic || 'General Lab'}\nConstraints/Notes: ${context || 'Standard secondary/college science lab.'}`,
        },
        'what-if': {
          system:
            'You are an AI What-If Scientific Simulator Tutor. Analyze how changing experimental variables alters quantitative outcomes, graphs, and equilibrium behavior with clear physical laws.',
          user: `Subject: ${subject}\nVariable Scenario: ${topic}\nMeasurements / Parameters:\n${context}`,
        },
        'lab-rescue': {
          system:
            'You are AI Lab Rescue. Diagnose mistakes during virtual lab procedures using Socratic hints and conceptual guidance WITHOUT immediately revealing the final numeric answer.',
          user: `Subject: ${subject}\nCurrent Issue/Attempt: ${topic}\nStudent Steps & Observations:\n${context}`,
        },
        'practical-report': {
          system:
            'You are a Scientific Practical Report Assistant. Turn real recorded student measurements and steps into a clean, editable formal practical report (Aim, Apparatus, Theory/Formula, Observations, Result & Conclusion, Precautions). Do not invent fake measurements.',
          user: `Subject: ${subject}\nExperiment: ${topic}\nRecorded Observations & Steps:\n${context}`,
        },
        'viva-question': {
          system:
            'You are an AI Practical Viva Examiner. Ask ONE sharp conceptual oral/written viva follow-up question tailored to the experiment so the student must explain why, not just memorize.',
          user: `Subject: ${subject}\nExperiment/Topic: ${topic}\nStudent Progress Context: ${context}`,
        },
        'viva-evaluate': {
          system:
            'You are an AI Practical Viva Examiner. Evaluate the student answer fairly out of 10 with rubric criteria (Concept Accuracy, Scientific Terminology, Practical Reasoning), point out any gap, and ask one brief follow-up prompt.',
          user: `Subject: ${subject}\nViva Question & Experiment: ${topic}\nStudent Answer:\n${context}`,
        },
        'misconception-diagnose': {
          system:
            'You are an AI Science Misconception Detector. Identify the underlying wrong mental model, explain why the chosen answer is scientifically inaccurate, clarify the correct principle, and recommend a specific virtual lab experiment to test it.',
          user: `Subject: ${subject}\nQuestion / Concept: ${topic}\nStudent Mistake Details:\n${context}`,
        },
        'misconception-verify': {
          system:
            'You are an AI Science Misconception Verifier. Check whether the student explanation proves they overcame the misconception and give concise Mastery Verification feedback.',
          user: `Subject: ${subject}\nOriginal Misconception: ${topic}\nStudent New Explanation:\n${context}`,
        },
        'local-explorer': {
          system:
            'You are an AI Local Science Explorer. Connect textbook concepts to everyday household/local phenomena and outline safe, non-hazardous observational measurements students can record cleanly.',
          user: `Subject: ${subject}\nConcept: ${topic}\nContext: ${context}`,
        },
        'teacher-assistant': {
          system:
            'You are an AI STEM Teacher Assistant. Draft structured classroom-ready lesson plans, worksheets, balanced assignments, or formative rubrics cleanly in Markdown.',
          user: `Subject: ${subject}\nTask Type / Topic: ${topic}\nClass Level & Focus:\n${context}`,
        },
        'code-debug': {
          system:
            'You are a Socratic Programming Lab Mentor for Python, HTML, CSS, and JavaScript. Explain syntax or logic bugs concisely, highlight the exact faulty line/pattern, and provide a corrected minimal snippet.',
          user: `Language/Environment: ${subject}\nError/Goal: ${topic}\nStudent Code:\n${context}`,
        },
        'smart-exam': {
          system:
            'You are an AI Smart Exam Coach. Provide topic-wise past-paper trend summaries, syllabus coverage audits, revision priorities, or answer evaluation rubrics. Explicitly focus on academic mastery and NEVER claim to predict actual confidential exam papers.',
          user: `Exam Mode: ${subject}\nFocus: ${topic}\nMaterial / Student Response:\n${context}`,
        },
      };

      const template = actionPrompts[action];
      const sysPrompt = langInstruction ? `${template.system} ${langInstruction}` : template.system;

      const text = await executeWithAiFallback(
        async () =>
          await callOpenRouter([
            { role: 'system', content: sysPrompt },
            { role: 'user', content: template.user },
          ]),
        async () => {
          const ai = getGeminiClient();
          const response = await ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: template.user,
            config: { systemInstruction: sysPrompt },
          });
          return response.text || '';
        }
      );

      return res.json({ text });
    } catch (err) {
      return sendAiError(res, err, '/api/ai/lab-assistant');
    }
  });

  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!err) return next();
    if (err.type === 'entity.too.large') {
      return res
        .status(413)
        .json({ error: 'Uploaded material or request payload is too large. Please keep files under 4 MB.' });
    }
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ error: 'Invalid JSON request payload.' });
    }
    return res.status(500).json({ error: 'Unexpected server error while processing request.' });
  });

  return app;
}

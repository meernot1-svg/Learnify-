import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import { GoogleGenAI, Type } from '@google/genai';

const DEFAULT_OPENROUTER_MODEL = 'google/gemini-4-hydrogen';
const FALLBACK_OPENROUTER_MODELS = [
  'google/gemini-3.8-flash',
  'google/gemini-3.5-flash-lite',
  'google/gemma-4-26b-a4b-it:free',
  'openrouter/free',
];

function getOpenRouterKey(): string {
  return (process.env.OPENROUTER_API_KEY || '').trim();
}

function getGeminiKey(): string {
  return (process.env.GEMINI_API_KEY || '').trim();
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

async function callOpenRouter(messages: OpenRouterMessage[], expectJson = false): Promise<string> {
  const apiKey = getOpenRouterKey();
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured.');
  }
  const configuredModel = (process.env.OPENROUTER_MODEL || '').trim();
  const candidates = configuredModel
    ? [configuredModel]
    : [DEFAULT_OPENROUTER_MODEL, ...FALLBACK_OPENROUTER_MODELS];
  const appUrl =
    (process.env.APP_URL || '').trim() ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : '') ||
    'https://learnify-ten-olive.vercel.app';

  let lastError = 'OpenRouter request failed.';

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

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': appUrl,
        'X-Title': 'Learnify',
      },
      body: JSON.stringify(body),
    });

    const payload: any = await response.json().catch(() => ({}));
    if (response.ok) {
      const content = payload?.choices?.[0]?.message?.content;
      if (typeof content === 'string') return content;
      if (Array.isArray(content)) {
        return content
          .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
          .join('');
      }
      return '';
    }

    const providerMessage = payload?.error?.message || `OpenRouter request failed (${response.status})`;
    if (response.status === 401 || response.status === 403) {
      throw new Error('OpenRouter API key is invalid or unauthorized. Please check Settings > Secrets.');
    }
    if (response.status === 429) {
      if (hasMore) {
        lastError = providerMessage;
        continue;
      }
      throw new Error('AI request quota temporarily exceeded. Please wait a moment and try again.');
    }
    if (response.status === 402) {
      if (hasMore) {
        lastError = 'OpenRouter account has insufficient credits for this model.';
        continue;
      }
      throw new Error('OpenRouter account has insufficient credits for this model.');
    }
    lastError = providerMessage;
    if (
      hasMore &&
      (response.status === 404 ||
        providerMessage.includes('no longer available') ||
        providerMessage.includes('not found'))
    ) {
      continue;
    }
    throw new Error(providerMessage);
  }

  throw new Error(lastError);
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

function isAllowedMimeType(mimeType: unknown): mimeType is string {
  if (typeof mimeType !== 'string') return false;
  return mimeType.startsWith('image/') || mimeType === 'application/pdf';
}

function formatAiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('not configured') || raw.includes('Add OPENROUTER_API_KEY')) {
    return { status: 503, message: raw };
  }
  if (
    raw.includes('API_KEY_INVALID') ||
    raw.includes('PERMISSION_DENIED') ||
    raw.includes('invalid or unauthorized') ||
    raw.includes('401') ||
    raw.includes('403')
  ) {
    return { status: 401, message: 'AI API key is invalid or missing. Please check Settings > Secrets.' };
  }
  if (raw.includes('insufficient credits') || raw.includes('402')) {
    return { status: 402, message: 'OpenRouter account has insufficient credits for this request.' };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429') || raw.includes('quota temporarily exceeded')) {
    return { status: 429, message: 'AI request quota temporarily exceeded. Please wait a moment and try again.' };
  }
  return { status: 500, message: raw || 'AI service encountered an unexpected error.' };
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

  // AI provider status (boolean only, never exposes secrets)
  app.get('/api/ai/status', (_req, res) => {
    const hasOpenRouter = Boolean(getOpenRouterKey());
    const hasGemini = Boolean(getGeminiKey());
    res.json({
      configured: hasOpenRouter || hasGemini,
      provider: hasOpenRouter ? 'openrouter' : hasGemini ? 'gemini' : 'none',
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

      const systemPrompt =
        'You are EduAI, a friendly and helpful teaching assistant for the Learnify platform. You help students with subjects like Computer Science, Physics, Chemistry, and Biology. Be concise, clear, and encouraging.';

      const normalizedHistory = rawHistory
        .filter((item: any) => item && (item.role === 'user' || item.role === 'model') && Array.isArray(item.parts))
        .slice(-20)
        .map((item: any) => ({
          role: item.role as 'user' | 'model',
          text: String(item.parts?.[0]?.text || '').slice(0, 8000),
        }));

      if (getOpenRouterKey()) {
        const messages: OpenRouterMessage[] = [
          { role: 'system', content: systemPrompt },
          ...normalizedHistory.map((item) => ({
            role: (item.role === 'model' ? 'assistant' : 'user') as 'assistant' | 'user',
            content: item.text,
          })),
          { role: 'user', content: message },
        ];
        const text = await callOpenRouter(messages);
        return res.json({ text });
      }

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
      return res.json({ text: response.text || '' });
    } catch (err) {
      const { status, message } = formatAiError(err);
      return res.status(status).json({ error: message });
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

      const generateBatch = async (batchCount: number, avoidList: string[]) => {
        const avoidBlock =
          avoidList.length > 0
            ? `\n\nAvoid repeating or rephrasing any of these already-generated questions:\n- ${avoidList
                .slice(-30)
                .join('\n- ')}`
            : '';

        const promptText = `Generate exactly ${batchCount} distinct, challenging multiple-choice questions based on the following educational material:\n\n${
          content || `Analyze the uploaded material and formulate ${batchCount} accurate MCQs.`
        }${avoidBlock}`;

        if (getOpenRouterKey()) {
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
        }

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

        const parsed = JSON.parse((response.text || '[]').trim());
        return Array.isArray(parsed) ? parsed.map(normalizeMcq).filter(Boolean) : [];
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
      const { status, message } = formatAiError(err);
      return res.status(status).json({ error: message });
    }
  });

  // AI Flashcards
  app.post('/api/ai/flashcards', async (req, res) => {
    try {
      const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
      if (!content || content.length > 20000) {
        return res.status(400).json({ error: 'Provide study content between 1 and 20,000 characters.' });
      }

      if (getOpenRouterKey()) {
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
        return res.json({ flashcards: parseJsonArrayResponse(text) });
      }

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

      const parsed = JSON.parse((response.text || '[]').trim());
      return res.json({ flashcards: Array.isArray(parsed) ? parsed : [] });
    } catch (err) {
      const { status, message } = formatAiError(err);
      return res.status(status).json({ error: message });
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

      if (getOpenRouterKey()) {
        const text = await callOpenRouter([
          { role: 'system', content: systemInstruction },
          { role: 'user', content: `Content:\n${content}` },
        ]);
        return res.json({ text });
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Content:\n${content}`,
        config: { systemInstruction },
      });
      return res.json({ text: response.text || '' });
    } catch (err) {
      const { status, message } = formatAiError(err);
      return res.status(status).json({ error: message });
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

      const finalPrompt = prompt || 'Explain the educational concepts depicted in this material.';

      if (getOpenRouterKey()) {
        const userParts: OpenRouterContentPart[] = [];
        if (base64Image && mimeType) {
          userParts.push(buildOpenRouterAttachmentPart(base64Image, mimeType));
        }
        userParts.push({ type: 'text', text: finalPrompt });
        const text = await callOpenRouter([
          { role: 'system', content: instruction },
          { role: 'user', content: userParts },
        ]);
        return res.json({ text });
      }

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
          systemInstruction: instruction,
        },
      });

      return res.json({ text: response.text || '' });
    } catch (err) {
      const { status, message } = formatAiError(err);
      return res.status(status).json({ error: message });
    }
  });

  // AI Paper Pattern Predictor
  app.post('/api/ai/predict-paper', async (req, res) => {
    try {
      const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
      const base64Image = typeof req.body?.base64Image === 'string' ? req.body.base64Image : undefined;
      const mimeType = req.body?.mimeType;

      if (!content && !base64Image) {
        return res.status(400).json({ error: 'Provide past paper text or upload an image/PDF.' });
      }
      if (content.length > 20000) {
        return res.status(400).json({ error: 'Content must be 20,000 characters or fewer.' });
      }
      if (base64Image && !isAllowedMimeType(mimeType)) {
        return res.status(400).json({ error: 'Unsupported file type. Please upload an image or PDF.' });
      }

      const finalPrompt = `Analyze this past paper and predict important high-yield topics and likely questions for the next exam. Format clearly with Markdown headings.\n\n${
        content || 'Analyze the uploaded past paper.'
      }`;

      if (getOpenRouterKey()) {
        const userParts: OpenRouterContentPart[] = [];
        if (base64Image && mimeType) {
          userParts.push(buildOpenRouterAttachmentPart(base64Image, mimeType));
        }
        userParts.push({ type: 'text', text: finalPrompt });
        const text = await callOpenRouter([
          { role: 'user', content: userParts },
        ]);
        return res.json({ text });
      }

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
      });

      return res.json({ text: response.text || '' });
    } catch (err) {
      const { status, message } = formatAiError(err);
      return res.status(status).json({ error: message });
    }
  });

  return app;
}

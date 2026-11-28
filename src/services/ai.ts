import { showToast } from '../lib/toastBus';

export type LabAssistantAction =
  | 'experiment-plan'
  | 'what-if'
  | 'lab-rescue'
  | 'practical-report'
  | 'viva-question'
  | 'viva-evaluate'
  | 'misconception-diagnose'
  | 'misconception-verify'
  | 'local-explorer'
  | 'teacher-assistant'
  | 'code-debug'
  | 'smart-exam';

export class AiServiceError extends Error {
  status: number;
  code: string;
  retryable: boolean;

  constructor(message: string, status = 502, code = 'AI_SERVICE_ERROR', retryable = true) {
    super(message);
    this.name = 'AiServiceError';
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

function getToastTitleForStatus(status: number, code?: string): string {
  if (code === 'AI_NOT_CONFIGURED') return 'AI Key Not Configured';
  if (code === 'AI_AUTH_INVALID' || status === 401 || status === 403) return 'AI Authentication Failed';
  if (code === 'AI_INSUFFICIENT_CREDITS' || status === 402) return 'OpenRouter Credits Required';
  if (code === 'AI_RATE_LIMITED' || status === 429) return 'AI Rate Limit Reached';
  if (code === 'AI_TIMEOUT' || status === 408 || status === 504) return 'AI Request Timed Out';
  if (code === 'AI_UNREACHABLE' || status === 502 || status === 503 || status === 0) {
    return 'AI Service Unreachable';
  }
  return 'AI Service Error';
}

function notifyAiFailure(title: string, message: string, dedupeKey: string): void {
  showToast({
    variant: 'error',
    title,
    message,
    durationMs: 6500,
    dedupeKey,
  });
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    const offlineMsg = 'You appear to be offline. Connect to the internet to reach Learnify AI.';
    notifyAiFailure('AI Service Unreachable', offlineMsg, 'ai-offline');
    throw new AiServiceError(offlineMsg, 0, 'AI_OFFLINE', true);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(60000) : undefined,
    });
  } catch (err: any) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      const msg = 'The AI request timed out while waiting for a response. Please try a shorter prompt.';
      notifyAiFailure('AI Request Timed Out', msg, `ai-timeout:${url}`);
      throw new AiServiceError(msg, 504, 'AI_TIMEOUT', true);
    }
    const unreachableMsg = 'Unable to reach the AI service right now. Please check your connection and try again.';
    notifyAiFailure('AI Service Unreachable', unreachableMsg, 'ai-unreachable');
    throw new AiServiceError(unreachableMsg, 503, 'AI_UNREACHABLE', true);
  }

  const rawText = await response.text().catch(() => '');
  let data: any = {};
  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = {};
    }
  }

  if (!response.ok) {
    const serverCode = typeof data?.code === 'string' ? data.code : undefined;
    const retryable = typeof data?.retryable === 'boolean' ? data.retryable : response.status >= 500 || response.status === 429;
    let message =
      typeof data?.error === 'string' && data.error.trim()
        ? data.error.trim()
        : '';

    if (!message) {
      if (response.status === 404) {
        message = `AI endpoint (${url}) was not found on this deployment. Please redeploy the latest build.`;
      } else if (response.status === 413) {
        message = 'The uploaded file is too large for the server. Please use a file under 4 MB.';
      } else if (response.status === 429) {
        message = 'AI request quota temporarily exceeded. Please wait a moment and try again.';
      } else if (response.status === 502 || response.status === 503) {
        message = 'AI service is temporarily unreachable. Verify OPENROUTER_API_KEY in Vercel and try again.';
      } else if (response.status === 504) {
        message = 'The AI request timed out on the server. Please try a shorter prompt or fewer questions.';
      } else {
        message = `AI request failed with status ${response.status}. Please try again.`;
      }
    }

    const title = getToastTitleForStatus(response.status, serverCode);
    notifyAiFailure(title, message, `ai-http:${response.status}:${serverCode || message}`);
    throw new AiServiceError(message, response.status, serverCode || `HTTP_${response.status}`, retryable);
  }

  return data as T;
}

export const aiService = {
  async getStatus(options?: { silent?: boolean }): Promise<{
    configured: boolean;
    provider: 'openrouter' | 'gemini' | 'none';
    providers?: { openrouter: boolean; gemini: boolean };
  }> {
    let response: Response;
    try {
      response = await fetch('/api/ai/status', {
        signal: typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(15000) : undefined,
      });
    } catch {
      const msg = 'Unable to reach the AI status service. Please check your connection.';
      if (!options?.silent) {
        notifyAiFailure('AI Service Unreachable', msg, 'ai-status-unreachable');
      }
      throw new AiServiceError(msg, 503, 'AI_UNREACHABLE', true);
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const msg = data?.error || 'Failed to inspect AI service status.';
      if (!options?.silent) {
        notifyAiFailure(getToastTitleForStatus(response.status, data?.code), msg, 'ai-status-error');
      }
      throw new AiServiceError(msg, response.status, data?.code || 'AI_STATUS_ERROR', true);
    }
    return data;
  },

  async chat(
    message: string,
    history: { role: string; parts: { text: string }[] }[] = [],
    language?: string
  ): Promise<string> {
    const data = await postJson<{ text: string }>('/api/ai/chat', { message, history, language });
    return data.text || '';
  },

  async generateMcqs(content: string, count = 10, excludeQuestions: string[] = [], language?: string) {
    const data = await postJson<{ mcqs: any[] }>('/api/ai/mcqs', { content, count, excludeQuestions, language });
    return data.mcqs || [];
  },

  async generateFlashcards(content: string, language?: string) {
    const data = await postJson<{ flashcards: any[] }>('/api/ai/flashcards', { content, language });
    return data.flashcards || [];
  },

  async generateNotes(content: string, language?: string): Promise<string> {
    const data = await postJson<{ text: string }>('/api/ai/notes', { content, language });
    return data.text || '';
  },

  async generateMcqsFromImage(
    prompt: string,
    base64Data: string,
    mimeType: string,
    count = 10,
    excludeQuestions: string[] = [],
    language?: string
  ) {
    const data = await postJson<{ mcqs: any[] }>('/api/ai/mcqs', {
      content: prompt,
      base64Data,
      mimeType,
      count,
      excludeQuestions,
      language,
    });
    return data.mcqs || [];
  },

  async explainConcept(
    prompt: string,
    base64Image?: string,
    mimeType?: string,
    instruction?: string,
    language?: string
  ): Promise<string> {
    const data = await postJson<{ text: string }>('/api/ai/explain', {
      prompt,
      base64Image,
      mimeType,
      instruction,
      language,
    });
    return data.text || '';
  },

  async explainImage(
    prompt: string,
    base64Image: string,
    mimeType: string,
    instruction?: string,
    language?: string
  ): Promise<string> {
    return this.explainConcept(prompt, base64Image, mimeType, instruction, language);
  },

  async explainInSindhi(params: {
    question?: string;
    audioBase64?: string;
    audioMimeType?: string;
    subject?: string;
    grade?: string;
  }): Promise<{
    topicTitle: string;
    detectedQuestion: string;
    explanation: string;
    spokenScript: string;
    keyTakeaways: string[];
    suggestedLabSubject?: string;
  }> {
    return await postJson('/api/ai/sindhi-explain', params);
  },

  async synthesizeVoice(params: {
    text: string;
    voiceName?: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
    style?: string;
  }): Promise<{
    audioBase64: string;
    mimeType: string;
    voiceName: string;
  }> {
    return await postJson('/api/ai/tts', params);
  },

  async labAssistant(params: {
    action: LabAssistantAction;
    subject?: string;
    topic?: string;
    context?: string;
    language?: string;
  }): Promise<string> {
    const data = await postJson<{ text: string }>('/api/ai/lab-assistant', params);
    return data.text || '';
  },
};

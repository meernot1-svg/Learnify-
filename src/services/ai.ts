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

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
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
      throw new Error('The AI request timed out. Please try a shorter prompt or smaller file.');
    }
    throw new Error('Unable to reach the AI service. Please check your connection and try again.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (typeof data?.error === 'string' && data.error.trim()) {
      throw new Error(data.error);
    }
    if (response.status === 404) {
      throw new Error(`AI endpoint (${url}) was not found on this deployment. Please redeploy the latest build to Vercel.`);
    }
    if (response.status === 413) {
      throw new Error('The uploaded file is too large for the server. Please use a file under 4 MB.');
    }
    if (response.status === 502 || response.status === 503) {
      throw new Error('AI service is temporarily unavailable. Check that OPENROUTER_API_KEY or GEMINI_API_KEY is configured.');
    }
    if (response.status === 504) {
      throw new Error('The AI request timed out on the server. Please try a shorter prompt or fewer questions.');
    }
    throw new Error(`Request failed with status ${response.status}`);
  }
  return data as T;
}

export const aiService = {
  async getStatus(): Promise<{
    configured: boolean;
    provider: 'openrouter' | 'gemini' | 'none';
    providers?: { openrouter: boolean; gemini: boolean };
  }> {
    const response = await fetch('/api/ai/status');
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to inspect AI service status.');
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

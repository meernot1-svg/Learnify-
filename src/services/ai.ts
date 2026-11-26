async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }
  return data as T;
}

export const aiService = {
  async chat(message: string, history: { role: string; parts: { text: string }[] }[] = []): Promise<string> {
    const data = await postJson<{ text: string }>('/api/ai/chat', { message, history });
    return data.text || '';
  },

  async generateMcqs(content: string) {
    const data = await postJson<{ mcqs: any[] }>('/api/ai/mcqs', { content });
    return data.mcqs || [];
  },

  async generateFlashcards(content: string) {
    const data = await postJson<{ flashcards: any[] }>('/api/ai/flashcards', { content });
    return data.flashcards || [];
  },

  async generateNotes(content: string): Promise<string> {
    const data = await postJson<{ text: string }>('/api/ai/notes', { content });
    return data.text || '';
  },

  async generateMcqsFromImage(prompt: string, base64Data: string, mimeType: string) {
    const data = await postJson<{ mcqs: any[] }>('/api/ai/mcqs', {
      content: prompt,
      base64Data,
      mimeType,
    });
    return data.mcqs || [];
  },

  async explainConcept(prompt: string, base64Image?: string, mimeType?: string, instruction?: string): Promise<string> {
    const data = await postJson<{ text: string }>('/api/ai/explain', {
      prompt,
      base64Image,
      mimeType,
      instruction,
    });
    return data.text || '';
  },

  async explainImage(prompt: string, base64Image: string, mimeType: string, instruction?: string): Promise<string> {
    return this.explainConcept(prompt, base64Image, mimeType, instruction);
  },

  async predictPaperFromImage(prompt: string, base64Image: string, mimeType: string): Promise<string> {
    const data = await postJson<{ text: string }>('/api/ai/predict-paper', {
      content: prompt,
      base64Image,
      mimeType,
    });
    return data.text || '';
  },

  async predictPaper(pastPaperContent: string): Promise<string> {
    const data = await postJson<{ text: string }>('/api/ai/predict-paper', {
      content: pastPaperContent,
    });
    return data.text || '';
  },
};

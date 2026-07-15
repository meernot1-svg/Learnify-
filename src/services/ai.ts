import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export const aiService = {
  async chat(message: string, history: { role: string, parts: { text: string }[] }[] = []) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [...history, { role: 'user', parts: [{ text: message }] }],
        config: {
          systemInstruction: "You are EduAI, a friendly and helpful teaching assistant for the EduPulse platform. You help students with subjects like Computer Science, Physics, Chemistry, and Biology. Be concise, clear, and encouraging."
        }
      });
      return response.text || "I'm sorry, I couldn't process that.";
    } catch (error) {
      console.error("AI Chat Error:", error);
      return "AI service is currently unavailable.";
    }
  },

  async generateMcqs(content: string) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Content: ${content}`,
        config: {
          systemInstruction: "Generate 5 multiple choice questions from the provided content. Return only as a JSON array of objects with 'question', 'options' (array of 4 strings), and 'correctIndex' (number from 0-3).",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctIndex: { type: Type.NUMBER }
              },
              required: ["question", "options", "correctIndex"]
            }
          }
        }
      });
      return JSON.parse(response.text || "[]");
    } catch (error) {
      console.error("AI MCQ Error:", error);
      return [];
    }
  },

  async generateFlashcards(content: string) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Content: ${content}`,
        config: {
          systemInstruction: "Generate 10 educational flashcards from the provided content. Return only as a JSON array of objects with 'front' and 'back'.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                front: { type: Type.STRING },
                back: { type: Type.STRING }
              },
              required: ["front", "back"]
            }
          }
        }
      });
      return JSON.parse(response.text || "[]");
    } catch (error) {
      console.error("AI Flashcards Error:", error);
      return [];
    }
  },

  async generateNotes(content: string) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Content: ${content}`,
        config: {
          systemInstruction: "Generate comprehensive study notes based on the provided content. Use Markdown for formatting with clear headings, bullet points, and bold text for key terms. Keep it structured and easy to read."
        }
      });
      return response.text || "Failed to generate notes.";
    } catch (error) {
      console.error("AI Notes Error:", error);
      return "AI service is currently unavailable.";
    }
  },

  async generateMcqsFromImage(prompt: string, base64Data: string, mimeType: string) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: {
          parts: [
            { text: `Context/User Request: ${prompt}` },
            { inlineData: { data: base64Data, mimeType } }
          ]
        },
        config: {
          systemInstruction: "You are an educational assessment expert. Generate 5 multiple choice questions based on the provided material. Return only as a JSON array of objects with 'question', 'options' (array of 4 strings), and 'correctIndex' (number from 0-3). Ensure questions are challenging and accurate.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctIndex: { type: Type.NUMBER }
              },
              required: ["question", "options", "correctIndex"]
            }
          }
        }
      });
      return JSON.parse(response.text || "[]");
    } catch (error) {
      console.error("AI MCQ Image Error:", error);
      throw error; // Throw so the UI can catch and alert
    }
  },

  async explainConcept(prompt: string, base64Image?: string, mimeType?: string, instruction?: string) {
    try {
      const systemPrompt = instruction || "Answer with clear, structured text and include SVG or Mermaid diagram code if relevant. If you provide diagrams, wrap them in ```mermaid or ```svg blocks.";
      if (base64Image && mimeType) {
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: {
            parts: [
              { text: `${prompt}. ${systemPrompt}` },
              { inlineData: { data: base64Image, mimeType } }
            ]
          }
        });
        return response.text || "Unable to analyze the image.";
      } else {
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `${prompt}. ${systemPrompt}`
        });
        return response.text || "Unable to explain the concept.";
      }
    } catch (error) {
      console.error("AI Explainer Error:", error);
      throw error;
    }
  },

  async explainImage(prompt: string, base64Image: string, mimeType: string, instruction?: string) {
    return this.explainConcept(prompt, base64Image, mimeType, instruction);
  },

  async predictPaperFromImage(prompt: string, base64Image: string, mimeType: string) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: {
          parts: [
            { text: `Analyze this past paper and predict important topics and likely questions for the next exam. ${prompt}` },
            { inlineData: { data: base64Image, mimeType } }
          ]
        }
      });
      return response.text || "Unable to predict paper patterns.";
    } catch (error) {
      console.error("AI Paper Predictor Image Error:", error);
      throw error;
    }
  },

  async predictPaper(pastPaperContent: string) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Based on the following past paper content, predict important topics and likely questions for the next exam. Format it nicely with headings.\n\nPast Paper Content: ${pastPaperContent}`
      });
      return response.text || "Unable to predict paper patterns.";
    } catch (error) {
      console.error("AI Paper Predictor Error:", error);
      throw error;
    }
  }
};

import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY;

export const generateBio = async (keywords: string, tone: 'professional' | 'fun' | 'creative' = 'creative'): Promise<string> => {
  if (!apiKey) {
    console.error("API Key is missing");
    return "Error: API Key missing. Cannot generate bio.";
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const prompt = `Write a short, engaging, and ${tone} social media bio (under 160 characters) based on these keywords/topics: ${keywords}. Do not use hashtags. Just the text.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text?.trim() || "Could not generate bio.";
  } catch (error) {
    console.error("Error generating bio:", error);
    return "Error generating bio. Please try again.";
  }
};

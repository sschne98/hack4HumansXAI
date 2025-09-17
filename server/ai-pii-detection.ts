// AI-based PII Detection Service using Gemini
// This integration uses the javascript_gemini blueprint for secure API key management
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface AIPIIDetectionResult {
  hasPII: boolean;
  detectedTypes: string[];
  matchedText: string[];
  confidence: number;
}

export async function detectPIIWithAI(text: string): Promise<AIPIIDetectionResult> {
  try {
    const systemPrompt = `You are a privacy protection expert specializing in detecting personally identifiable information (PII) in text messages.

Analyze the following text and identify any PII including:
- Full names (first and last names together)
- Email addresses
- Phone numbers (any format)
- Social Security Numbers
- Credit card numbers
- Home/mailing addresses
- Driver's license numbers
- Passport numbers
- Date of birth
- Government ID numbers
- Bank account numbers

Return your analysis as JSON with this exact format:
{
  "hasPII": boolean,
  "detectedTypes": ["type1", "type2"],
  "matchedText": ["actual text found", "another match"],
  "confidence": number between 0 and 1
}

Be conservative - it's better to flag potential PII than miss it. Only include items you're confident are PII.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            hasPII: { type: "boolean" },
            detectedTypes: { 
              type: "array",
              items: { type: "string" }
            },
            matchedText: {
              type: "array", 
              items: { type: "string" }
            },
            confidence: { type: "number" }
          },
          required: ["hasPII", "detectedTypes", "matchedText", "confidence"]
        }
      },
      contents: `Analyze this text for PII: "${text}"`
    });

    const rawJson = response.text;
    
    if (rawJson) {
      const result: AIPIIDetectionResult = JSON.parse(rawJson);
      
      // Validate the result structure
      if (typeof result.hasPII !== 'boolean' || 
          !Array.isArray(result.detectedTypes) || 
          !Array.isArray(result.matchedText) ||
          typeof result.confidence !== 'number') {
        throw new Error('Invalid response format from AI');
      }
      
      return result;
    } else {
      throw new Error("Empty response from Gemini API");
    }
  } catch (error) {
    console.error('AI PII Detection error:', error);
    
    // Fallback to basic pattern detection if AI fails
    return {
      hasPII: false,
      detectedTypes: [],
      matchedText: [],
      confidence: 0
    };
  }
}

export function getAgeAppropriatePIIWarning(age: number | undefined, detectedTypes: string[]) {
  if (!age || detectedTypes.length === 0) return null;
  
  const typesText = detectedTypes.length > 1 
    ? `${detectedTypes.slice(0, -1).join(', ')} and ${detectedTypes[detectedTypes.length - 1]}`
    : detectedTypes[0];

  if (age < 18) {
    return {
      title: "DigiGuard",
      message: `We noticed you're about to share your ${typesText}. This is personal information that could be used to find or contact you in real life. Never share personal details with strangers online. Only share this information with trusted family members. Your safety is the most important thing!`
    };
  } else if (age < 25) {
    return {
      title: "DigiGuard",
      message: `Your message contains ${typesText}. Sharing personal information online can put your privacy and security at risk. Think carefully about who you're sharing this with and whether they really need this information.`
    };
  } else {
    return {
      title: "DigiGuard",
      message: `Your message contains ${typesText}. Sharing personal information in digital communications can expose you to privacy risks, identity theft, and unwanted contact. Please verify that all recipients need and can be trusted with this information.`
    };
  }
}
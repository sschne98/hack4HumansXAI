// AI-based PII Detection Service using Gemini
// This integration uses the javascript_gemini blueprint for secure API key management
import { GoogleGenAI } from "@google/genai";
import { detectPII, PIIDetectionResult } from "../client/src/lib/pii-detection";

// Initialize AI client with proper validation
const initializeAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    console.warn("GEMINI_API_KEY is not configured. AI PII detection will fallback to pattern matching.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

const ai = initializeAI();

export interface AIPIIDetectionResult {
  hasPII: boolean;
  detectedTypes: string[];
  matchedText: string[];
  confidence: number;
}

export async function detectPIIWithAI(text: string): Promise<AIPIIDetectionResult> {
  // If no AI client is available, fallback to pattern-based detection immediately
  if (!ai) {
    console.log('AI client not available, using pattern-based PII detection');
    return convertPatternResultToAI(detectPII(text));
  }

  try {
    const systemPrompt = `You are a privacy protection expert specializing in detecting personally identifiable information (PII) in text messages.

Analyze the following text and identify any PII or inappropriate content including:
- Full names (first and last names together)
- Email addresses
- Phone numbers (any format)
- Social Security Numbers
- Credit card numbers
- Home/mailing addresses (street addresses, apartment numbers, zip codes)
- Driver's license numbers
- Passport numbers
- Date of birth/birthday (any date that could be someone's birthday)
- Government ID numbers
- Bank account numbers
- Physical addresses (including partial addresses like "123 Main Street" or "New York, NY 10001")
- Profanity or swear words (mild to strong offensive language)

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
    
    if (!rawJson || rawJson.trim() === "") {
      throw new Error("Empty response from Gemini API");
    }
    
    let result: AIPIIDetectionResult;
    try {
      result = JSON.parse(rawJson);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Invalid JSON response from AI');
    }
    
    // Validate the result structure
    if (typeof result.hasPII !== 'boolean' || 
        !Array.isArray(result.detectedTypes) || 
        !Array.isArray(result.matchedText) ||
        typeof result.confidence !== 'number') {
      throw new Error('Invalid response format from AI');
    }
    
    console.log(`AI PII Detection successful: ${result.hasPII ? 'PII detected' : 'No PII detected'}`);
    return result;
    
  } catch (error) {
    console.error('AI PII Detection failed, using pattern-based fallback:', error);
    
    // Fallback to pattern-based detection when AI fails
    const patternResult = detectPII(text);
    const fallbackResult = convertPatternResultToAI(patternResult);
    
    console.log(`Pattern-based fallback result: ${fallbackResult.hasPII ? 'PII detected' : 'No PII detected'}`);
    return fallbackResult;
  }
}

// Helper function to convert pattern-based result to AI result format
function convertPatternResultToAI(patternResult: PIIDetectionResult): AIPIIDetectionResult {
  return {
    hasPII: patternResult.hasPII,
    detectedTypes: patternResult.detectedTypes,
    matchedText: patternResult.matchedText,
    confidence: patternResult.hasPII ? 0.8 : 1.0 // High confidence for pattern matches, full confidence for no matches
  };
}

export function getAgeAppropriatePIIWarning(age: number | undefined, detectedTypes: string[]) {
  if (!age || detectedTypes.length === 0) return null;
  
  // Handle profanity separately from PII
  const hasProfanity = detectedTypes.includes('profanity');
  const piiTypes = detectedTypes.filter(type => type !== 'profanity');
  
  if (hasProfanity && piiTypes.length === 0) {
    // Only profanity detected
    if (age < 18) {
      return {
        title: "DigiGuard",
        message: "We noticed your message contains inappropriate language. Using swear words online can get you in trouble with teachers, parents, or get your account banned. It's better to express yourself in a positive way that won't hurt your reputation or relationships!"
      };
    } else if (age < 25) {
      return {
        title: "DigiGuard", 
        message: "Your message contains profanity. Using offensive language online can damage your professional reputation, affect job opportunities, and may violate platform rules. Consider rephrasing your message more professionally."
      };
    } else {
      return {
        title: "DigiGuard",
        message: "Your message contains profanity. Offensive language can damage your professional reputation, create legal issues in workplace communications, and may result in account restrictions. Please consider using more appropriate language."
      };
    }
  }
  
  // Handle PII (with or without profanity)
  const typesText = piiTypes.length > 1 
    ? `${piiTypes.slice(0, -1).join(', ')} and ${piiTypes[piiTypes.length - 1]}`
    : piiTypes[0];
    
  const profanityNote = hasProfanity ? " Also, your message contains inappropriate language which could further compromise your safety and reputation." : "";

  if (age < 18) {
    return {
      title: "DigiGuard",
      message: `We noticed you're about to share your ${typesText}. This is personal information that could be used to find or contact you in real life. Never share personal details with strangers online. Only share this information with trusted family members. Your safety is the most important thing!${profanityNote}`
    };
  } else if (age < 25) {
    return {
      title: "DigiGuard",
      message: `Your message contains ${typesText}. Sharing personal information online can put your privacy and security at risk. Think carefully about who you're sharing this with and whether they really need this information.${profanityNote}`
    };
  } else {
    return {
      title: "DigiGuard",
      message: `Your message contains ${typesText}. Sharing personal information in digital communications can expose you to privacy risks, identity theft, and unwanted contact. Please verify that all recipients need and can be trusted with this information.${profanityNote}`
    };
  }
}
// PII Detection Utility
export interface PIIDetectionResult {
  hasPII: boolean;
  detectedTypes: string[];
  matchedText: string[];
}

export function detectPII(text: string): PIIDetectionResult {
  const result: PIIDetectionResult = {
    hasPII: false,
    detectedTypes: [],
    matchedText: []
  };

  // Phone number patterns
  const phonePatterns = [
    /\b\d{3}-\d{3}-\d{4}\b/g, // XXX-XXX-XXXX
    /\b\(\d{3}\)\s*\d{3}-\d{4}\b/g, // (XXX) XXX-XXXX
    /\b\d{3}\.\d{3}\.\d{4}\b/g, // XXX.XXX.XXXX
    /\b\d{10}\b/g, // XXXXXXXXXX
    /\+\d{1,3}\s?\d{3,14}/g // International format
  ];

  // Email pattern
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

  // Social Security Number patterns
  const ssnPatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/g, // XXX-XX-XXXX
    /\b\d{9}\b/g // XXXXXXXXX (only if surrounded by SSN context)
  ];

  // Credit card patterns (basic)
  const creditCardPattern = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g;

  // Address patterns (basic - street numbers and common patterns)
  const addressPatterns = [
    /\b\d+\s+(north|south|east|west|n|s|e|w)?\s*\w+\s+(street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|place|pl)\b/gi,
    /\b\d+\s+\w+\s+(street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|place|pl)\b/gi
  ];

  // Date of birth patterns
  const dobPatterns = [
    /\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/(19|20)\d{2}\b/g, // MM/DD/YYYY
    /\b(0?[1-9]|[12]\d|3[01])\/(0?[1-9]|1[0-2])\/(19|20)\d{2}\b/g, // DD/MM/YYYY
    /\b(19|20)\d{2}-(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])\b/g // YYYY-MM-DD
  ];

  // Check phone numbers
  phonePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      result.hasPII = true;
      result.detectedTypes.push('phone number');
      result.matchedText.push(...matches);
    }
  });

  // Check email addresses
  const emailMatches = text.match(emailPattern);
  if (emailMatches) {
    result.hasPII = true;
    result.detectedTypes.push('email address');
    result.matchedText.push(...emailMatches);
  }

  // Check SSN
  ssnPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      result.hasPII = true;
      result.detectedTypes.push('social security number');
      result.matchedText.push(...matches);
    }
  });

  // Check credit cards
  const ccMatches = text.match(creditCardPattern);
  if (ccMatches) {
    result.hasPII = true;
    result.detectedTypes.push('credit card number');
    result.matchedText.push(...ccMatches);
  }

  // Check addresses
  addressPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      result.hasPII = true;
      result.detectedTypes.push('address');
      result.matchedText.push(...matches);
    }
  });

  // Check dates of birth
  dobPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      result.hasPII = true;
      result.detectedTypes.push('date of birth');
      result.matchedText.push(...matches);
    }
  });

  // Remove duplicates
  result.detectedTypes = [...new Set(result.detectedTypes)];
  result.matchedText = [...new Set(result.matchedText)];

  return result;
}

export function getAgeAppropriatePIIWarning(age: number | undefined, detectedTypes: string[]) {
  if (!age) return null;
  
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
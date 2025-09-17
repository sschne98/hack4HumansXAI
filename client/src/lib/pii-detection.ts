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

  // Address patterns (enhanced - street numbers, apartment numbers, zip codes)
  const addressPatterns = [
    /\b\d+\s+(north|south|east|west|n|s|e|w)?\s*\w+\s+(street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|place|pl)\b/gi,
    /\b\d+\s+\w+\s+(street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|place|pl)\b/gi,
    /\b\d+\s+[a-zA-Z\s]+(apt|apartment|unit|suite|ste)\s*#?\s*\d+\b/gi, // Apartment numbers
    /\b\d{5}(-\d{4})?\b/g, // ZIP codes (5 digits or 5+4 format)
    /\b[a-zA-Z\s]+,\s*[A-Z]{2}\s+\d{5}(-\d{4})?\b/g // City, State ZIP
  ];

  // Profanity patterns (basic - common swear words and variations)
  const profanityPatterns = [
    // Basic swear words with variations (including -ing, -ed, etc.)
    /\b(fuck|fucking|fucked|fucker|shit|shitting|damn|hell|bitch|bitching|ass|crap|crappy)\b/gi,
    // Common replacements with asterisks
    /\b(f\*ck|f\*\*k|sh\*t|d\*mn|h\*ll|b\*tch|\*ss|cr\*p)\b/gi,
    // L33t speak variations
    /\b(f[u0]ck|sh[i1]t|d[a4]mn|h[e3]ll|b[i1]tch|[a4]ss|cr[a4]p)\b/gi,
    // Partial censoring patterns  
    /\b(f[\*#@$%]+ck?|sh[\*#@$%]+t|d[\*#@$%]+mn?|b[\*#@$%]+tch)\b/gi
  ];

  // Date of birth/birthday patterns (enhanced)
  const dobPatterns = [
    /\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/(19|20)\d{2}\b/g, // MM/DD/YYYY
    /\b(0?[1-9]|[12]\d|3[01])\/(0?[1-9]|1[0-2])\/(19|20)\d{2}\b/g, // DD/MM/YYYY
    /\b(19|20)\d{2}-(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])\b/g, // YYYY-MM-DD
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(0?[1-9]|[12]\d|3[01])(st|nd|rd|th)?,?\s+(19|20)\d{2}\b/gi, // "January 15th, 1990"
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(0?[1-9]|[12]\d|3[01])(st|nd|rd|th)?,?\s+(19|20)\d{2}\b/gi, // "Jan 15th, 1990"
    /\b(0?[1-9]|[12]\d|3[01])(st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(19|20)\d{2}\b/gi, // "15th January 1990"
    /\bborn\s+on\s+[^.!?]{1,30}(19|20)\d{2}/gi, // "born on [date]"
    /\bbirthday\s+is\s+[^.!?]{1,30}(19|20)\d{2}/gi, // "birthday is [date]"
    /\bmy\s+birthday\s+[^.!?]{1,30}(19|20)\d{2}/gi // "my birthday [date]"
  ];

  // Scam detection patterns
  const scamPatterns = [
    // Financial scams
    /\b(urgent|immediate).*?(money|cash|payment|transfer|wire|fund)\b/gi,
    /\b(lottery|prize|winner|jackpot).*?(million|thousand|\$|\€|\£)\b/gi,
    /\b(investment|trading|profit|return).*?(guaranteed|risk-free|double|triple)\b/gi,
    /\b(pay|send|transfer).*?(fee|tax|charge).*?(release|unlock|claim)\b/gi,
    
    // Phishing and credential theft
    /\b(verify|confirm|update).*?(account|password|credentials|login)\b/gi,
    /\b(suspended|blocked|locked).*?(account|card|profile)\b/gi,
    /\b(click|visit).*?(link|url).*?(verify|confirm|secure)\b/gi,
    /\b(enter|provide).*?(ssn|social security|pin|password|credit card)\b/gi,
    
    // Romance/relationship scams
    /\b(love|darling|honey).*?(money|help|emergency|surgery|hospital)\b/gi,
    /\b(marry|relationship).*?(visa|immigration|travel|money)\b/gi,
    /\b(stranded|stuck|airport|hospital).*?(money|help|wire|send)\b/gi,
    
    // Tech support scams
    /\b(computer|pc|virus|malware|hacked).*?(remote|access|control|fix)\b/gi,
    /\b(microsoft|windows|apple|google).*?(support|technician|security)\b/gi,
    /\b(install|download).*?(software|program|app).*?(fix|repair|clean)\b/gi,
    
    // Authority impersonation
    /\b(irs|fbi|police|government|bank|court).*?(investigation|audit|warrant|legal)\b/gi,
    /\b(arrest|jail|fine|penalty).*?(avoid|prevent|stop).*?(payment|money)\b/gi,
    
    // Urgency and pressure tactics
    /\b(act now|limited time|expires soon|today only|last chance)\b/gi,
    /\b(don't tell|keep secret|confidential|private|between us)\b/gi,
    /\b(act fast|hurry|quick|immediately|asap).*?(before|expires|ends)\b/gi,
    
    // Cryptocurrency/crypto scams
    /\b(bitcoin|cryptocurrency|crypto|blockchain).*?(investment|mining|profit|wallet)\b/gi,
    /\b(send|transfer).*?(bitcoin|crypto|wallet address|private key)\b/gi,
    
    // Prize/gift scams
    /\b(congratulations|selected|chosen|winner).*?(prize|gift|reward|bonus)\b/gi,
    /\b(claim|collect).*?(prize|reward|gift).*?(fee|shipping|handling)\b/gi
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
      result.detectedTypes.push('birthday');
      result.matchedText.push(...matches);
    }
  });

  // Check profanity
  profanityPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      result.hasPII = true;
      result.detectedTypes.push('profanity');
      result.matchedText.push(...matches);
    }
  });

  // Check scam patterns
  scamPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      result.hasPII = true;
      result.detectedTypes.push('scam');
      result.matchedText.push(...matches);
    }
  });

  // Remove duplicates
  result.detectedTypes = Array.from(new Set(result.detectedTypes));
  result.matchedText = Array.from(new Set(result.matchedText));

  return result;
}

export function getAgeAppropriatePIIWarning(age: number | undefined, detectedTypes: string[]) {
  if (!age) return null;
  
  // Handle scam detection separately
  if (detectedTypes.includes('scam')) {
    return {
      title: "🚨 DigiGuard Scam Alert",
      message: "This message contains patterns commonly used in scams or fraud attempts. Be very cautious - never send money, share personal information, or click suspicious links from unknown contacts. When in doubt, verify through a different communication method."
    };
  }
  
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
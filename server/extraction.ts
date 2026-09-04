import { GoogleGenAI, Type } from '@google/genai';
import { ExtractedEntitiesResult } from '../src/types';
import { normalizePhone, normalizeVehicle, normalizeFinancial, normalizeName, detectNameDuplicate } from './normalizer';

// Known Indian cities, locations, NCR zones for robust rule-based fallback
const KNOWN_LOCATIONS = [
  'Gurgaon', 'Delhi', 'Noida', 'Faridabad', 'Ghaziabad', 'Jaipur', 'Chandni Chowk', 
  'Connaught Place', 'Cyber Hub', 'Rohini', 'Dwarka', 'Mahipalpur', 'Nehru Place', 
  'Okhla', 'Sector 62', 'Sector 29', 'DLF Phase 3', 'Janakpuri', 'Mehrauli', 
  'Mayur Vihar', 'KMP Expressway', 'Bata Chowk'
];

const KNOWN_COMMON_NAMES = [
  'Rahul Sharma', 'Amit Kumar', 'Suresh Yadav', 'Vikas Dubey', 'Sunil Gujjar', 
  'Vikram Singh', 'Deepak Chauhan', 'Manoj Khandelwal', 'Pooja Hegde', 'Rajesh Verma',
  'Rohit Malik', 'Anil Tyagi', 'R. Sharma', 'Rahul S.', 'Rahul Kumar Sharma'
];

// Fallback rule-based extractor
export function extractEntitiesRuleBased(text: string, existingPersons: string[] = []): ExtractedEntitiesResult {
  const result: ExtractedEntitiesResult = {
    persons: [],
    phones: [],
    vehicles: [],
    locations: [],
    financials: [],
    organizations: [],
    dates: [],
    normalizationSuggestions: []
  };

  if (!text) return result;

  // 1. Phone extraction: 10-digit mobile, +91-..., 98xxxxxxxx
  const phoneRegex = /(?:\+?91[\-\s]?)?[6-9]\d{4}[\-\s]?\d{5}\b/g;
  const rawPhones = text.match(phoneRegex) || [];
  for (const raw of rawPhones) {
    const norm = normalizePhone(raw);
    if (!result.phones.includes(norm)) {
      result.phones.push(norm);
    }
  }

  // 2. Vehicle plate extraction: Indian registration (e.g. DL01AB1234, HR26DQ4421, UP16BF8899)
  const vehicleRegex = /\b([A-Z]{2}[\s\-]?[0-9]{1,2}[\s\-]?[A-Z]{1,3}[\s\-]?[0-9]{4})\b/gi;
  const rawVehicles = text.match(vehicleRegex) || [];
  for (const raw of rawVehicles) {
    const norm = normalizeVehicle(raw);
    if (norm.length >= 8 && norm.length <= 11 && !result.vehicles.includes(norm)) {
      result.vehicles.push(norm);
    }
  }

  // 3. Financial identifier: UPI IDs (user@bank, user@upi, etc.)
  const upiRegex = /\b[a-zA-Z0-9.\-_]{2,30}@(upi|okhdfcbank|paytm|icici|axl|sbi|ybl|okaxis)\b/gi;
  const rawUpis = text.match(upiRegex) || [];
  for (const raw of rawUpis) {
    const norm = normalizeFinancial(raw);
    if (!result.financials.includes(norm)) {
      result.financials.push(norm);
    }
  }

  // 4. Locations: Check known list and "Sector XX", "District", "Chowk"
  for (const loc of KNOWN_LOCATIONS) {
    const regex = new RegExp(`\\b${loc}\\b`, 'i');
    if (regex.test(text) && !result.locations.includes(loc)) {
      result.locations.push(loc);
    }
  }

  // 5. Organizations: matches Pvt Ltd, Logistics, LLC, Services, Garage, Bank, Syndicate
  const orgRegex = /\b([A-Z][a-zA-Z0-9&]+(?:\s+[A-Z][a-zA-Z0-9&]+)*\s+(?:Logistics|Enterprises|Services|Garage|LLC|Pvt Ltd|Corporation|Advisory|Agency))\b/g;
  const rawOrgs = text.match(orgRegex) || [];
  for (const raw of rawOrgs) {
    const trimmed = raw.trim();
    if (!result.organizations.includes(trimmed)) {
      result.organizations.push(trimmed);
    }
  }

  // 6. Dates: DD/MM/YYYY, YYYY-MM-DD
  const dateRegex = /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/g;
  const rawDates = text.match(dateRegex) || [];
  for (const raw of rawDates) {
    result.dates.push(raw.trim());
  }

  // 7. Persons: Check against known list or Title patterns (e.g. Mr., Suspect, Accomplice, Driver + Name)
  for (const name of KNOWN_COMMON_NAMES) {
    const regex = new RegExp(`\\b${name.replace('.', '\\.')}\\b`, 'i');
    if (regex.test(text) && !result.persons.includes(name)) {
      result.persons.push(name);
    }
  }

  // Regex pattern for Name indicators: "suspect [Name]", "accomplice [Name]", "arrested [Name]"
  const personContextRegex = /(?:suspect|accomplice|driver|accused|courier|manager|interception of|named|fled with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/gi;
  let match: RegExpExecArray | null;
  while ((match = personContextRegex.exec(text)) !== null) {
    const candidate = match[1].trim();
    if (
      candidate && 
      !KNOWN_LOCATIONS.includes(candidate) && 
      !result.persons.includes(candidate) &&
      !result.organizations.includes(candidate)
    ) {
      result.persons.push(candidate);
    }
  }

  // Compute normalization suggestions against existing persons
  const allExisting = [...new Set([...existingPersons, ...KNOWN_COMMON_NAMES])];
  for (const p of result.persons) {
    for (const ex of allExisting) {
      const dup = detectNameDuplicate(p, ex);
      if (dup) {
        result.normalizationSuggestions.push({
          original: p,
          canonical: dup.suggestedCanonical,
          type: 'PERSON',
          existingEntityName: ex,
          confidence: dup.similarity
        });
      }
    }
  }

  return result;
}

// AI-powered extractor using Gemini API if key is available
export async function extractEntitiesWithAI(text: string, existingPersons: string[] = []): Promise<ExtractedEntitiesResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    // Graceful fallback to rule-based engine
    return extractEntitiesRuleBased(text, existingPersons);
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const prompt = `Extract all investigative crime entities from the following FIR/Case text. Return JSON matching the schema.
Text to analyze:
"""
${text}
"""`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: "You are an expert crime intelligence analyst extracting entities for law-enforcement investigation decision support. Extract exact full names of people, 10-digit or raw phone numbers, vehicle registration numbers, cities/locations, financial accounts (UPI/bank), organizations, and dates.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            persons: { type: Type.ARRAY, items: { type: Type.STRING } },
            phones: { type: Type.ARRAY, items: { type: Type.STRING } },
            vehicles: { type: Type.ARRAY, items: { type: Type.STRING } },
            locations: { type: Type.ARRAY, items: { type: Type.STRING } },
            financials: { type: Type.ARRAY, items: { type: Type.STRING } },
            organizations: { type: Type.ARRAY, items: { type: Type.STRING } },
            dates: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["persons", "phones", "vehicles", "locations", "financials", "organizations", "dates"]
        }
      }
    });

    const contentText = response.text?.trim();
    if (!contentText) {
      return extractEntitiesRuleBased(text, existingPersons);
    }

    const parsed = JSON.parse(contentText);
    
    // Normalize extracted items
    const normalizedPersons: string[] = (parsed.persons || []).map((p: string) => normalizeName(p)).filter(Boolean);
    const normalizedPhones: string[] = (parsed.phones || []).map((p: string) => normalizePhone(p)).filter(Boolean);
    const normalizedVehicles: string[] = (parsed.vehicles || []).map((v: string) => normalizeVehicle(v)).filter(Boolean);
    const normalizedFinancials: string[] = (parsed.financials || []).map((f: string) => normalizeFinancial(f)).filter(Boolean);
    const locations: string[] = (parsed.locations || []).map((l: string) => l.trim()).filter(Boolean);
    const organizations: string[] = (parsed.organizations || []).map((o: string) => o.trim()).filter(Boolean);
    const dates: string[] = (parsed.dates || []).map((d: string) => d.trim()).filter(Boolean);

    // Run duplicate detection
    const normalizationSuggestions: ExtractedEntitiesResult['normalizationSuggestions'] = [];
    for (const p of normalizedPersons) {
      for (const ex of existingPersons) {
        const dup = detectNameDuplicate(p, ex);
        if (dup) {
          normalizationSuggestions.push({
            original: p,
            canonical: dup.suggestedCanonical,
            type: 'PERSON',
            existingEntityName: ex,
            confidence: dup.similarity
          });
        }
      }
    }

    return {
      persons: [...new Set(normalizedPersons)],
      phones: [...new Set(normalizedPhones)],
      vehicles: [...new Set(normalizedVehicles)],
      locations: [...new Set(locations)],
      financials: [...new Set(normalizedFinancials)],
      organizations: [...new Set(organizations)],
      dates: [...new Set(dates)],
      normalizationSuggestions
    };
  } catch (error) {
    console.warn('[Trinetra Entity Extraction] Gemini API call failed or timed out, falling back to rule-based engine:', error);
    return extractEntitiesRuleBased(text, existingPersons);
  }
}

import { EntityType } from '../src/types';

export function normalizePhone(raw: string): string {
  // Strip all non-digit characters
  const digits = raw.replace(/\D/g, '');
  // If starts with 91 and length 12 -> last 10
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  // If starts with 0 and length 11 -> last 10
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  // If already 10 digits
  if (digits.length === 10) {
    return digits;
  }
  return digits || raw.trim();
}

export function normalizeVehicle(raw: string): string {
  // Uppercase, strip spaces, dashes, dots
  return raw.toUpperCase().replace(/[\s\-_.]/g, '').trim();
}

export function normalizeFinancial(raw: string): string {
  return raw.toLowerCase().trim();
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export interface SimilarityMatch {
  name: string;
  similarity: number;
  reason: string;
  suggestedCanonical: string;
}

// Compare names to detect possible duplicates (e.g. Rahul Sharma vs Rahul Kumar Sharma vs R. Sharma vs Rahul S.)
export function detectNameDuplicate(nameA: string, nameB: string): SimilarityMatch | null {
  const a = nameA.toLowerCase().trim();
  const b = nameB.toLowerCase().trim();

  if (a === b) return null; // Exact match already identical

  const tokensA = a.split(/\s+/);
  const tokensB = b.split(/\s+/);

  // 1. Initial pattern: "R. Sharma" vs "Rahul Sharma"
  const firstNameA = tokensA[0].replace('.', '');
  const firstNameB = tokensB[0].replace('.', '');
  const lastNameA = tokensA[tokensA.length - 1];
  const lastNameB = tokensB[tokensB.length - 1];

  if (lastNameA === lastNameB && lastNameA.length > 2) {
    // Check initial match
    if (
      (firstNameA.length === 1 && firstNameB.startsWith(firstNameA)) ||
      (firstNameB.length === 1 && firstNameA.startsWith(firstNameB))
    ) {
      return {
        name: nameB,
        similarity: 0.88,
        reason: `Initial abbreviation match with common surname "${lastNameA}"`,
        suggestedCanonical: firstNameA.length > firstNameB.length ? nameA : nameB
      };
    }

    // 2. Middle name variation: "Rahul Sharma" vs "Rahul Kumar Sharma"
    if (firstNameA === firstNameB) {
      return {
        name: nameB,
        similarity: 0.85,
        reason: `Shared first name "${tokensA[0]}" and surname "${lastNameA}" with middle name variance`,
        suggestedCanonical: tokensA.length > tokensB.length ? nameA : nameB
      };
    }

    // 3. Trailing initial: "Rahul S." vs "Rahul Sharma"
    if (firstNameA === firstNameB && (tokensA.length > 1 && tokensB.length > 1)) {
      const secondA = tokensA[1].replace('.', '');
      const secondB = tokensB[1].replace('.', '');
      if (
        (secondA.length === 1 && secondB.startsWith(secondA)) ||
        (secondB.length === 1 && secondA.startsWith(secondB))
      ) {
        return {
          name: nameB,
          similarity: 0.90,
          reason: `Abbreviated surname initial match for "${firstNameA}"`,
          suggestedCanonical: secondA.length > secondB.length ? nameA : nameB
        };
      }
    }
  }

  // Jaro-Winkler / Levenshtein distance check for typos
  const distance = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  const ratio = 1 - distance / maxLen;

  if (ratio >= 0.82) {
    return {
      name: nameB,
      similarity: Number(ratio.toFixed(2)),
      reason: `High phonetic/character similarity (${Math.round(ratio * 100)}%)`,
      suggestedCanonical: nameA.length >= nameB.length ? nameA : nameB
    };
  }

  return null;
}

function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

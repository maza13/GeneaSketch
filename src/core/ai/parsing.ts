export function stripCodeFence(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  // Match the core JSON block between backticks
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match?.[1]) return match[1].trim();
  return trimmed;
}

export function safeParseJson<T>(value: string): T | null {
  if (!value) return null;
  // 1. Remove invisible characters (NBSP) that break standard JSON.parse
  let cleaned = value.replace(/\u00A0/g, " ");

  // 2. Try stripping markdown code fences if present
  cleaned = stripCodeFence(cleaned);

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // 3. Fallback: Try regex to extract the first balanced or largest JSON-looking block
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        const potentialJson = cleaned.slice(firstBrace, lastBrace + 1);
        return JSON.parse(potentialJson) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}


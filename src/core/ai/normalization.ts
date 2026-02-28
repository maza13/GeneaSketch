const PLACE_DICTIONARY: Record<string, string> = {
  "cdmx": "Ciudad de Mexico",
  "edo mex": "Estado de Mexico",
  "edomex": "Estado de Mexico",
  "mexico df": "Ciudad de Mexico",
  "usa": "United States",
  "eeuu": "United States"
};

function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Deterministic place normalization (no AI calls).
 */
export async function normalizePlace(rawPlace: string): Promise<string> {
  const cleaned = rawPlace.trim();
  if (!cleaned) return "";

  const key = normalizeKey(cleaned);
  if (!key) return cleaned;

  const dictionaryMatch = PLACE_DICTIONARY[key];
  if (dictionaryMatch) return dictionaryMatch;

  const parts = cleaned
    .split(",")
    .map((part) => titleCase(part.trim()))
    .filter(Boolean);

  if (parts.length === 0) return cleaned;
  return parts.join(", ");
}

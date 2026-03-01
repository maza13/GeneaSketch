export type SearchMode = "free" | "children_of" | "parents_of" | "spouse_of";
export type SearchLifeStatusFilter = "alive" | "deceased" | "any";
export type SearchSexFilter = "M" | "F" | "U" | "any";
export type SearchSurnameFilter = "any" | "with" | "without";

export type SearchFilters = {
  sex: SearchSexFilter;
  lifeStatus: SearchLifeStatusFilter;
  surname: SearchSurnameFilter;
};

export type ParsedSearchQuery = {
  mode: SearchMode;
  target: string;
  filters: Partial<SearchFilters>;
};

export function normalizeSearchText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

export function parseSemanticQuery(raw: string): ParsedSearchQuery {
  let input = normalizeSearchText(raw);
  const filters: Partial<SearchFilters> = {};

  if (/\b(viv[oa]s?)\b/i.test(input) || /\bestado:\s*vivo\b/i.test(input)) {
    filters.lifeStatus = "alive";
  }
  if (/\b(fallecid[oa]s?|muert[oa]s?)\b/i.test(input) || /\bestado:\s*fallecido\b/i.test(input)) {
    filters.lifeStatus = "deceased";
  }

  if (/\b(hombre|varon|masculino)\b/i.test(input) || /\bsexo:\s*m\b/i.test(input)) {
    filters.sex = "M";
  } else if (/\b(mujer|femenino)\b/i.test(input) || /\bsexo:\s*f\b/i.test(input)) {
    filters.sex = "F";
  } else if (/\bsexo:\s*u\b/i.test(input)) {
    filters.sex = "U";
  }

  if (/\bsin apellido\b/i.test(input)) {
    filters.surname = "without";
  } else if (/\bcon apellido\b/i.test(input)) {
    filters.surname = "with";
  }

  input = input
    .replace(/\bestado:\s*(vivo|fallecido)\b/gi, "")
    .replace(/\bsexo:\s*[mfu]\b/gi, "")
    .replace(/\b(viv[oa]s?|fallecid[oa]s?|muert[oa]s?|hombre|varon|masculino|mujer|femenino)\b/gi, "")
    .replace(/\b(con apellido|sin apellido)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const patterns: Array<{ mode: SearchMode; regex: RegExp }> = [
    { mode: "children_of", regex: /^hijos?\s+de\s+(.+)$/i },
    { mode: "parents_of", regex: /^(?:padres?|progenitores)\s+de\s+(.+)$/i },
    { mode: "spouse_of", regex: /^(?:pareja|espos[oa])\s+de\s+(.+)$/i }
  ];
  for (const candidate of patterns) {
    const match = input.match(candidate.regex);
    if (match?.[1]) {
      return { mode: candidate.mode, target: match[1].trim(), filters };
    }
  }
  return { mode: "free", target: input, filters };
}

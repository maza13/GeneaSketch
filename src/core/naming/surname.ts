import type { Person } from "@/types/domain";

export type SurnameOrder = "paternal_first" | "maternal_first" | "single";

export type CanonicalSurnameFields = {
  surnamePaternal?: string;
  surnameMaternal?: string;
  surnameOrder?: SurnameOrder;
  surname?: string;
};

const CONNECTORS = new Set(["de", "del", "la", "las", "los", "y"]);
const ARTICLES = new Set(["la", "las", "los"]);

function normalizeChunk(value: string | undefined): string {
  return (value || "").trim().replace(/\s+/g, " ");
}

function key(value: string | undefined): string {
  return normalizeChunk(value).toLowerCase();
}

function tokenizeSurnameUnits(rawSurname: string | undefined): string[] {
  const text = normalizeChunk(rawSurname);
  if (!text) return [];
  const words = text.split(" ").filter(Boolean);
  const units: string[] = [];
  let i = 0;
  while (i < words.length) {
    const current = words[i].toLowerCase();
    const next = words[i + 1]?.toLowerCase();
    const next2 = words[i + 2];
    if (current === "del" && words[i + 1]) {
      units.push(`${words[i]} ${words[i + 1]}`);
      i += 2;
      continue;
    }
    if (current === "de" && next && ARTICLES.has(next) && next2) {
      units.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
      i += 3;
      continue;
    }
    if (current === "de" && words[i + 1]) {
      units.push(`${words[i]} ${words[i + 1]}`);
      i += 2;
      continue;
    }
    if (current === "y" && units.length > 0 && words[i + 1]) {
      units[units.length - 1] = `${units[units.length - 1]} ${words[i]} ${words[i + 1]}`;
      i += 2;
      continue;
    }
    if (CONNECTORS.has(current) && words[i + 1]) {
      units.push(`${words[i]} ${words[i + 1]}`);
      i += 2;
      continue;
    }
    units.push(words[i]);
    i += 1;
  }
  return units.map((unit) => normalizeChunk(unit)).filter(Boolean);
}

function splitUnits(units: string[]): { paternal?: string; maternal?: string } {
  if (units.length === 0) return {};
  if (units.length === 1) return { paternal: units[0] };
  if (units.length === 2) return { paternal: units[0], maternal: units[1] };
  return { paternal: units[0], maternal: units.slice(1).join(" ") };
}

function composeSurname(
  paternal: string | undefined,
  maternal: string | undefined,
  order: SurnameOrder | undefined
): string | undefined {
  const p = normalizeChunk(paternal);
  const m = normalizeChunk(maternal);
  if (!p && !m) return undefined;
  if (!p) return m;
  if (!m) return p;
  if (order === "maternal_first") return `${m} ${p}`;
  return `${p} ${m}`;
}

function scoreMatch(candidate: string | undefined, parent: string | undefined): number {
  const c = key(candidate);
  const p = key(parent);
  if (!c || !p) return 0;
  if (c === p) return 8;
  if (c.includes(p) || p.includes(c)) return 4;
  return 0;
}

export function inferCanonicalSurnameFields(args: {
  rawSurname?: string;
  fatherSurname?: string;
  motherSurname?: string;
  preferredOrder?: SurnameOrder;
}): CanonicalSurnameFields {
  const units = tokenizeSurnameUnits(args.rawSurname);
  const split = splitUnits(units);
  const paternal = normalizeChunk(split.paternal) || undefined;
  const maternal = normalizeChunk(split.maternal) || undefined;

  if (!paternal && !maternal) return {};

  if (!maternal) {
    const only = paternal;
    const fatherScore = scoreMatch(only, args.fatherSurname);
    const motherScore = scoreMatch(only, args.motherSurname);
    if (motherScore > fatherScore) {
      return {
        surnamePaternal: undefined,
        surnameMaternal: only,
        surnameOrder: "single",
        surname: only
      };
    }
    return {
      surnamePaternal: only,
      surnameMaternal: undefined,
      surnameOrder: "single",
      surname: only
    };
  }

  const directScore = scoreMatch(paternal, args.fatherSurname) + scoreMatch(maternal, args.motherSurname);
  const swappedScore = scoreMatch(maternal, args.fatherSurname) + scoreMatch(paternal, args.motherSurname);

  if (swappedScore > directScore) {
    return {
      surnamePaternal: maternal,
      surnameMaternal: paternal,
      surnameOrder: "maternal_first",
      surname: composeSurname(maternal, paternal, "maternal_first")
    };
  }

  const order = args.preferredOrder || "paternal_first";
  return {
    surnamePaternal: paternal,
    surnameMaternal: maternal,
    surnameOrder: order,
    surname: composeSurname(paternal, maternal, order)
  };
}

export function normalizePersonSurnames(person: Pick<Person, "surname" | "surnamePaternal" | "surnameMaternal" | "surnameOrder">): CanonicalSurnameFields {
  const p = normalizeChunk(person.surnamePaternal);
  const m = normalizeChunk(person.surnameMaternal);
  const order = person.surnameOrder || ((p && m) ? "paternal_first" : "single");

  if (p || m) {
    return {
      surnamePaternal: p || undefined,
      surnameMaternal: m || undefined,
      surnameOrder: order,
      surname: composeSurname(p || undefined, m || undefined, order)
    };
  }

  return inferCanonicalSurnameFields({
    rawSurname: person.surname,
    preferredOrder: "paternal_first"
  });
}


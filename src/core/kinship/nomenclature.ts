import atlasData from "@/data/kinship_atlas.json";
import type {
  KinshipAtlas,
  KinshipDisplayStyle,
  ResolvedKinshipRelationship
} from "@/types/kinship";

const atlas = atlasData as KinshipAtlas;

type Sex = "M" | "F" | "U";
type DirectLine = "ancestor" | "descendant";
type CollateralKind = "sibling" | "uncle" | "nephew" | "cousin" | "self";

type ResolvedTerm = {
  standard?: string;
  technical?: string;
  primary: string;
  secondary?: string;
  style: KinshipDisplayStyle;
};

const DIRECT_OVERRIDES: Record<DirectLine, Record<number, { M: string; F: string }>> = {
  ancestor: {
    1: { M: "Padre", F: "Madre" },
    2: { M: "Abuelo", F: "Abuela" },
    3: { M: "Bisabuelo", F: "Bisabuela" },
    4: { M: "Tatarabuelo", F: "Tatarabuela" },
    5: { M: "Trastatarabuelo", F: "Trastatarabuela" },
    6: { M: "Pentabuelo", F: "Pentabuela" },
    7: { M: "Hexabuelo", F: "Hexabuela" },
    8: { M: "Heptabuelo", F: "Heptabuela" },
    9: { M: "Octabuelo", F: "Octabuela" },
    10: { M: "Decabuelo", F: "Decabuela" }
  },
  descendant: {
    1: { M: "Hijo", F: "Hija" },
    2: { M: "Nieto", F: "Nieta" },
    3: { M: "Bisnieto", F: "Bisnieta" },
    4: { M: "Tataranieto", F: "Tataranieta" },
    5: { M: "Chozno", F: "Chozna" },
    6: { M: "Bichozno", F: "Bichozna" },
    7: { M: "Trichozno", F: "Trichozna" },
    8: { M: "Tetrachozno", F: "Tetrachozna" },
    9: { M: "Pentachozno", F: "Pentachozna" },
    10: { M: "Hexachozno", F: "Hexachozna" }
  }
};

const ORDINAL_WORDS: Record<number, string> = {
  1: "primero",
  2: "segundo",
  3: "tercero",
  4: "cuarto",
  5: "quinto",
  6: "sexto",
  7: "septimo",
  8: "octavo",
  9: "noveno",
  10: "decimo",
  11: "undecimo",
  12: "duodecimo"
};

function normalizeSex(sex: string | undefined): Sex {
  if (sex === "M" || sex === "F") return sex;
  return "U";
}

function technicalLabel(line: DirectLine, degree: number, sex: Sex): string {
  const isFemale = sex === "F";
  const ordinal = Math.max(1, degree - 1);
  if (line === "ancestor") {
    return `${isFemale ? "Abuela" : "Abuelo"} ${ordinal}°`;
  }
  return `${isFemale ? "Nieta" : "Nieto"} ${ordinal}°`;
}

function deriveDisplayTerm(standard: string | undefined, technical: string | undefined, style: KinshipDisplayStyle): ResolvedTerm {
  if (style === "technical") {
    const primary = technical ?? standard ?? "Pariente";
    return { standard, technical, primary, style };
  }
  if (style === "standard+technical") {
    const primary = standard ?? technical ?? "Pariente";
    return {
      standard,
      technical,
      primary,
      secondary: technical && technical !== standard ? technical : undefined,
      style
    };
  }
  return {
    standard,
    technical,
    primary: standard ?? technical ?? "Pariente",
    style
  };
}

function getStyleForDirect(degree: number, hasStandard: boolean): KinshipDisplayStyle {
  if (!hasStandard) return "technical";
  if (degree <= 2) return "standard";
  if (degree <= 10) return "standard+technical";
  return "technical";
}

function getOrdinalWord(n: number): string {
  return ORDINAL_WORDS[n] ?? `${n}°`;
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function genderOrdinal(word: string, sex: Sex): string {
  if (sex !== "F") return word;
  if (word.endsWith("o")) return `${word.slice(0, -1)}a`;
  return word;
}

function withHalfPrefix(text: string, sex: Sex, isHalf: boolean): string {
  if (!isHalf) return text;
  return `${sex === "F" ? "Media" : "Medio"} ${text}`;
}

function getAtlasDirectEntry(line: DirectLine, degree: number, sex: Sex): { standard?: string; technical?: string } {
  const branch = line === "ancestor" ? atlas.vocabulary.direct?.ancestors : atlas.vocabulary.direct?.descendants;
  const entry = branch?.[String(degree)];
  const key = sex === "F" ? "F" : "M";
  return {
    standard: entry?.[key]?.s,
    technical: entry?.[key]?.t
  };
}

function getCanonicalDirectEntry(line: DirectLine, degree: number, sex: Sex): { standard?: string; technical?: string } {
  const canonicalSex = sex === "F" ? "F" : "M";
  const override = DIRECT_OVERRIDES[line][degree];
  const atlasEntry = getAtlasDirectEntry(line, degree, sex);

  const standard = override?.[canonicalSex] ?? atlasEntry.standard;
  const technical = atlasEntry.technical ?? technicalLabel(line, degree, sex);

  return { standard, technical };
}

function makeUncleTerm(ancestorDegree: number, sex: Sex): { standard?: string; technical?: string } {
  if (ancestorDegree <= 0) return { standard: sex === "F" ? "Tia" : "Tio", technical: undefined };

  const mapEntry = atlas.vocabulary.collateral?.uncles?.map?.[String(ancestorDegree)];
  const key = sex === "F" ? "F" : "M";
  const atlasStandard = mapEntry?.[key]?.s;
  const atlasTechnical = mapEntry?.[key]?.t;
  if (atlasStandard) {
    return {
      standard: atlasStandard,
      technical: atlasTechnical
    };
  }

  if (ancestorDegree === 1) {
    return {
      standard: sex === "F" ? "Tia" : "Tio",
      technical: sex === "F" ? "Tia 1°" : "Tio 1°"
    };
  }

  if (ancestorDegree === 2) {
    return {
      standard: sex === "F" ? "Tia abuela" : "Tio abuelo",
      technical: sex === "F" ? "Tia Abuela 1°" : "Tio Abuelo 1°"
    };
  }

  if (ancestorDegree === 3) {
    return {
      standard: sex === "F" ? "Tia bisabuela" : "Tio bisabuelo",
      technical: sex === "F" ? "Tia Abuela 2°" : "Tio Abuelo 2°"
    };
  }

  const ancestor = resolveDirectTerm("ancestor", ancestorDegree, sex);
  return {
    standard: `${sex === "F" ? "Tia" : "Tio"} ${ancestor.primary.toLowerCase()}`,
    technical: `${sex === "F" ? "Tia" : "Tio"} (${ancestor.technical ?? ancestor.primary})`
  };
}

function makeNephewTerm(cousinDegree: number, sex: Sex): { standard?: string; technical?: string } {
  const mapEntry = atlas.vocabulary.collateral?.nephews?.map?.[String(cousinDegree)];
  const key = sex === "F" ? "F" : "M";
  const atlasStandard = mapEntry?.[key]?.s;
  const atlasTechnical = mapEntry?.[key]?.t;
  if (atlasStandard) {
    return {
      standard: atlasStandard,
      technical: atlasTechnical
    };
  }

  if (cousinDegree <= 1) {
    return {
      standard: sex === "F" ? "Sobrina" : "Sobrino",
      technical: sex === "F" ? "Sobrina 1°" : "Sobrino 1°"
    };
  }

  const ordinal = getOrdinalWord(cousinDegree);
  return {
    standard: `${sex === "F" ? "Sobrina" : "Sobrino"} ${genderOrdinal(ordinal, sex)}`,
    technical: `${sex === "F" ? "Sobrina" : "Sobrino"} ${cousinDegree}°`
  };
}

function makeCousinTerm(degree: number, sex: Sex): { standard?: string; technical?: string } {
  const mapEntry = atlas.vocabulary.collateral?.cousins?.map?.[String(degree)];
  const key = sex === "F" ? "F" : "M";
  const atlasStandard = mapEntry?.[key]?.s;
  const atlasTechnical = mapEntry?.[key]?.t;
  if (atlasStandard) {
    return {
      standard: atlasStandard,
      technical: atlasTechnical
    };
  }

  if (degree <= 1) {
    return {
      standard: sex === "F" ? "Prima hermana" : "Primo hermano",
      technical: sex === "F" ? "Prima 1°" : "Primo 1°"
    };
  }

  const ordinal = getOrdinalWord(degree);
  return {
    standard: `${sex === "F" ? "Prima" : "Primo"} ${genderOrdinal(ordinal, sex)}`,
    technical: `${sex === "F" ? "Prima" : "Primo"} ${degree}°`
  };
}

export function resolveDirectTerm(line: DirectLine, degree: number, sexInput: string): ResolvedTerm {
  const sex = normalizeSex(sexInput);
  const normalizedSex = sex === "F" ? "F" : "M";
  const { standard, technical } = getCanonicalDirectEntry(line, degree, normalizedSex);
  const style = getStyleForDirect(degree, Boolean(standard));
  return deriveDisplayTerm(standard, technical, style);
}

export function resolveCollateralTerm(kind: Exclude<CollateralKind, "self">, degree: number, sexInput: string, isHalf = false): ResolvedTerm {
  const sex = normalizeSex(sexInput);
  const normalizedSex = sex === "F" ? "F" : "M";

  if (kind === "sibling") {
    const base = atlas.vocabulary.special?.sibling?.[normalizedSex] ?? (normalizedSex === "F" ? "Hermana" : "Hermano");
    return {
      standard: base,
      primary: withHalfPrefix(base, normalizedSex, isHalf),
      style: "standard"
    };
  }

  if (kind === "uncle") {
    const term = makeUncleTerm(degree, normalizedSex);
    const styled = deriveDisplayTerm(term.standard, term.technical, degree <= 1 ? "standard" : degree <= 10 ? "standard+technical" : "technical");
    return {
      ...styled,
      primary: withHalfPrefix(styled.primary, normalizedSex, isHalf)
    };
  }

  if (kind === "nephew") {
    const term = makeNephewTerm(degree, normalizedSex);
    const styled = deriveDisplayTerm(term.standard, term.technical, degree <= 1 ? "standard" : degree <= 10 ? "standard+technical" : "technical");
    return {
      ...styled,
      primary: withHalfPrefix(styled.primary, normalizedSex, isHalf)
    };
  }

  const term = makeCousinTerm(degree, normalizedSex);
  const styled = deriveDisplayTerm(term.standard, term.technical, degree <= 2 ? "standard" : degree <= 10 ? "standard+technical" : "technical");
  return {
    ...styled,
    primary: withHalfPrefix(styled.primary, normalizedSex, isHalf)
  };
}

export function resolveKinshipLabelFromDistances(args: {
  d1: number;
  d2: number;
  sex1?: string;
  sex2?: string;
  isHalf?: boolean;
}): ResolvedKinshipRelationship {
  const { d1, d2, sex2, isHalf = false } = args;
  const relSex = normalizeSex(sex2);

  if (d1 === 0 && d2 === 0) {
    return {
      primary: "Misma persona",
      canonicalKey: "self",
      d1,
      d2,
      isHalf: false,
      style: "standard"
    };
  }

  if (d1 === 0) {
    const term = resolveDirectTerm("descendant", d2, relSex);
    return {
      primary: term.primary,
      secondary: term.secondary,
      canonicalKey: `descendant-${d2}`,
      d1,
      d2,
      degree: d2,
      isHalf,
      style: term.style
    };
  }

  if (d2 === 0) {
    const term = resolveDirectTerm("ancestor", d1, relSex);
    return {
      primary: term.primary,
      secondary: term.secondary,
      canonicalKey: `ancestor-${d1}`,
      d1,
      d2,
      degree: d1,
      isHalf,
      style: term.style
    };
  }

  if (d1 === 1 && d2 === 1) {
    const term = resolveCollateralTerm("sibling", 1, relSex, isHalf);
    return {
      primary: term.primary,
      secondary: term.secondary,
      canonicalKey: isHalf ? "half-sibling" : "sibling",
      d1,
      d2,
      degree: 1,
      isHalf,
      style: term.style
    };
  }

  if (d2 === 1) {
    const uncleDegree = d1 - 1;
    const term = resolveCollateralTerm("uncle", uncleDegree, relSex, isHalf);
    return {
      primary: term.primary,
      secondary: term.secondary,
      canonicalKey: `uncle-${uncleDegree}`,
      d1,
      d2,
      degree: uncleDegree,
      isHalf,
      style: term.style
    };
  }

  if (d1 === 1) {
    const nephewDegree = d2 - 1;
    const term = resolveCollateralTerm("nephew", nephewDegree, relSex, isHalf);
    return {
      primary: term.primary,
      secondary: term.secondary,
      canonicalKey: `nephew-${nephewDegree}`,
      d1,
      d2,
      degree: nephewDegree,
      isHalf,
      style: term.style
    };
  }

  const cousinDegree = Math.min(d1, d2) - 1;
  const removal = Math.abs(d1 - d2);
  const cousinTerm = resolveCollateralTerm("cousin", cousinDegree, relSex, isHalf);

  // Rama lejana: "tio segundo", "tio abuelo segundo", etc.
  if (removal > 0 && Math.min(d1, d2) >= 2) {
    if (d1 > d2) {
      const base = resolveCollateralTerm("uncle", d2 - 1, relSex, isHalf);
      const rank = capitalize(genderOrdinal(getOrdinalWord(removal + 1), relSex));
      return {
        primary: `${base.primary} ${rank}`,
        secondary: base.secondary,
        canonicalKey: `uncle-branch-${d2 - 1}-${removal + 1}`,
        d1,
        d2,
        degree: d2 - 1,
        removal,
        isHalf,
        style: base.style
      };
    }

    const base = resolveCollateralTerm("nephew", d1 - 1, relSex, isHalf);
    const rank = capitalize(genderOrdinal(getOrdinalWord(removal + 1), relSex));
    return {
      primary: `${base.primary} ${rank}`,
      secondary: base.secondary,
      canonicalKey: `nephew-branch-${d1 - 1}-${removal + 1}`,
      d1,
      d2,
      degree: d1 - 1,
      removal,
      isHalf,
      style: base.style
    };
  }

  let primary = cousinTerm.primary;
  if (removal > 0) {
    primary = `${primary} (${removal}x removido)`;
  }

  return {
    primary,
    secondary: cousinTerm.secondary,
    canonicalKey: `cousin-${cousinDegree}${removal > 0 ? `-r${removal}` : ""}`,
    d1,
    d2,
    degree: cousinDegree,
    removal,
    isHalf,
    style: cousinTerm.style
  };
}

export function resolveUiDisplayLabel(rel: Pick<ResolvedKinshipRelationship, "primary" | "secondary">): string {
  return rel.secondary ? `${rel.primary} (${rel.secondary})` : rel.primary;
}

function pluralizeFirstWordLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return trimmed;

  const parts = trimmed.split(/\s+/);
  const first = parts[0];
  const rest = parts.slice(1).join(" ");

  const irregular: Record<string, string> = {
    Padre: "Padres",
    Madre: "Madres",
    Hijo: "Hijos",
    Hija: "Hijas"
  };

  let pluralFirst = irregular[first];
  if (!pluralFirst) {
    if (first.endsWith("o") || first.endsWith("a")) {
      pluralFirst = `${first}s`;
    } else {
      pluralFirst = `${first}es`;
    }
  }

  return rest ? `${pluralFirst} ${rest}` : pluralFirst;
}

export function resolveStatisticsBucketLabel(
  d1: number,
  d2: number
): { key: string; label: string; order: number; category: "ancestors" | "descendants" | "collateral" } | null {
  if (d1 === 0 && d2 === 0) return null;

  if (d1 === 0) {
    const term = resolveDirectTerm("descendant", d2, "M");
    const primaryPlural = pluralizeFirstWordLabel(term.primary);
    const label = term.secondary ? `${primaryPlural} (${term.secondary})` : primaryPlural;
    return { key: `descendants-${d2}`, label, order: 200 + d2, category: "descendants" };
  }

  if (d2 === 0) {
    const term = resolveDirectTerm("ancestor", d1, "M");
    const primaryPlural = pluralizeFirstWordLabel(term.primary);
    const label = term.secondary ? `${primaryPlural} (${term.secondary})` : primaryPlural;
    return { key: `ancestors-${d1}`, label, order: 100 + d1, category: "ancestors" };
  }

  if (d1 === 1 && d2 === 1) return { key: "siblings", label: "Hermanos", order: 20, category: "collateral" };
  if (d2 === 1) return { key: `uncles-${d1 - 1}`, label: `Tios (${d1 - 1}°)`, order: 300 + d1, category: "collateral" };
  if (d1 === 1) return { key: `nephews-${d2 - 1}`, label: `Sobrinos (${d2 - 1}°)`, order: 500 + d2, category: "collateral" };

  const degree = Math.min(d1, d2) - 1;
  const removal = Math.abs(d1 - d2);

  if (removal === 0) {
    return { key: `cousins-${degree}`, label: `Primos ${degree}°`, order: 400 + degree, category: "collateral" };
  }

  return {
    key: `cousins-${degree}-r${removal}`,
    label: `Primos ${degree}° (${removal}x removido)`,
    order: 450 + degree * 10 + removal,
    category: "collateral"
  };
}

export function validateKinshipAtlas(source: KinshipAtlas = atlas): string[] {
  const errors: string[] = [];

  const direct = source.vocabulary.direct;
  if (!direct?.ancestors?.["1"]?.M?.s || !direct?.ancestors?.["1"]?.F?.s) {
    errors.push("Atlas missing ancestors grade 1 (M/F).");
  }

  if (!direct?.descendants?.["1"]?.M?.s || !direct?.descendants?.["1"]?.F?.s) {
    errors.push("Atlas missing descendants grade 1 (M/F).");
  }

  if (!source.vocabulary.special?.sibling?.M || !source.vocabulary.special?.sibling?.F) {
    errors.push("Atlas missing sibling labels (M/F).");
  }

  return errors;
}

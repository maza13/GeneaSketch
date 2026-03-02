import { parseDateToYearSpan } from "@/core/inference/dateSpanParser";
import type { BirthEstimatorConfig } from "@/core/inference/birthEstimatorConfig";
import type { EvidenceInterval, FactEvent } from "@/core/inference/types";
import type { GeneaDocument } from "@/types/domain";

type TreeStats = {
  typicalMarriageAge: number;
  typicalFirstChildAge: number;
};

function qFactor(quality: FactEvent["quality"], config: BirthEstimatorConfig): number {
  if (!quality) return 1;
  return config.qualityMultiplier[quality] ?? 1;
}

function layerWeight(layer: 1 | 2 | 3 | undefined, config: BirthEstimatorConfig): number {
  return config.layerWeights[layer || 1] ?? 1;
}

function scaledWeight(base: number, layer: 1 | 2 | 3 | undefined, config: BirthEstimatorConfig): number {
  return Math.max(1, Math.round(base * layerWeight(layer, config)));
}

function impactFor(layer: 1 | 2 | 3 | undefined, hard: boolean): "high" | "medium" | "low" {
  if (hard && (!layer || layer === 1)) return "high";
  if (!layer || layer === 1) return "medium";
  return layer === 2 ? "medium" : "low";
}

function addHard(
  list: EvidenceInterval[],
  id: string,
  type: string,
  span: [number, number],
  weight: number,
  qualityFactor: number,
  reference: string,
  label: string,
  notes: string[] = [],
  meta?: { layer?: 1 | 2 | 3; relationClass?: string; ruleId?: string }
) {
  list.push({
    id,
    kind: "hard",
    type,
    hardSpan: span,
    weight,
    qualityFactor,
    reference,
    label,
    notes,
    layer: meta?.layer,
    relationClass: meta?.relationClass,
    impact: impactFor(meta?.layer, true),
    ruleId: meta?.ruleId
  });
}

function addSoft(
  list: EvidenceInterval[],
  id: string,
  type: string,
  span: [number, number],
  weight: number,
  qualityFactor: number,
  reference: string,
  label: string,
  notes: string[] = [],
  meta?: { layer?: 1 | 2 | 3; relationClass?: string; ruleId?: string }
) {
  list.push({
    id,
    kind: "soft",
    type,
    bestSpan: span,
    weight,
    qualityFactor,
    reference,
    label,
    notes,
    layer: meta?.layer,
    relationClass: meta?.relationClass,
    impact: impactFor(meta?.layer, false),
    ruleId: meta?.ruleId
  });
}

function addInfo(
  list: EvidenceInterval[],
  id: string,
  reference: string,
  label: string,
  notes: string[] = [],
  meta?: { layer?: 1 | 2 | 3; relationClass?: string; ruleId?: string }
) {
  list.push({
    id,
    kind: "info",
    type: "info",
    weight: 0,
    qualityFactor: 1,
    reference,
    label,
    notes,
    layer: meta?.layer,
    relationClass: meta?.relationClass,
    impact: "low",
    ruleId: meta?.ruleId
  });
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

function spanToText(minYear?: number, maxYear?: number): string {
  if (minYear !== undefined && maxYear !== undefined) {
    if (minYear === maxYear) return `${minYear}`;
    return `${minYear}-${maxYear}`;
  }
  if (minYear !== undefined) return `${minYear}`;
  if (maxYear !== undefined) return `${maxYear}`;
  return "sin año";
}

export function computeTreeDemographicStats(doc: GeneaDocument, focusPersonId?: string): TreeStats {
  const marriageAges: number[] = [];
  const firstChildAges: number[] = [];

  for (const person of Object.values(doc.persons)) {
    if (focusPersonId && person.id === focusPersonId) continue;
    const birth = person.events.find((event) => event.type === "BIRT")?.date;
    const birthYear = parseDateToYearSpan(birth).minYear;
    if (birthYear === undefined) continue;

    for (const famId of person.fams || []) {
      const fam = doc.families[famId];
      if (!fam) continue;
      const marrYear = parseDateToYearSpan(fam.events.find((e) => e.type === "MARR")?.date).minYear;
      if (marrYear !== undefined) {
        const age = marrYear - birthYear;
        if (age >= 12 && age <= 90) marriageAges.push(age);
      }

      let firstChildYear = Number.POSITIVE_INFINITY;
      for (const childId of fam.childrenIds || []) {
        const child = doc.persons[childId];
        if (!child) continue;
        const childYear = parseDateToYearSpan(child.events.find((e) => e.type === "BIRT")?.date).minYear;
        if (childYear !== undefined) firstChildYear = Math.min(firstChildYear, childYear);
      }
      if (Number.isFinite(firstChildYear)) {
        const age = firstChildYear - birthYear;
        if (age >= 12 && age <= 90) firstChildAges.push(age);
      }
    }
  }

  return {
    typicalMarriageAge: marriageAges.length >= 6 ? median(marriageAges) : 26,
    typicalFirstChildAge: firstChildAges.length >= 6 ? median(firstChildAges) : 28
  };
}

function isNonBiologicalParentFact(fact: FactEvent): boolean {
  return fact.relationToFocus === "parent" && (fact.flags || []).some((flag) => flag === "non_biological_link");
}

function genericGenerationSpan(fact: FactEvent, span: { minYear?: number; maxYear?: number }, config: BirthEstimatorConfig): [number, number] | null {
  const delta = fact.generationDelta;
  if (!delta || delta === 0) return null;
  const sourceMin = span.minYear ?? span.maxYear;
  const sourceMax = span.maxYear ?? span.minYear;
  if (sourceMin === undefined || sourceMax === undefined) return null;

  const absDelta = Math.abs(delta);
  const minGap = config.parentAge.unknown.min * absDelta;
  const maxGap = config.parentAge.unknown.max * absDelta;
  if (delta > 0) {
    // Ancestor known -> focus should be younger.
    return [sourceMin + minGap, sourceMax + maxGap];
  }
  // Descendant known -> focus should be older.
  return [sourceMin - maxGap, sourceMax - minGap];
}

export function buildBirthEvidence(
  facts: FactEvent[],
  treeStats: TreeStats,
  config: BirthEstimatorConfig
): EvidenceInterval[] {
  const evidence: EvidenceInterval[] = [];

  for (const fact of facts) {
    const span = parseDateToYearSpan(fact.dateRaw);
    const qualityFactor = qFactor(fact.quality, config);
    const warnings = [...span.warnings];
    const layer = fact.layer || 1;

    if (span.precision === "unknown") {
      // Sin fecha util, no aporta restriccion cronologica accionable.
      continue;
    }

    if (fact.relationToFocus === "parent" && isNonBiologicalParentFact(fact)) {
      addSoft(
        evidence,
        `${fact.reference}:non_bio_soft`,
        "parent_non_biological",
        [
          (span.minYear ?? config.domainMinYear) + 16,
          (span.maxYear ?? config.domainMaxYear) + 45
        ],
        scaledWeight(Math.round(config.weights.parentBirth * 0.25), layer, config),
        qualityFactor,
        fact.reference,
        "Referencia parental no biologica usada solo como apoyo contextual.",
        warnings,
        { layer, relationClass: "parent", ruleId: "non_bio_parent" }
      );
      continue;
    }

    if (fact.relationToFocus === "parent" && (fact.eventTag === "BIRT" || fact.eventTag === "CHR" || fact.eventTag === "BAPM")) {
      const minBase = span.minYear ?? config.domainMinYear;
      const maxBase = span.maxYear ?? config.domainMaxYear;
      const fatherRef = fact.reference.toLowerCase().includes("father");
      const motherRef = fact.reference.toLowerCase().includes("mother");
      const band = motherRef
        ? config.parentAge.mother
        : fatherRef
          ? config.parentAge.father
          : config.parentAge.unknown;

      addHard(
        evidence,
        `${fact.reference}:parent_birth`,
        "parent_birth",
        [minBase + band.min, maxBase + band.max],
        scaledWeight(config.weights.parentBirth, layer, config),
        qualityFactor,
        fact.reference,
        `Nacimiento parental (${spanToText(span.minYear, span.maxYear)}) acota nacimiento del foco a ${minBase + band.min}-${maxBase + band.max}.`,
        warnings,
        { layer, relationClass: "parent", ruleId: "parent_birth" }
      );
      continue;
    }

    if (fact.relationToFocus === "parent" && fact.eventTag === "DEAT") {
      const maxParent = span.maxYear ?? span.minYear;
      if (maxParent !== undefined) {
        const fatherRef = fact.reference.toLowerCase().includes("father");
        const maxBirth = maxParent + (fatherRef ? config.posthumousYearsFather : config.posthumousYearsMother);
        addHard(
          evidence,
          `${fact.reference}:parent_death`,
          "parent_death",
          [config.domainMinYear, maxBirth],
          scaledWeight(config.weights.parentDeath, layer, config),
          qualityFactor,
          fact.reference,
          `Defuncion parental en ${spanToText(span.minYear, span.maxYear)} fija nacimiento del foco a mas tardar en ${maxBirth}.`,
          warnings,
          { layer, relationClass: "parent", ruleId: "parent_death" }
        );
      }
      continue;
    }

    if (fact.relationToFocus === "child" && (fact.eventTag === "BIRT" || fact.eventTag === "CHR" || fact.eventTag === "BAPM")) {
      const minChild = span.minYear ?? span.maxYear;
      const maxChild = span.maxYear ?? span.minYear;
      if (minChild !== undefined && maxChild !== undefined) {
        addHard(
          evidence,
          `${fact.reference}:child_birth`,
          "child_birth",
          [minChild - config.parentAge.unknown.max, maxChild - config.parentAge.unknown.min],
          scaledWeight(config.weights.childBirth, layer, config),
          qualityFactor,
          fact.reference,
          `Hijo/a con nacimiento ${spanToText(span.minYear, span.maxYear)} acota nacimiento del foco a ${minChild - config.parentAge.unknown.max}-${maxChild - config.parentAge.unknown.min}.`,
          warnings,
          { layer, relationClass: "child", ruleId: "child_birth" }
        );

        addSoft(
          evidence,
          `${fact.reference}:child_soft`,
          "child_birth_soft",
          [
            minChild - treeStats.typicalFirstChildAge - config.softWindowYears.child,
            maxChild - treeStats.typicalFirstChildAge + config.softWindowYears.child
          ],
          scaledWeight(Math.round(config.weights.childBirth * 0.65), layer, config),
          qualityFactor,
          fact.reference,
          `Patron demografico (primer hijo tipico) sugiere foco cerca de ${Math.round((minChild - treeStats.typicalFirstChildAge + maxChild - treeStats.typicalFirstChildAge) / 2)}.`,
          warnings,
          { layer, relationClass: "child", ruleId: "child_birth_soft" }
        );
      }
      continue;
    }

    if (fact.relationToFocus === "focus" && fact.eventTag === "DEAT") {
      const deathYear = span.maxYear ?? span.minYear;
      if (deathYear !== undefined) {
        addHard(
          evidence,
          `${fact.reference}:focus_death`,
          "focus_death",
          [deathYear - config.maxHumanLifespanYears, deathYear],
          scaledWeight(config.weights.selfDeath, layer, config),
          qualityFactor,
          fact.reference,
          `Defuncion del foco en ${deathYear} limita nacimiento a ${deathYear - config.maxHumanLifespanYears}-${deathYear}.`,
          warnings,
          { layer, relationClass: "focus", ruleId: "focus_death" }
        );
      }
      continue;
    }

    if ((fact.relationToFocus === "focus" || fact.relationToFocus === "spouse") && fact.eventTag === "MARR") {
      const marrYear = span.minYear ?? span.maxYear;
      if (marrYear !== undefined) {
        addSoft(
          evidence,
          `${fact.reference}:marriage_soft`,
          "marriage",
          [
            marrYear - treeStats.typicalMarriageAge - config.softWindowYears.marriage,
            marrYear - treeStats.typicalMarriageAge + config.softWindowYears.marriage
          ],
          scaledWeight(config.weights.marriage, layer, config),
          qualityFactor,
          fact.reference,
          `Matrimonio en ${marrYear} sugiere nacimiento del foco aproximadamente en ${marrYear - treeStats.typicalMarriageAge}.`,
          warnings,
          { layer, relationClass: fact.relationToFocus, ruleId: "marriage" }
        );
      }
      continue;
    }

    if (fact.relationToFocus === "sibling" && (fact.eventTag === "BIRT" || fact.eventTag === "CHR" || fact.eventTag === "BAPM")) {
      const minSibling = span.minYear ?? span.maxYear;
      const maxSibling = span.maxYear ?? span.minYear;
      if (minSibling !== undefined && maxSibling !== undefined) {
        addSoft(
          evidence,
          `${fact.reference}:sibling_cluster`,
          "sibling_cluster",
          [minSibling - config.softWindowYears.sibling, maxSibling + config.softWindowYears.sibling],
          scaledWeight(config.weights.siblingCluster, layer, config),
          qualityFactor,
          fact.reference,
          `Nacimiento de hermano en ${spanToText(span.minYear, span.maxYear)} aporta cohorte temporal del foco.`,
          warnings,
          { layer, relationClass: "sibling", ruleId: "sibling_cluster" }
        );
      }
      continue;
    }

    if (fact.relationToFocus === "spouse" && (fact.eventTag === "BIRT" || fact.eventTag === "DEAT")) {
      const spouseYear = span.minYear ?? span.maxYear;
      if (spouseYear !== undefined) {
        addSoft(
          evidence,
          `${fact.reference}:spouse_cohort`,
          "spouse_cohort",
          [spouseYear - config.softWindowYears.spouse, spouseYear + config.softWindowYears.spouse],
          scaledWeight(config.weights.spouseCohort, layer, config),
          qualityFactor,
          fact.reference,
          `Fecha de pareja (${spanToText(span.minYear, span.maxYear)}) aporta cohorte temporal del foco.`,
          warnings,
          { layer, relationClass: "spouse", ruleId: "spouse_cohort" }
        );
      }
      continue;
    }

    if (fact.eventTag === "CENS") {
      const censusYear = span.minYear ?? span.maxYear;
      if (censusYear !== undefined) {
        addSoft(
          evidence,
          `${fact.reference}:census_soft`,
          "census",
          [censusYear - 60, censusYear - 1],
          scaledWeight(config.weights.census, layer, config),
          qualityFactor,
          fact.reference,
          "Censo usado como referencia blanda de cohorte.",
          warnings,
          { layer, relationClass: fact.relationToFocus, ruleId: "census" }
        );
      }
      continue;
    }

    if (fact.eventTag === "NOTE") {
      addInfo(
        evidence,
        `${fact.reference}:note_info`,
        fact.reference,
        "Nota familiar incluida como contexto complementario.",
        warnings,
        { layer, relationClass: fact.relationToFocus, ruleId: "note_context" }
      );
      continue;
    }

    // Generic propagation for multi-layer kinship (grandparents, grandchildren, uncles, nephews).
    if ((fact.eventTag === "BIRT" || fact.eventTag === "DEAT") && fact.relationToFocus === "other") {
      const projected = genericGenerationSpan(fact, span, config);
      if (projected) {
        addSoft(
          evidence,
          `${fact.reference}:multi_layer_projection`,
          "multi_layer_projection",
          projected,
          scaledWeight(Math.round(config.weights.siblingCluster * 0.8), layer, config),
          qualityFactor,
          fact.reference,
          "Parentesco en capas 2-3 aporta una ventana temporal plausible.",
          warnings,
          { layer, relationClass: "other", ruleId: "multi_layer_projection" }
        );
        continue;
      }
    }

    // Eventos sin regla cronologica util se omiten para evitar ruido en evidencias.
  }

  return evidence;
}

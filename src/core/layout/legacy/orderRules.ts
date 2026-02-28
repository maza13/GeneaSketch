import type { GeneaDocument } from "@/types/domain";
import type { FamilyOrderKey } from "@/core/layout/types";
import type { LayoutModel } from "@/core/layout/legacy/model";

const MONTH_INDEX = new Map<string, number>([
  ["JAN", 1],
  ["FEB", 2],
  ["MAR", 3],
  ["APR", 4],
  ["MAY", 5],
  ["JUN", 6],
  ["JUL", 7],
  ["AUG", 8],
  ["SEP", 9],
  ["OCT", 10],
  ["NOV", 11],
  ["DEC", 12]
]);

function parseDateOrder(raw: string | undefined): number {
  if (!raw) return Number.MAX_SAFE_INTEGER;
  const normalized = raw.trim().toUpperCase();
  const match = normalized.match(/(\d{1,2})?\s*([A-Z]{3})?\s*(\d{4})/);
  if (!match) {
    const yearOnly = normalized.match(/(\d{4})/);
    if (!yearOnly) return Number.MAX_SAFE_INTEGER;
    return Number(yearOnly[1]) * 10000 + 101;
  }

  const day = match[1] ? Number(match[1]) : 1;
  const month = match[2] ? MONTH_INDEX.get(match[2]) ?? 1 : 1;
  const year = Number(match[3]);

  if (!Number.isFinite(year)) return Number.MAX_SAFE_INTEGER;
  return year * 10000 + month * 100 + day;
}

function getMarriageOrder(document: GeneaDocument | null, familyId: string): number {
  const family = document?.families[familyId];
  if (!family) return Number.MAX_SAFE_INTEGER;
  const marriage = family.events.find((event) => event.type === "MARR");
  return parseDateOrder(marriage?.date);
}

function getBirthOrder(document: GeneaDocument | null, personNodeId: string, canonicalId: string): number {
  const person = document?.persons[canonicalId] ?? document?.persons[personNodeId];
  if (!person) return Number.MAX_SAFE_INTEGER;
  const birth = person.events.find((event) => event.type === "BIRT");
  return parseDateOrder(birth?.date);
}

function nodeCanonicalId(model: LayoutModel, nodeId: string): string {
  return model.nodeById.get(nodeId)?.canonicalId ?? nodeId;
}

function aliasRank(model: LayoutModel, nodeId: string): number {
  return model.nodeById.get(nodeId)?.isAlias ? 1 : 0;
}

export function comparePersonNodesByBirth(model: LayoutModel, leftNodeId: string, rightNodeId: string): number {
  const leftCanonical = nodeCanonicalId(model, leftNodeId);
  const rightCanonical = nodeCanonicalId(model, rightNodeId);

  const leftBirth = getBirthOrder(model.document, leftNodeId, leftCanonical);
  const rightBirth = getBirthOrder(model.document, rightNodeId, rightCanonical);
  if (leftBirth !== rightBirth) return leftBirth - rightBirth;

  const leftAliasRank = aliasRank(model, leftNodeId);
  const rightAliasRank = aliasRank(model, rightNodeId);
  if (leftAliasRank !== rightAliasRank) return leftAliasRank - rightAliasRank;

  if (leftCanonical !== rightCanonical) return leftCanonical.localeCompare(rightCanonical);
  return leftNodeId.localeCompare(rightNodeId);
}

export function sortChildrenForFamily(model: LayoutModel, familyId: string): string[] {
  const children = model.childrenByFamily.get(familyId) ?? [];
  return [...children].sort((left, right) => comparePersonNodesByBirth(model, left, right));
}

export function sortChildrenForJunction(model: LayoutModel, junctionId: string): string[] {
  const children = model.childrenByJunction.get(junctionId) ?? [];
  return [...children].sort((left, right) => comparePersonNodesByBirth(model, left, right));
}

export function sortSpousesForFamily(
  model: LayoutModel,
  familyId: string,
  anchorPersonId: string
): string[] {
  const spouses = (model.spousesByFamily.get(familyId) ?? []).filter((personId) => personId !== anchorPersonId);

  const roleScore = (personId: string): number => {
    const role = model.spouseRoleByFamilyPerson.get(`${familyId}|${personId}`);
    if (role === "husband") return 0;
    if (role === "wife") return 1;
    return 2;
  };

  return spouses.sort((left, right) => {
    const leftRole = roleScore(left);
    const rightRole = roleScore(right);
    if (leftRole !== rightRole) return leftRole - rightRole;

    const leftAliasRank = aliasRank(model, left);
    const rightAliasRank = aliasRank(model, right);
    if (leftAliasRank !== rightAliasRank) return leftAliasRank - rightAliasRank;

    const leftCanonical = nodeCanonicalId(model, left);
    const rightCanonical = nodeCanonicalId(model, right);
    if (leftCanonical !== rightCanonical) return leftCanonical.localeCompare(rightCanonical);
    return left.localeCompare(right);
  });
}

export function resolvePrimaryFamilyForPerson(
  model: LayoutModel,
  personId: string,
  focusFamilyId?: string | null
): string | undefined {
  const families = model.familiesByPerson.get(personId) ?? [];
  if (families.length === 0) return undefined;

  if (focusFamilyId && families.includes(focusFamilyId)) return focusFamilyId;

  const canonicalPersonId = nodeCanonicalId(model, personId);
  const docPrimary = model.document?.persons[canonicalPersonId]?.fams.find((familyId) => families.includes(familyId));
  if (docPrimary) return docPrimary;

  return [...families].sort((left, right) => {
    const leftMarriage = getMarriageOrder(model.document, left);
    const rightMarriage = getMarriageOrder(model.document, right);
    if (leftMarriage !== rightMarriage) return leftMarriage - rightMarriage;
    return left.localeCompare(right);
  })[0];
}

export function getFamilyOrderKey(
  model: LayoutModel,
  familyId: string,
  primaryFamilyId: string | undefined
): FamilyOrderKey {
  const hasChildren = (model.childrenByFamily.get(familyId)?.length ?? 0) > 0;
  return {
    isPrimaryBranch: familyId === primaryFamilyId ? 0 : 1,
    // Secondary unions without children stay closer to the nucleus.
    childrenRank: familyId === primaryFamilyId ? 0 : hasChildren ? 1 : 0,
    marriageOrder: getMarriageOrder(model.document, familyId),
    familyId
  };
}

export function orderFamiliesForPerson(
  model: LayoutModel,
  personId: string,
  focusFamilyId?: string | null,
  primaryOverride?: string
): string[] {
  const families = model.familiesByPerson.get(personId) ?? [];
  if (families.length <= 1) return [...families];

  const primary = primaryOverride ?? resolvePrimaryFamilyForPerson(model, personId, focusFamilyId);

  return [...families].sort((left, right) => {
    const leftKey = getFamilyOrderKey(model, left, primary);
    const rightKey = getFamilyOrderKey(model, right, primary);

    if (leftKey.isPrimaryBranch !== rightKey.isPrimaryBranch) {
      return leftKey.isPrimaryBranch - rightKey.isPrimaryBranch;
    }
    if (leftKey.childrenRank !== rightKey.childrenRank) {
      return leftKey.childrenRank - rightKey.childrenRank;
    }
    if (leftKey.marriageOrder !== rightKey.marriageOrder) {
      return leftKey.marriageOrder - rightKey.marriageOrder;
    }
    return leftKey.familyId.localeCompare(rightKey.familyId);
  });
}

export function chooseOriginFamilyForPerson(
  model: LayoutModel,
  personId: string,
  preferredFamilyId?: string
): string | undefined {
  const families = model.parentFamiliesByPerson.get(personId) ?? [];
  if (families.length === 0) return undefined;
  if (preferredFamilyId && families.includes(preferredFamilyId)) return preferredFamilyId;

  return [...families].sort((left, right) => {
    const leftMarriage = getMarriageOrder(model.document, left);
    const rightMarriage = getMarriageOrder(model.document, right);
    if (leftMarriage !== rightMarriage) return leftMarriage - rightMarriage;
    return left.localeCompare(right);
  })[0];
}

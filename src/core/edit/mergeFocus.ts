export type MergeFocusPayload = {
  primaryIds: string[];
  secondaryIds: string[];
  secondaryLevel1Ids?: string[];
  secondaryLevel2Ids?: string[];
};

function normalizeIdList(ids: string[] | undefined): string[] {
  if (!Array.isArray(ids)) return [];
  const unique = new Set(
    ids
      .map((id) => String(id).trim())
      .filter(Boolean)
  );
  return Array.from(unique).sort((a, b) => a.localeCompare(b));
}

export function normalizeMergeFocus(
  focus: MergeFocusPayload | null | undefined
): MergeFocusPayload | null {
  if (!focus) return null;
  const primaryIds = normalizeIdList(focus.primaryIds);
  const hasExplicitLevels = Array.isArray(focus.secondaryLevel1Ids) || Array.isArray(focus.secondaryLevel2Ids);
  const secondaryLevel1Ids = normalizeIdList(focus.secondaryLevel1Ids ?? focus.secondaryIds).filter((id) => !primaryIds.includes(id));
  const secondaryLevel2Ids = normalizeIdList(focus.secondaryLevel2Ids ?? []).filter(
    (id) => !primaryIds.includes(id) && !secondaryLevel1Ids.includes(id)
  );
  const secondaryIds = Array.from(new Set([...secondaryLevel1Ids, ...secondaryLevel2Ids]));
  if (primaryIds.length === 0 && secondaryIds.length === 0) return null;
  if (!hasExplicitLevels) {
    return { primaryIds, secondaryIds };
  }
  return { primaryIds, secondaryIds, secondaryLevel1Ids, secondaryLevel2Ids };
}

export function mergeFocusKey(focus: MergeFocusPayload | null | undefined): string | null {
  const normalized = normalizeMergeFocus(focus);
  if (!normalized) return null;
  const s1 = normalized.secondaryLevel1Ids || normalized.secondaryIds;
  const s2 = normalized.secondaryLevel2Ids || [];
  return `p:${normalized.primaryIds.join(",")}|s1:${s1.join(",")}|s2:${s2.join(",")}`;
}

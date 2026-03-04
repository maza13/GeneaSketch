import {
  addRelation,
  createPerson,
  linkExistingRelation,
  unlinkChild,
  unlinkParent,
  unlinkSpouse,
  updatePerson,
  updateFamily
} from "@/core/edit/commands";
import { resolvePersonId } from "@/core/ai/matching";
import type { AiAppliedChange, AiAuditTrailEntry, AiReviewDraft, AiReviewItem } from "@/types/ai";
import type { GraphDocument } from "@/types/domain";

export type ApplyResult = {
  nextDoc: GraphDocument;
  appliedItemIds: string[];
  warnings: string[];
  appliedChanges: AiAppliedChange[];
};

type TempResolutionState = {
  byPreferredId: Map<string, string>;
  byQuery: Map<string, string>;
};

function normalizeNameKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function personKeyFromInput(input: { name: string; surname?: string }): string {
  return normalizeNameKey(`${input.name} ${input.surname || ""}`.trim());
}

function personKeyFromQuery(query?: string): string {
  return normalizeNameKey(query || "");
}

function ensureMetadataCollections(doc: GraphDocument): void {
  doc.metadata.aiAuditTrail = doc.metadata.aiAuditTrail || [];
  doc.metadata.recycleBin = doc.metadata.recycleBin || [];
}

function softDeletePerson(doc: GraphDocument, personId: string, runId: string, reason?: string): GraphDocument {
  const person = doc.persons[personId];
  if (!person) return doc;
  ensureMetadataCollections(doc);
  doc.metadata.recycleBin!.push({
    id: `rb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    deletedAt: new Date().toISOString(),
    runId,
    entityType: "person",
    entityId: personId,
    reason,
    snapshot: structuredClone(person)
  });

  delete doc.persons[personId];
  for (const family of Object.values(doc.families)) {
    if (family.husbandId === personId) family.husbandId = undefined;
    if (family.wifeId === personId) family.wifeId = undefined;
    family.childrenIds = family.childrenIds.filter((id) => id !== personId);
  }
  for (const nextPerson of Object.values(doc.persons)) {
    nextPerson.famc = nextPerson.famc.filter((familyId) => Boolean(doc.families[familyId]));
    nextPerson.fams = nextPerson.fams.filter((familyId) => Boolean(doc.families[familyId]));
  }
  return doc;
}

function softDeleteFamily(doc: GraphDocument, familyId: string, runId: string, reason?: string): GraphDocument {
  const family = doc.families[familyId];
  if (!family) return doc;
  ensureMetadataCollections(doc);
  doc.metadata.recycleBin!.push({
    id: `rb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    deletedAt: new Date().toISOString(),
    runId,
    entityType: "family",
    entityId: familyId,
    reason,
    snapshot: structuredClone(family)
  });

  delete doc.families[familyId];
  for (const person of Object.values(doc.persons)) {
    person.famc = person.famc.filter((id) => id !== familyId);
    person.fams = person.fams.filter((id) => id !== familyId);
  }
  return doc;
}

function unlinkSibling(doc: GraphDocument, personId: string, relatedPersonId: string): GraphDocument {
  const next = structuredClone(doc);
  for (const family of Object.values(next.families)) {
    if (family.childrenIds.includes(personId) && family.childrenIds.includes(relatedPersonId)) {
      family.childrenIds = family.childrenIds.filter((id) => id !== relatedPersonId);
      const related = next.persons[relatedPersonId];
      if (related) related.famc = related.famc.filter((familyId) => familyId !== family.id);
    }
  }
  return next;
}

function appendInformantAttribution(doc: GraphDocument, informantName: string, runId: string, personIds: Set<string>): void {
  for (const personId of personIds) {
    const person = doc.persons[personId];
    if (!person) continue;
    const sourceId = `AI:${runId}:${personId}`;
    if (!person.sourceRefs.some((ref) => ref.id === sourceId)) {
      person.sourceRefs.push({
        id: sourceId,
        title: `Informante: ${informantName}`
      });
    }
  }
}

function resolveTargetId(
  doc: GraphDocument,
  explicitId: string | undefined,
  query: string | undefined,
  candidateId: string | undefined,
  tempResolution: TempResolutionState,
  anchorId?: string
): string | null {
  if (candidateId && doc.persons[candidateId]) return candidateId;
  if (explicitId && doc.persons[explicitId]) return explicitId;
  if (explicitId && tempResolution.byPreferredId.has(explicitId)) {
    const mapped = tempResolution.byPreferredId.get(explicitId)!;
    if (doc.persons[mapped]) return mapped;
  }

  const queryKey = personKeyFromQuery(query);
  if (queryKey && tempResolution.byQuery.has(queryKey)) {
    const mapped = tempResolution.byQuery.get(queryKey)!;
    if (doc.persons[mapped]) return mapped;
  }

  // Neighborhood search: if we have an anchor, check their families first
  if (anchorId && doc.persons[anchorId] && queryKey) {
    const anchor = doc.persons[anchorId];
    const relatives = new Set<string>();
    for (const famId of [...anchor.fams, ...anchor.famc]) {
      const fam = doc.families[famId];
      if (!fam) continue;
      if (fam.husbandId) relatives.add(fam.husbandId);
      if (fam.wifeId) relatives.add(fam.wifeId);
      for (const cid of fam.childrenIds) relatives.add(cid);
    }
    for (const rid of relatives) {
      if (rid === anchorId) continue;
      const rPerson = doc.persons[rid];
      if (!rPerson) continue;
      const rKey = personKeyFromInput(rPerson);
      if (rKey === queryKey || rKey.includes(queryKey) || queryKey.includes(rKey)) {
        return rid;
      }
    }
  }

  const resolved = resolvePersonId(doc, explicitId, query);
  if (resolved.id) return resolved.id;
  if (queryKey) {
    const fuzzy = Array.from(tempResolution.byQuery.entries()).find(([key]) => key.includes(queryKey) || queryKey.includes(key));
    if (fuzzy?.[1] && doc.persons[fuzzy[1]]) return fuzzy[1];
  }
  return null;
}

function firstSurname(person: { surname?: string } | undefined): string | undefined {
  if (!person?.surname) return undefined;
  const token = person.surname.trim().split(/\s+/)[0];
  return token || undefined;
}

function inferMexicanChildSurname(
  doc: GraphDocument,
  anchorId: string,
  targetFamilyId?: string,
  relatedId?: string
): string | undefined {
  const anchor = doc.persons[anchorId];
  if (!anchor) return undefined;
  let related = relatedId ? doc.persons[relatedId] : undefined;
  if (!related && targetFamilyId && doc.families[targetFamilyId]) {
    const family = doc.families[targetFamilyId];
    const spouseId = family.husbandId === anchorId ? family.wifeId : family.wifeId === anchorId ? family.husbandId : undefined;
    related = spouseId ? doc.persons[spouseId] : undefined;
  }
  const anchorFirst = firstSurname(anchor);
  const relatedFirst = firstSurname(related);
  if (anchor.sex === "M") {
    return [anchorFirst, relatedFirst].filter(Boolean).join(" ").trim() || undefined;
  }
  if (anchor.sex === "F") {
    return [relatedFirst, anchorFirst].filter(Boolean).join(" ").trim() || undefined;
  }
  return [anchorFirst, relatedFirst].filter(Boolean).join(" ").trim() || undefined;
}

function pushSkipped(
  appliedChanges: AiAppliedChange[],
  item: AiReviewItem,
  operation: AiAppliedChange["operation"],
  entityType: AiAppliedChange["entityType"],
  entityId: string,
  warning: string,
  status: "skipped" | "blocked" = "skipped"
): void {
  appliedChanges.push({
    operation,
    entityType,
    entityId,
    reason: `${item.id}: ${item.description}`,
    risk: item.risk,
    status,
    warnings: [warning]
  });
}

function applyEntityItem(
  doc: GraphDocument,
  item: AiReviewItem,
  runId: string,
  touchedPeople: Set<string>,
  warnings: string[],
  appliedChanges: AiAppliedChange[],
  tempResolution: TempResolutionState
): GraphDocument {
  const action = item.action;

  if (action.kind === "create_person") {
    const created = createPerson(doc, action.person);
    touchedPeople.add(created.personId);
    const key = personKeyFromInput(action.person);
    if (key) tempResolution.byQuery.set(key, created.personId);
    if (action.preferredId) tempResolution.byPreferredId.set(action.preferredId, created.personId);
    appliedChanges.push({
      operation: "create_person",
      entityType: "person",
      entityId: created.personId,
      after: created.next.persons[created.personId],
      reason: `${item.id}: ${item.description}`,
      risk: item.risk,
      status: "applied"
    });
    return created.next;
  }

  if (action.kind === "update_person") {
    const targetId = resolveTargetId(doc, action.personId, action.matchQuery, item.selectedCandidateId, tempResolution, undefined);
    if (!targetId) {
      const warning = `${item.id}: update_person sin persona resuelta.`;
      warnings.push(warning);
      pushSkipped(appliedChanges, item, "update_person", "person", action.personId || action.matchQuery || "unknown", warning);
      return doc;
    }

    // Respect user decisions from the conflict table
    const finalPatch = { ...action.patch };
    if (item.attributeConflicts) {
      for (const conflict of item.attributeConflicts) {
        if (!conflict.accepted) {
          // If the user rejected this change, remove it from the patch
          // We map 'Nombre' -> 'name', 'Apellidos' -> 'surname', etc.
          const attr = conflict.attribute.toLowerCase();
          if (attr.includes("nombre")) delete finalPatch.name;
          if (attr.includes("apellido")) delete finalPatch.surname;
          if (attr.includes("nacimiento") && attr.includes("fecha")) delete finalPatch.birthDate;
          if (attr.includes("nacimiento") && attr.includes("lugar")) delete finalPatch.birthPlace;
          if (attr.includes("defuncion") && attr.includes("fecha")) delete finalPatch.deathDate;
          if (attr.includes("defuncion") && attr.includes("lugar")) delete finalPatch.deathPlace;
          if (attr.includes("residencia")) delete finalPatch.residence;
        } else if (conflict.isNormalized) {
          // If accepted and normalized, use the suggested value
          const attr = conflict.attribute.toLowerCase();
          if (attr.includes("lugar")) {
            if (attr.includes("nacimiento")) finalPatch.birthPlace = conflict.suggestedValue;
            if (attr.includes("defuncion")) finalPatch.deathPlace = conflict.suggestedValue;
          }
          if (attr.includes("residencia")) finalPatch.residence = conflict.suggestedValue;
        }
      }
    }

    const before = structuredClone(doc.persons[targetId]);
    touchedPeople.add(targetId);
    const next = updatePerson(doc, targetId, finalPatch);
    appliedChanges.push({
      operation: "update_person",
      entityType: "person",
      entityId: targetId,
      before,
      after: next.persons[targetId],
      reason: `${item.id}: ${item.description}`,
      risk: item.risk,
      status: "applied"
    });
    return next;
  }

  if (action.kind === "delete_person") {
    const targetId = resolveTargetId(doc, action.personId, action.matchQuery, item.selectedCandidateId, tempResolution, undefined);
    if (!targetId) {
      const warning = `${item.id}: delete_person sin persona resuelta.`;
      warnings.push(warning);
      pushSkipped(appliedChanges, item, "delete_person", "person", action.personId || action.matchQuery || "unknown", warning);
      return doc;
    }
    const before = structuredClone(doc.persons[targetId]);
    const next = softDeletePerson(structuredClone(doc), targetId, runId, action.reason);
    appliedChanges.push({
      operation: "delete_person",
      entityType: "person",
      entityId: targetId,
      before,
      reason: `${item.id}: ${item.description}`,
      risk: item.risk,
      status: "applied"
    });
    return next;
  }

  if (action.kind === "delete_family") {
    if (!action.familyId || !doc.families[action.familyId]) {
      const warning = `${item.id}: delete_family sin familyId valido.`;
      warnings.push(warning);
      pushSkipped(appliedChanges, item, "delete_family", "family", action.familyId || action.familyQuery || "unknown", warning);
      return doc;
    }
    const before = structuredClone(doc.families[action.familyId]);
    const next = softDeleteFamily(structuredClone(doc), action.familyId, runId, action.reason);
    appliedChanges.push({
      operation: "delete_family",
      entityType: "family",
      entityId: action.familyId,
      before,
      reason: `${item.id}: ${item.description}`,
      risk: item.risk,
      status: "applied"
    });
    return next;
  }

  if (action.kind === "update_family") {
    const familyId =
      action.familyId ||
      (action.familyQuery
        ? Object.values(doc.families).find((family) => family.id === action.familyQuery)?.id
        : undefined);
    if (!familyId || !doc.families[familyId]) {
      const warning = `${item.id}: update_family sin familia resuelta.`;
      warnings.push(warning);
      pushSkipped(appliedChanges, item, "update_family", "family", action.familyId || action.familyQuery || "unknown", warning);
      return doc;
    }

    const eventPatch = action.patch.events?.[0];
    const patch = {
      marriageDate: eventPatch?.type === "MARR" ? eventPatch.date : undefined,
      marriagePlace: eventPatch?.type === "MARR" ? eventPatch.place : undefined,
      divorceDate: eventPatch?.type === "DIV" ? eventPatch.date : undefined
    };
    const before = structuredClone(doc.families[familyId]);
    const next = updateFamily(doc, familyId, patch);
    appliedChanges.push({
      operation: "update_family",
      entityType: "family",
      entityId: familyId,
      before,
      after: next.families[familyId],
      reason: `${item.id}: ${item.description}`,
      risk: item.risk,
      status: "applied"
    });
    return next;
  }

  return doc;
}

function applyRelationItem(
  doc: GraphDocument,
  item: AiReviewItem,
  touchedPeople: Set<string>,
  warnings: string[],
  appliedChanges: AiAppliedChange[],
  tempResolution: TempResolutionState
): GraphDocument {
  const action = item.action;

  if (action.kind === "create_relation") {
    const anchorId = resolveTargetId(
      doc,
      item.selection?.anchorPersonId || action.anchorPersonId,
      action.anchorQuery,
      item.selectedCandidateId,
      tempResolution,
      undefined
    );
    if (!anchorId) {
      const warning = `${item.id}: create_relation sin ancla resuelta.`;
      warnings.push(warning);
      pushSkipped(appliedChanges, item, "create_relation", "relation", `${action.anchorPersonId || action.anchorQuery || "unknown"}`, warning);
      return doc;
    }

    if (action.relationType === "child") {
      const familyChoices = doc.persons[anchorId]?.fams.filter((familyId) => Boolean(doc.families[familyId])) || [];
      const targetFamilyId = item.selection?.targetFamilyId || action.targetFamilyId;
      if (familyChoices.length > 1 && !targetFamilyId) {
        const warning = `${item.id}: create_relation(child) requiere familia destino explicita por multiples familias.`;
        warnings.push(warning);
        pushSkipped(appliedChanges, item, "create_relation", "relation", `${anchorId}->child`, warning, "blocked");
        return doc;
      }
    }

    const relatedId = resolveTargetId(
      doc,
      item.selection?.relatedPersonId || action.relatedPersonId,
      action.relatedQuery,
      undefined,
      tempResolution,
      anchorId
    );

    if (relatedId) {
      const before = {
        anchor: structuredClone(doc.persons[anchorId]),
        related: structuredClone(doc.persons[relatedId])
      };
      touchedPeople.add(anchorId);
      touchedPeople.add(relatedId);

      let next = doc;
      // If we found an existing person but the AI provided data for them, update them
      if (action.relatedPerson) {
        next = updatePerson(next, relatedId, action.relatedPerson);
      }

      next = linkExistingRelation(
        next,
        anchorId,
        relatedId,
        action.relationType,
        item.selection?.targetFamilyId || action.targetFamilyId
      );

      appliedChanges.push({
        operation: "create_relation",
        entityType: "relation",
        entityId: `${anchorId}->${relatedId}:${action.relationType}`,
        before,
        after: {
          anchor: next.persons[anchorId],
          related: next.persons[relatedId]
        },
        reason: `${item.id}: ${item.description}${action.relatedPerson ? " (datos actualizados)" : ""}`,
        risk: item.risk,
        status: "applied"
      });
      return next;
    }

    const shouldCreateNew = item.selection?.createNewRelatedPerson ?? action.createRelatedIfMissing;
    if (!shouldCreateNew || !action.relatedPerson) {
      const warning = `${item.id}: create_relation requiere persona relacionada no resuelta.`;
      warnings.push(warning);
      pushSkipped(appliedChanges, item, "create_relation", "relation", `${anchorId}->${action.relatedQuery || "unknown"}`, warning);
      return doc;
    }

    const beforeAnchor = structuredClone(doc.persons[anchorId]);
    const createdPersonInput = { ...action.relatedPerson };
    if (action.relationType === "child" && !createdPersonInput.surname) {
      createdPersonInput.surname = inferMexicanChildSurname(
        doc,
        anchorId,
        item.selection?.targetFamilyId || action.targetFamilyId,
        item.selection?.relatedPersonId
      );
    }
    const created = addRelation(
      doc,
      anchorId,
      action.relationType,
      createdPersonInput,
      item.selection?.targetFamilyId || action.targetFamilyId
    );
    const createdKey = personKeyFromInput(createdPersonInput);
    if (createdKey) tempResolution.byQuery.set(createdKey, created.personId);
    touchedPeople.add(anchorId);
    touchedPeople.add(created.personId);
    appliedChanges.push({
      operation: "create_person",
      entityType: "person",
      entityId: created.personId,
      after: created.next.persons[created.personId],
      reason: `${item.id}: persona creada por create_relation`,
      risk: item.risk,
      status: "applied"
    });
    appliedChanges.push({
      operation: "create_relation",
      entityType: "relation",
      entityId: `${anchorId}->${created.personId}:${action.relationType}`,
      before: { anchor: beforeAnchor },
      after: {
        anchor: created.next.persons[anchorId],
        related: created.next.persons[created.personId]
      },
      reason: `${item.id}: ${item.description}`,
      risk: item.risk,
      status: "applied"
    });
    return created.next;
  }

  if (action.kind === "delete_relation") {
    const personId = resolveTargetId(doc, action.personId, action.personQuery, item.selectedCandidateId, tempResolution, undefined);
    const relatedId = resolveTargetId(doc, action.relatedPersonId, action.relatedPersonQuery, undefined, tempResolution, personId || undefined);
    if (!personId || !relatedId) {
      const warning = `${item.id}: delete_relation sin extremos resueltos.`;
      warnings.push(warning);
      pushSkipped(
        appliedChanges,
        item,
        "delete_relation",
        "relation",
        `${action.personId || action.personQuery || "unknown"}->${action.relatedPersonId || action.relatedPersonQuery || "unknown"}`,
        warning
      );
      return doc;
    }
    const before = {
      left: structuredClone(doc.persons[personId]),
      right: structuredClone(doc.persons[relatedId])
    };
    touchedPeople.add(personId);
    touchedPeople.add(relatedId);
    let next = doc;
    if (action.relationType === "parent") next = unlinkParent(doc, personId, relatedId);
    else if (action.relationType === "child") next = unlinkChild(doc, personId, relatedId);
    else if (action.relationType === "spouse") next = unlinkSpouse(doc, personId, relatedId);
    else next = unlinkSibling(doc, personId, relatedId);
    appliedChanges.push({
      operation: "delete_relation",
      entityType: "relation",
      entityId: `${personId}->${relatedId}:${action.relationType}`,
      before,
      after: {
        left: next.persons[personId],
        right: next.persons[relatedId]
      },
      reason: `${item.id}: ${item.description}`,
      risk: item.risk,
      status: "applied"
    });
    return next;
  }

  return doc;
}

export function applyApprovedAiReview(baseDoc: GraphDocument, review: AiReviewDraft): ApplyResult {
  let nextDoc = structuredClone(baseDoc);
  const touchedPeople = new Set<string>();
  const warnings: string[] = [];
  const appliedItemIds: string[] = [];
  const appliedChanges: AiAppliedChange[] = [];
  const approvedItems = review.items.filter((item) => item.status === "approved");
  const tempResolution: TempResolutionState = {
    byPreferredId: new Map<string, string>(),
    byQuery: new Map<string, string>()
  };

  const entityItems = approvedItems.filter((item) => {
    const kind = item.action.kind;
    return (
      kind === "create_person" ||
      kind === "update_person" ||
      kind === "delete_person" ||
      kind === "delete_family" ||
      kind === "update_family"
    );
  });

  const relationItems = approvedItems.filter((item) => {
    const kind = item.action.kind;
    return kind === "create_relation" || kind === "delete_relation";
  });

  for (const item of entityItems) {
    if (item.blocked) {
      const reason = item.blockReason || `${item.id}: operacion bloqueada por seguridad.`;
      warnings.push(reason);
      pushSkipped(
        appliedChanges,
        item,
        item.kind as AiAppliedChange["operation"],
        item.kind.includes("family") ? "family" : item.kind.includes("relation") ? "relation" : "person",
        item.id,
        reason,
        "blocked"
      );
      continue;
    }
    if (item.requiresDeleteConfirmation && item.risk === "high" && item.status !== "approved") {
      warnings.push(`${item.id}: delete de alto riesgo sin confirmar.`);
      continue;
    }
    nextDoc = applyEntityItem(nextDoc, item, review.runId, touchedPeople, warnings, appliedChanges, tempResolution);
    appliedItemIds.push(item.id);
  }

  for (const item of relationItems) {
    const relationAction = item.action.kind === "create_relation" ? item.action : null;
    const relationNeedsFamily = relationAction?.relationType === "child";
    const hasSelectionResolution =
      item.kind !== "create_relation" ||
      Boolean(
        item.selection?.anchorPersonId &&
        (item.selection?.relatedPersonId || item.selection?.createNewRelatedPerson || relationAction?.createRelatedIfMissing) &&
        (!relationNeedsFamily || item.selection?.targetFamilyId || relationAction?.targetFamilyId)
      );

    if (item.blocked && !hasSelectionResolution) {
      const reason = item.blockReason || `${item.id}: operacion bloqueada por seguridad.`;
      warnings.push(reason);
      pushSkipped(
        appliedChanges,
        item,
        item.kind as AiAppliedChange["operation"],
        "relation",
        item.id,
        reason,
        "blocked"
      );
      continue;
    }

    nextDoc = applyRelationItem(nextDoc, item, touchedPeople, warnings, appliedChanges, tempResolution);
    appliedItemIds.push(item.id);
  }

  ensureMetadataCollections(nextDoc);
  appendInformantAttribution(nextDoc, review.informantName, review.runId, touchedPeople);

  const auditEntry: AiAuditTrailEntry = {
    runId: review.runId,
    createdAt: new Date().toISOString(),
    contextKind: review.context.kind,
    anchorPersonId: review.context.kind === "local" ? review.context.anchorPersonId : undefined,
    informantName: review.informantName,
    executionMode: review.executionMode,
    providerTrace: review.providerTrace,
    appliedItems: review.items.map((item) => ({
      itemId: item.id,
      kind: item.kind,
      status: item.status,
      risk: item.risk
    })),
    warnings: [...review.warnings, ...warnings]
  };
  nextDoc.metadata.aiAuditTrail!.push(auditEntry);

  return {
    nextDoc,
    appliedItemIds,
    warnings,
    appliedChanges
  };
}



import { resolvePersonId } from "@/core/ai/matching";
import type { AiResolvedAction, AiReviewDraft, AiReviewItem, AiReviewItemStatus, AiReviewRisk } from "@/types/ai";
import type { GraphDocument } from "@/types/domain";
import type { SafetyAnnotation } from "@/core/ai/safety";

function riskForAction(action: AiResolvedAction, issues: string[]): AiReviewRisk {
  if (action.kind === "delete_person" || action.kind === "delete_family") return "high";
  if (issues.length === 0) return "low";
  if (issues.length >= 2) return "high";
  return "medium";
}

function describeAction(doc: GraphDocument, action: AiResolvedAction): { title: string; description: string } {
  const getPersonName = (id?: string) => {
    if (!id) return null;
    const p = doc.persons[id];
    if (!p) return id;
    return `${p.name || ""} ${p.surname || ""}`.trim();
  };

  if (action.kind === "create_person") {
    const name = `${action.person.name}${action.person.surname ? ` ${action.person.surname}` : ""}`.trim();
    return { title: "Crear persona", description: `Crear ${name}.` };
  }
  if (action.kind === "update_person") {
    const target = getPersonName(action.personId) || action.matchQuery || "(sin resolver)";
    return {
      title: "Actualizar persona",
      description: `Actualizar datos de ${target}.`
    };
  }
  if (action.kind === "delete_person") {
    const target = getPersonName(action.personId) || action.matchQuery || "(sin resolver)";
    return {
      title: "Borrar persona (soft delete)",
      description: `Eliminar ${target} con snapshot de seguridad.`
    };
  }
  if (action.kind === "create_relation") {
    const left = getPersonName(action.anchorPersonId) || action.anchorQuery || "?";
    const right = getPersonName(action.relatedPersonId) || action.relatedQuery || "?";
    const relationMap: Record<string, string> = { child: "hijo/a", spouse: "pareja", parent: "padre/madre" };
    const relName = relationMap[action.relationType] || action.relationType;
    return {
      title: "Crear relaciÃ³n",
      description: `Vincular a ${right} como ${relName} de ${left}.`
    };
  }
  if (action.kind === "delete_relation") {
    const left = getPersonName(action.personId) || action.personQuery || "?";
    const right = getPersonName(action.relatedPersonId) || action.relatedPersonQuery || "?";
    return {
      title: "Quitar relaciÃ³n",
      description: `Remover vÃ­nculo de ${action.relationType} entre ${left} y ${right}.`
    };
  }
  if (action.kind === "update_family") {
    return {
      title: "Actualizar familia",
      description: `Actualizar hechos familiares en ${action.familyId || action.familyQuery || "(familia objetivo)"}.`
    };
  }
  return {
    title: "Borrar familia (soft delete)",
    description: `Eliminar familia ${action.familyId || action.familyQuery || "(sin resolver)"} con snapshot.`
  };
}

function collectActionIssues(doc: GraphDocument, action: AiResolvedAction): string[] {
  const issues: string[] = [];
  if (action.kind === "update_person") {
    const resolved = resolvePersonId(doc, action.personId, action.matchQuery);
    if (!resolved.id) issues.push("No se pudo resolver persona objetivo.");
    if (resolved.candidates.length > 1 && !resolved.id) issues.push("Hay homÃ³nimos potenciales.");
  }
  if (action.kind === "delete_person") {
    const resolved = resolvePersonId(doc, action.personId, action.matchQuery);
    if (!resolved.id) issues.push("No se pudo resolver persona para delete.");
  }
  if (action.kind === "create_relation") {
    const anchor = resolvePersonId(doc, action.anchorPersonId, action.anchorQuery);
    if (!anchor.id) issues.push("No se pudo resolver persona ancla.");
    const related = resolvePersonId(doc, action.relatedPersonId, action.relatedQuery);
    if (!related.id && !action.createRelatedIfMissing) issues.push("No se pudo resolver persona relacionada.");
  }
  if (action.kind === "delete_relation") {
    const left = resolvePersonId(doc, action.personId, action.personQuery);
    const right = resolvePersonId(doc, action.relatedPersonId, action.relatedPersonQuery);
    if (!left.id || !right.id) issues.push("No se pudieron resolver ambos extremos de la relaciÃ³n.");
  }
  if (action.kind === "delete_family") {
    if (!action.familyId && !action.familyQuery) issues.push("No hay identificador de familia para delete.");
  }
  if (action.kind === "update_family") {
    if (!action.familyId && !action.familyQuery) issues.push("No hay identificador de familia para update.");
    if (!action.patch.events || action.patch.events.length === 0) issues.push("No hay eventos de familia para actualizar.");
  }
  return issues;
}

function actionCandidates(doc: GraphDocument, action: AiResolvedAction) {
  if (action.kind === "update_person" || action.kind === "delete_person") {
    return resolvePersonId(doc, action.personId, action.matchQuery).candidates;
  }
  if (action.kind === "create_relation") {
    return [
      ...resolvePersonId(doc, action.anchorPersonId, action.anchorQuery).candidates,
      ...resolvePersonId(doc, action.relatedPersonId, action.relatedQuery).candidates
    ]
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }
  if (action.kind === "delete_relation") {
    return [
      ...resolvePersonId(doc, action.personId, action.personQuery).candidates,
      ...resolvePersonId(doc, action.relatedPersonId, action.relatedPersonQuery).candidates
    ]
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }
  return [];
}

export function buildReviewItems(
  doc: GraphDocument,
  actions: AiResolvedAction[],
  _contextKind: "local" | "global",
  annotations?: Record<number, SafetyAnnotation>
): AiReviewItem[] {
  return actions.map((action, index) => {
    const safety = annotations?.[index];
    const issues = [...collectActionIssues(doc, action), ...(safety?.issues || [])];
    const candidates = actionCandidates(doc, action).map((candidate) => ({
      ...candidate,
      label: candidate.label
    }));
    const risk = safety?.blocked ? "high" : riskForAction(action, issues);
    const summary = describeAction(doc, action);
    const status: AiReviewItemStatus = "proposed";
    const actionNeedsDecision =
      (action.kind === "update_person" && !action.personId && Boolean(action.matchQuery) && candidates.length > 1) ||
      (action.kind === "delete_person" && !action.personId && Boolean(action.matchQuery) && candidates.length > 1) ||
      (action.kind === "create_relation" && candidates.length > 1);

    return {
      id: `ai-item-${index + 1}`,
      kind: action.kind,
      title: summary.title,
      description: summary.description,
      risk,
      status,
      issues,
      action,
      candidates,
      candidateGroups: safety?.candidateGroups,
      selection: safety?.selection,
      selectedCandidateId: candidates[0]?.id,
      requiresDeleteConfirmation: action.kind === "delete_person" || action.kind === "delete_family",
      blocked: safety?.blocked,
      blockReason: safety?.blockReason,
      requiresDecision: Boolean(safety?.blocked) || actionNeedsDecision
    };
  });
}

export function createEmptyReview(runId: string, _contextKind: "local" | "global"): AiReviewDraft {
  return {
    runId,
    context: _contextKind === "local" ? { kind: "local", anchorPersonId: "" } : { kind: "global" },
    executionMode: "hybrid",
    informantName: "No identificado",
    extraction: null,
    resolution: null,
    items: [],
    warnings: [],
    deterministicProfile: "det_v1",
    deterministicWarnings: [],
    providerTrace: [],
    createdAt: new Date().toISOString()
  };
}



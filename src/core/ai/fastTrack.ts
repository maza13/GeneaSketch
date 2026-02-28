import { AiInputContext, AiReviewDraft, AiReviewItem } from "@/types/ai";
import { GeneaDocument } from "@/types/domain";

/**
 * Layer 0: Fast Track
 * Detects simple patterns in user text for direct Anchor updates.
 * Returns an AiReviewDraft if a pattern is matched, skipping AI stages.
 */
export function tryFastTrack(
    text: string,
    context: AiInputContext,
    doc: GeneaDocument
): AiReviewDraft | null {
    if (context.kind !== "local") return null;

    const anchorId = context.anchorPersonId;
    const anchor = doc.persons[anchorId];
    if (!anchor) return null;

    const normalized = text.toLowerCase().trim();

    // Pattern A: Birth Place/Date
    const birthPlaceMatch = normalized.match(/(?:naci[oó]|nace)\s+en\s+([^,.]+)/i);
    if (birthPlaceMatch) {
        const place = birthPlaceMatch[1].trim();
        return createQuickDraft(context, `Actualizar lugar de nacimiento a: ${place}`, {
            kind: "update_person",
            personId: anchorId,
            patch: { birthPlace: place }
        });
    }
    const birthDateMatch = normalized.match(/(?:naci[oó]|nace)\s+el\s+(\d{1,2}\s+de\s+\w+\s+de\s+\d{4}|\d{4})/i);
    if (birthDateMatch) {
        const date = birthDateMatch[1].trim();
        return createQuickDraft(context, `Actualizar fecha de nacimiento a: ${date}`, {
            kind: "update_person",
            personId: anchorId,
            patch: { birthDate: date }
        });
    }

    // Pattern B: Death Date/Place
    const deathDateMatch = normalized.match(/(?:muri[oó]|falleci[oó])\s+el\s+(\d{1,2}\s+de\s+\w+\s+de\s+\d{4}|\d{4})/i);
    if (deathDateMatch) {
        const date = deathDateMatch[1].trim();
        return createQuickDraft(context, `Actualizar fecha de defunción a: ${date}`, {
            kind: "update_person",
            personId: anchorId,
            patch: { deathDate: date, lifeStatus: "deceased" }
        });
    }
    const deathPlaceMatch = normalized.match(/(?:muri[oó]|falleci[oó])\s+en\s+([^,.]+)/i);
    if (deathPlaceMatch) {
        const place = deathPlaceMatch[1].trim();
        return createQuickDraft(context, `Actualizar lugar de defunción a: ${place}`, {
            kind: "update_person",
            personId: anchorId,
            patch: { deathPlace: place, lifeStatus: "deceased" }
        });
    }

    // Pattern D: Name change
    const nameMatch = normalized.match(/(?:se\s+llama|nombre)\s+is?\s*([^,.]+)/i) || normalized.match(/^llama?lo\s+([^,.]+)/i);
    if (nameMatch) {
        const newName = nameMatch[1].trim();
        return createQuickDraft(context, `Actualizar nombre a: ${newName}`, {
            kind: "update_person",
            personId: anchorId,
            patch: { name: newName }
        });
    }

    // Pattern C: "es hombre" or "es mujer"
    if (normalized.includes("es hombre") || normalized.includes("es varón")) {
        return createQuickDraft(context, "Cambiar sexo a Masculino", {
            kind: "update_person",
            personId: anchorId,
            patch: { sex: "M" }
        });
    }
    if (normalized.includes("es mujer")) {
        return createQuickDraft(context, "Cambiar sexo a Femenino", {
            kind: "update_person",
            personId: anchorId,
            patch: { sex: "F" }
        });
    }

    return null;
}

function createQuickDraft(
    context: AiInputContext,
    title: string,
    action: any
): AiReviewDraft {
    const item: AiReviewItem = {
        id: `ft_${Date.now()}`,
        kind: action.kind,
        title,
        description: `Detección automática (Layer 0): ${title}`,
        risk: "low",
        status: "proposed",
        issues: [],
        action,
        candidates: [],
        requiresDeleteConfirmation: false
    };

    return {
        runId: `ftrun_${Date.now()}`,
        context,
        executionMode: "hybrid", // Default
        informantName: "FastTrack Filter",
        extraction: null,
        resolution: null,
        items: [item],
        warnings: [],
        deterministicProfile: "det_v1",
        deterministicWarnings: [],
        providerTrace: [],
        createdAt: new Date().toISOString(),
        userMessage: `He detectado un cambio simple: ${title}.`
    };
}

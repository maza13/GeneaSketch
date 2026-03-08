export type GskImportMode = "strict-lossless" | "strict-lossless-audit" | "compat";

export type ErrorSeverity = "error" | "warning" | "info";

export type ErrorCatalogScope =
    | "gsk-import"
    | "gsk-validation"
    | "gedcom-parser"
    | "gedcom-serializer";

export type ErrorCatalogContext =
    | "package-import"
    | "graph-validation"
    | "journal-replay"
    | "compat-repair"
    | "gedcom-import"
    | "gedcom-export";

interface ErrorCatalogEntryBase {
    code: string;
    scope: ErrorCatalogScope;
    context: ErrorCatalogContext;
    condition: string;
    action: string;
    remediation: string;
}

export interface GskModeErrorCatalogEntry extends ErrorCatalogEntryBase {
    severityByMode: Record<GskImportMode, ErrorSeverity>;
}

export interface ContextualErrorCatalogEntry extends ErrorCatalogEntryBase {
    severity: ErrorSeverity;
}

export type ErrorCatalogEntry = GskModeErrorCatalogEntry | ContextualErrorCatalogEntry;

export const ERROR_CODES = {
    // GSK import / package integrity
    EDGE_TYPE_UNKNOWN: "EDGE_TYPE_UNKNOWN",
    EDGE_TYPE_UNKNOWN_IN_JOURNAL: "EDGE_TYPE_UNKNOWN_IN_JOURNAL",
    QUARANTINE_MIRROR_MISSING: "QUARANTINE_MIRROR_MISSING",
    QUARANTINE_MIRROR_MISMATCH: "QUARANTINE_MIRROR_MISMATCH",
    PARENT_CHILD_MISSING_UNION: "PARENT_CHILD_MISSING_UNION",
    JOURNAL_HASH_MISMATCH: "JOURNAL_HASH_MISMATCH",
    GRAPH_HASH_MISMATCH: "GRAPH_HASH_MISMATCH",
    PACKAGE_HASH_MISMATCH: "PACKAGE_HASH_MISMATCH",
    MEDIA_ENTRY_MISSING: "MEDIA_ENTRY_MISSING",
    MEDIA_HASH_MISMATCH: "MEDIA_HASH_MISMATCH",
    SECURITY_MODE_UNSUPPORTED: "SECURITY_MODE_UNSUPPORTED",
    CORE_META_FORBIDDEN: "CORE_META_FORBIDDEN",
    LEGACY_META_EXTENSION_DETECTED: "LEGACY_META_EXTENSION_DETECTED",

    // GSK validation
    EDGE_ORPHAN_FROM: "EDGE_ORPHAN_FROM",
    EDGE_FROM_SOFT_DELETED_NODE: "EDGE_FROM_SOFT_DELETED_NODE",
    EDGE_ORPHAN_TO: "EDGE_ORPHAN_TO",
    EDGE_TO_SOFT_DELETED_NODE: "EDGE_TO_SOFT_DELETED_NODE",
    EVIDENCE_REF_TARGET_MISSING: "EVIDENCE_REF_TARGET_MISSING",
    NOTELINK_FROM_NOT_NOTE: "NOTELINK_FROM_NOT_NOTE",
    NOTELINK_TARGET_MISSING: "NOTELINK_TARGET_MISSING",
    NOTELINK_TARGET_UID_MISSING: "NOTELINK_TARGET_UID_MISSING",
    PARENT_CHILD_MISSING_NATURE: "PARENT_CHILD_MISSING_NATURE",
    PARENT_CHILD_INVALID_NATURE: "PARENT_CHILD_INVALID_NATURE",
    PARENT_CHILD_MISSING_CERTAINTY: "PARENT_CHILD_MISSING_CERTAINTY",
    PARENT_CHILD_INVALID_CERTAINTY: "PARENT_CHILD_INVALID_CERTAINTY",
    PARENT_CHILD_INVALID_UNION: "PARENT_CHILD_INVALID_UNION",
    PARENT_CHILD_PARENT_NOT_MEMBER: "PARENT_CHILD_PARENT_NOT_MEMBER",
    UNION_CHILD_MULTIPLE_FATHERS: "UNION_CHILD_MULTIPLE_FATHERS",
    UNION_CHILD_MULTIPLE_MOTHERS: "UNION_CHILD_MULTIPLE_MOTHERS",
    CLAIM_ORPHAN_NODE: "CLAIM_ORPHAN_NODE",
    CLAIMS_NOT_CANONICAL_ORDER: "CLAIMS_NOT_CANONICAL_ORDER",
    PREFERRED_CLAIM_REQUIRED: "PREFERRED_CLAIM_REQUIRED",
    MULTIPLE_PREFERRED_CLAIMS: "MULTIPLE_PREFERRED_CLAIMS",
    CLAIM_BUCKET_NODEUID_MISMATCH: "CLAIM_BUCKET_NODEUID_MISMATCH",
    CLAIM_BUCKET_PREDICATE_MISMATCH: "CLAIM_BUCKET_PREDICATE_MISMATCH",
    MISSING_CITATIONS: "MISSING_CITATIONS",
    RETRACTED_CLAIM_IS_PREFERRED: "RETRACTED_CLAIM_IS_PREFERRED",
    DUPLICATE_CLAIM_UID: "DUPLICATE_CLAIM_UID",
    PERSON_NO_NAME: "PERSON_NO_NAME",
    UNION_NO_MEMBERS: "UNION_NO_MEMBERS",
    DUPLICATE_EDGE_UIDS: "DUPLICATE_EDGE_UIDS",

    // GEDCOM parser
    PEDI_UNKNOWN_VALUE_COERCED: "PEDI_UNKNOWN_VALUE_COERCED",
    GED_VERSION_MISSING: "GED_VERSION_MISSING",
    GED_VERSION_UNKNOWN: "GED_VERSION_UNKNOWN",
    GED_NAME_METADATA_INFERRED: "GED_NAME_METADATA_INFERRED",
    GED_NAME_PARTS_INFERRED: "GED_NAME_PARTS_INFERRED",
    GED_DATE_INFORMAL: "GED_DATE_INFORMAL",
    GED_PLACE_FLAT: "GED_PLACE_FLAT",

    // GEDCOM serializer
    PEDI_STE_DEGRADED_TO_UNKNOWN: "PEDI_STE_DEGRADED_TO_UNKNOWN",
    GED_EVENT_OTHER_DROPPED: "GED_EVENT_OTHER_DROPPED",
    GED_DEAT_IMPLICIT: "GED_DEAT_IMPLICIT",
    GED_FAM_EVENT_DROPPED: "GED_FAM_EVENT_DROPPED",
    GED_RELATION_NOTES_DROPPED: "GED_RELATION_NOTES_DROPPED",
    GED_MEDIA_BINARY_NOT_EMBEDDED: "GED_MEDIA_BINARY_NOT_EMBEDDED",
    GED_METADATA_EXTENSION_DROPPED: "GED_METADATA_EXTENSION_DROPPED",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

function sameSeverity(value: ErrorSeverity): Record<GskImportMode, ErrorSeverity> {
    return {
        "strict-lossless": value,
        "strict-lossless-audit": value,
        "compat": value,
    };
}

function gskEntry(entry: Omit<GskModeErrorCatalogEntry, "scope" | "context"> & {
    scope?: "gsk-import" | "gsk-validation";
    context?: "package-import" | "graph-validation" | "journal-replay" | "compat-repair";
}): GskModeErrorCatalogEntry {
    return {
        scope: entry.scope ?? "gsk-import",
        context: entry.context ?? "package-import",
        ...entry,
    };
}

function gedEntry(entry: Omit<ContextualErrorCatalogEntry, "scope" | "context"> & {
    scope: "gedcom-parser" | "gedcom-serializer";
    context: "gedcom-import" | "gedcom-export";
}): ContextualErrorCatalogEntry {
    return entry;
}

export const ERROR_CATALOG: Record<string, ErrorCatalogEntry> = {
    [ERROR_CODES.EDGE_TYPE_UNKNOWN]: gskEntry({
        code: ERROR_CODES.EDGE_TYPE_UNKNOWN,
        condition: "Se detecta edge.type fuera del catalogo canonico.",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Rechazar en strict/audit; cuarentena y skip en compat.",
        remediation: "Corregir type o registrar extension formal.",
    }),
    [ERROR_CODES.EDGE_TYPE_UNKNOWN_IN_JOURNAL]: gskEntry({
        code: ERROR_CODES.EDGE_TYPE_UNKNOWN_IN_JOURNAL,
        context: "journal-replay",
        condition: "Operacion ADD_EDGE en journal con tipo desconocido.",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Rechazar en strict/audit; cuarentena y skip en compat.",
        remediation: "Reexportar journal con edge type valido.",
    }),
    [ERROR_CODES.QUARANTINE_MIRROR_MISSING]: gskEntry({
        code: ERROR_CODES.QUARANTINE_MIRROR_MISSING,
        condition: "graph.quarantine tiene entradas pero falta quarantine.json.",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Fail strict/audit; continuar en compat con graph como fuente.",
        remediation: "Regenerar paquete para restablecer mirror.",
    }),
    [ERROR_CODES.QUARANTINE_MIRROR_MISMATCH]: gskEntry({
        code: ERROR_CODES.QUARANTINE_MIRROR_MISMATCH,
        condition: "quarantine.json no coincide con graph.quarantine.",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Fail strict/audit; continuar en compat con graph como fuente.",
        remediation: "Sincronizar mirror mediante export canonico.",
    }),
    [ERROR_CODES.PARENT_CHILD_MISSING_UNION]: gskEntry({
        code: ERROR_CODES.PARENT_CHILD_MISSING_UNION,
        condition: "ParentChild activo sin unionUid.",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Fail strict/audit; reparar en compat.",
        remediation: "Agregar unionUid canonico o revisar normalizacion familiar.",
    }),
    [ERROR_CODES.PREFERRED_CLAIM_REQUIRED]: gskEntry({
        code: ERROR_CODES.PREFERRED_CLAIM_REQUIRED,
        scope: "gsk-validation",
        context: "graph-validation",
        condition: "Hay claims activas sin preferred.",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Fail strict/audit; normalizar claims en compat.",
        remediation: "Marcar una claim activa como preferred.",
    }),
    [ERROR_CODES.MULTIPLE_PREFERRED_CLAIMS]: gskEntry({
        code: ERROR_CODES.MULTIPLE_PREFERRED_CLAIMS,
        scope: "gsk-validation",
        context: "graph-validation",
        condition: "Hay mas de una claim preferred activa para (node,predicate).",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Fail strict/audit; normalizar claims en compat.",
        remediation: "Conservar una preferred activa y desmarcar el resto.",
    }),
    [ERROR_CODES.CLAIMS_NOT_CANONICAL_ORDER]: gskEntry({
        code: ERROR_CODES.CLAIMS_NOT_CANONICAL_ORDER,
        scope: "gsk-validation",
        context: "graph-validation",
        condition: "Orden de bucket claims no canonico.",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Fail strict/audit; normalizar orden en compat.",
        remediation: "Reordenar por sortKey canonico.",
    }),
    [ERROR_CODES.RETRACTED_CLAIM_IS_PREFERRED]: gskEntry({
        code: ERROR_CODES.RETRACTED_CLAIM_IS_PREFERRED,
        scope: "gsk-validation",
        context: "graph-validation",
        condition: "Claim retractada marcada preferred.",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Fail strict/audit; corregir en compat.",
        remediation: "Asegurar isPreferred=false para claims retractadas.",
    }),
    [ERROR_CODES.JOURNAL_HASH_MISMATCH]: gskEntry({
        code: ERROR_CODES.JOURNAL_HASH_MISMATCH,
        condition: "Hash del journal no coincide con manifest.",
        severityByMode: { "strict-lossless": "warning", "strict-lossless-audit": "error", compat: "warning" },
        action: "En audit es critico; en strict/compat se marca inconsistente.",
        remediation: "Regenerar paquete con journal canonico.",
    }),
    [ERROR_CODES.GRAPH_HASH_MISMATCH]: gskEntry({
        code: ERROR_CODES.GRAPH_HASH_MISMATCH,
        condition: "Hash de graph no coincide con manifest.",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Fail strict/audit; warning compat.",
        remediation: "Regenerar graph/manifest con export canonico.",
    }),
    [ERROR_CODES.PACKAGE_HASH_MISMATCH]: gskEntry({
        code: ERROR_CODES.PACKAGE_HASH_MISMATCH,
        condition: "Integridad de paquete completo no coincide.",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Fail strict/audit; compat continua con warning.",
        remediation: "Reexportar paquete sin tampering.",
    }),
    [ERROR_CODES.MEDIA_ENTRY_MISSING]: gskEntry({
        code: ERROR_CODES.MEDIA_ENTRY_MISSING,
        condition: "mediaEntries referencia archivo inexistente en zip.",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Fail strict/audit; compat continua sin embedding.",
        remediation: "Incluir archivo faltante o corregir mediaEntries.",
    }),
    [ERROR_CODES.MEDIA_HASH_MISMATCH]: gskEntry({
        code: ERROR_CODES.MEDIA_HASH_MISMATCH,
        condition: "Hash de archivo media no coincide con mediaEntries.",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Fail strict/audit; compat marca warning.",
        remediation: "Regenerar paquete y metadatos de media.",
    }),
    [ERROR_CODES.SECURITY_MODE_UNSUPPORTED]: gskEntry({
        code: ERROR_CODES.SECURITY_MODE_UNSUPPORTED,
        condition: "Se recibe modo de seguridad no soportado en 0.4.0.",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Fail strict/audit; compat warning y continua sin enforcement.",
        remediation: "Usar security.mode=none o version con soporte real.",
    }),
    [ERROR_CODES.CORE_META_FORBIDDEN]: gskEntry({
        code: ERROR_CODES.CORE_META_FORBIDDEN,
        condition: "Paquete con schemaVersion >= 0.5.0 incluye archivos meta/* de la app.",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Fail strict/audit; compat ignora meta y continua.",
        remediation: "Mover metadata de app a perfil local o exportar schema legacy.",
    }),
    [ERROR_CODES.LEGACY_META_EXTENSION_DETECTED]: gskEntry({
        code: ERROR_CODES.LEGACY_META_EXTENSION_DETECTED,
        condition: "Paquete legacy (<0.5.0) contiene extension meta/* de app.",
        severityByMode: sameSeverity("warning"),
        action: "Mantener compatibilidad de import y reportar extension legacy.",
        remediation: "Migrar metadata de app a perfil local y reexportar como core-only cuando aplique.",
    }),

    [ERROR_CODES.EDGE_ORPHAN_FROM]: gskEntry({
        code: ERROR_CODES.EDGE_ORPHAN_FROM,
        scope: "gsk-validation",
        context: "graph-validation",
        condition: "Arista activa apunta a fromUid inexistente.",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Invalidar en strict/audit; advertir en compat.",
        remediation: "Corregir referencia fromUid o nodo faltante.",
    }),
    [ERROR_CODES.EDGE_FROM_SOFT_DELETED_NODE]: gskEntry({
        code: ERROR_CODES.EDGE_FROM_SOFT_DELETED_NODE,
        scope: "gsk-validation",
        context: "graph-validation",
        condition: "Arista activa apunta a fromUid soft-deleted.",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Invalidar en strict/audit; advertir en compat.",
        remediation: "Reactivar nodo o retirar arista activa.",
    }),
    [ERROR_CODES.EDGE_ORPHAN_TO]: gskEntry({
        code: ERROR_CODES.EDGE_ORPHAN_TO,
        scope: "gsk-validation",
        context: "graph-validation",
        condition: "Arista activa apunta a toUid inexistente.",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Invalidar en strict/audit; advertir en compat.",
        remediation: "Corregir referencia toUid o nodo faltante.",
    }),
    [ERROR_CODES.EDGE_TO_SOFT_DELETED_NODE]: gskEntry({
        code: ERROR_CODES.EDGE_TO_SOFT_DELETED_NODE,
        scope: "gsk-validation",
        context: "graph-validation",
        condition: "Arista activa apunta a toUid soft-deleted.",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Invalidar en strict/audit; advertir en compat.",
        remediation: "Reactivar nodo o retirar arista activa.",
    }),
    [ERROR_CODES.EVIDENCE_REF_TARGET_MISSING]: gskEntry({
        code: ERROR_CODES.EVIDENCE_REF_TARGET_MISSING,
        scope: "gsk-validation",
        context: "graph-validation",
        condition: "EvidenceRef apunta a nodo objetivo no presente.",
        severityByMode: sameSeverity("warning"),
        action: "Mantener carga y advertir inconsistencia.",
        remediation: "Corregir toUid de EvidenceRef o restaurar objetivo.",
    }),
    [ERROR_CODES.NOTELINK_FROM_NOT_NOTE]: gskEntry({
        code: ERROR_CODES.NOTELINK_FROM_NOT_NOTE,
        scope: "gsk-validation",
        context: "graph-validation",
        condition: "NoteLink no parte de un nodo tipo Note activo.",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Invalidar en strict/audit; advertir en compat.",
        remediation: "Corregir fromUid o tipo de nodo origen.",
    }),
    [ERROR_CODES.NOTELINK_TARGET_MISSING]: gskEntry({
        code: ERROR_CODES.NOTELINK_TARGET_MISSING,
        scope: "gsk-validation",
        context: "graph-validation",
        condition: "NoteLink apunta a nodo destino ausente.",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Invalidar en strict/audit; advertir en compat.",
        remediation: "Corregir toUid o restaurar nodo destino.",
    }),
    [ERROR_CODES.NOTELINK_TARGET_UID_MISSING]: gskEntry({
        code: ERROR_CODES.NOTELINK_TARGET_UID_MISSING,
        scope: "gsk-validation",
        context: "graph-validation",
        condition: "NoteLink contiene targetUid inexistente.",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Invalidar en strict/audit; advertir en compat.",
        remediation: "Corregir targetUid para apuntar a un uid valido.",
    }),
    [ERROR_CODES.PARENT_CHILD_MISSING_NATURE]: gskEntry({
        code: ERROR_CODES.PARENT_CHILD_MISSING_NATURE,
        scope: "gsk-validation",
        context: "graph-validation",
        condition: "ParentChild carece de nature obligatorio.",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Invalidar en strict/audit; advertir en compat.",
        remediation: "Asignar nature valido (BIO/ADO/FOS/STE/SEAL/UNK).",
    }),
    [ERROR_CODES.PARENT_CHILD_INVALID_NATURE]: gskEntry({
        code: ERROR_CODES.PARENT_CHILD_INVALID_NATURE,
        scope: "gsk-validation",
        context: "graph-validation",
        condition: "ParentChild tiene nature fuera de catalogo.",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Invalidar en strict/audit; advertir en compat.",
        remediation: "Normalizar nature a un valor canonico.",
    }),
    [ERROR_CODES.PARENT_CHILD_MISSING_CERTAINTY]: gskEntry({
        code: ERROR_CODES.PARENT_CHILD_MISSING_CERTAINTY,
        scope: "gsk-validation",
        context: "graph-validation",
        condition: "ParentChild carece de certainty obligatorio.",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Invalidar en strict/audit; advertir en compat.",
        remediation: "Asignar certainty valido (high/medium/low/uncertain).",
    }),
    [ERROR_CODES.PARENT_CHILD_INVALID_CERTAINTY]: gskEntry({
        code: ERROR_CODES.PARENT_CHILD_INVALID_CERTAINTY,
        scope: "gsk-validation",
        context: "graph-validation",
        condition: "ParentChild tiene certainty fuera de catalogo.",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Invalidar en strict/audit; advertir en compat.",
        remediation: "Normalizar certainty a un valor canonico.",
    }),
    [ERROR_CODES.PARENT_CHILD_INVALID_UNION]: gskEntry({
        code: ERROR_CODES.PARENT_CHILD_INVALID_UNION,
        scope: "gsk-validation",
        context: "graph-validation",
        condition: "ParentChild referencia unionUid ausente, borrado o no Union.",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Invalidar en strict/audit; advertir en compat.",
        remediation: "Corregir unionUid y asegurar nodo Union activo.",
    }),
    [ERROR_CODES.PARENT_CHILD_PARENT_NOT_MEMBER]: gskEntry({
        code: ERROR_CODES.PARENT_CHILD_PARENT_NOT_MEMBER,
        scope: "gsk-validation",
        context: "graph-validation",
        condition: "ParentChild tiene unionUid pero el progenitor no es Member de esa Union.",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Invalidar en strict/audit; advertir en compat.",
        remediation: "Crear o corregir arista Member correspondiente.",
    }),
    [ERROR_CODES.UNION_CHILD_MULTIPLE_FATHERS]: gskEntry({
        code: ERROR_CODES.UNION_CHILD_MULTIPLE_FATHERS,
        scope: "gsk-validation",
        context: "graph-validation",
        condition: "Tupla union+hijo tiene mas de un parentRole=father.",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Invalidar en strict/audit; advertir en compat.",
        remediation: "Resolver duplicidad de roles parentales.",
    }),
    [ERROR_CODES.UNION_CHILD_MULTIPLE_MOTHERS]: gskEntry({
        code: ERROR_CODES.UNION_CHILD_MULTIPLE_MOTHERS,
        scope: "gsk-validation",
        context: "graph-validation",
        condition: "Tupla union+hijo tiene mas de un parentRole=mother.",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Invalidar en strict/audit; advertir en compat.",
        remediation: "Resolver duplicidad de roles parentales.",
    }),
    [ERROR_CODES.CLAIM_ORPHAN_NODE]: gskEntry({
        code: ERROR_CODES.CLAIM_ORPHAN_NODE,
        scope: "gsk-validation",
        context: "graph-validation",
        condition: "Bucket de claims existe para nodeUid inexistente.",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Invalidar en strict/audit; advertir en compat.",
        remediation: "Corregir bucket o crear nodo referenciado.",
    }),
    [ERROR_CODES.CLAIM_BUCKET_NODEUID_MISMATCH]: gskEntry({
        code: ERROR_CODES.CLAIM_BUCKET_NODEUID_MISMATCH,
        scope: "gsk-validation",
        context: "graph-validation",
        condition: "claim.nodeUid no coincide con bucket claims[nodeUid].",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Invalidar en strict/audit; advertir en compat.",
        remediation: "Sincronizar claim.nodeUid con su bucket.",
    }),
    [ERROR_CODES.CLAIM_BUCKET_PREDICATE_MISMATCH]: gskEntry({
        code: ERROR_CODES.CLAIM_BUCKET_PREDICATE_MISMATCH,
        scope: "gsk-validation",
        context: "graph-validation",
        condition: "claim.predicate no coincide con bucket claims[nodeUid][predicate].",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Invalidar en strict/audit; advertir en compat.",
        remediation: "Sincronizar claim.predicate con su bucket.",
    }),
    [ERROR_CODES.MISSING_CITATIONS]: gskEntry({
        code: ERROR_CODES.MISSING_CITATIONS,
        scope: "gsk-validation",
        context: "graph-validation",
        condition: "Claim reviewed/verified sin citations.",
        severityByMode: sameSeverity("info"),
        action: "Mantener carga y reportar brecha de evidencia.",
        remediation: "Agregar citas o ajustar calidad del claim.",
    }),
    [ERROR_CODES.DUPLICATE_CLAIM_UID]: gskEntry({
        code: ERROR_CODES.DUPLICATE_CLAIM_UID,
        scope: "gsk-validation",
        context: "graph-validation",
        condition: "UID de claim duplicado en el mismo bucket.",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Invalidar en strict/audit; advertir en compat.",
        remediation: "Regenerar UID duplicado y reexportar.",
    }),
    [ERROR_CODES.PERSON_NO_NAME]: gskEntry({
        code: ERROR_CODES.PERSON_NO_NAME,
        scope: "gsk-validation",
        context: "graph-validation",
        condition: "Nodo Person activo sin claims de nombre y no placeholder.",
        severityByMode: sameSeverity("warning"),
        action: "Permitir carga con advertencia de incompletitud.",
        remediation: "Agregar al menos un claim person.name.full activo.",
    }),
    [ERROR_CODES.UNION_NO_MEMBERS]: gskEntry({
        code: ERROR_CODES.UNION_NO_MEMBERS,
        scope: "gsk-validation",
        context: "graph-validation",
        condition: "Nodo Union activo sin aristas Member.",
        severityByMode: sameSeverity("warning"),
        action: "Permitir carga con advertencia.",
        remediation: "Agregar miembros o depurar union huerfana.",
    }),
    [ERROR_CODES.DUPLICATE_EDGE_UIDS]: gskEntry({
        code: ERROR_CODES.DUPLICATE_EDGE_UIDS,
        scope: "gsk-validation",
        context: "graph-validation",
        condition: "UID de arista duplicado.",
        severityByMode: { "strict-lossless": "error", "strict-lossless-audit": "error", compat: "warning" },
        action: "Invalidar en strict/audit; advertir en compat.",
        remediation: "Regenerar UID de arista duplicado.",
    }),

    [ERROR_CODES.PEDI_UNKNOWN_VALUE_COERCED]: gedEntry({
        code: ERROR_CODES.PEDI_UNKNOWN_VALUE_COERCED,
        scope: "gedcom-parser",
        context: "gedcom-import",
        condition: "PEDI importado con valor desconocido coercionado a UNKNOWN.",
        severity: "warning",
        action: "Mantener import y registrar warning.",
        remediation: "Corregir valor PEDI en fuente GEDCOM.",
    }),
    [ERROR_CODES.GED_VERSION_MISSING]: gedEntry({
        code: ERROR_CODES.GED_VERSION_MISSING,
        scope: "gedcom-parser",
        context: "gedcom-import",
        condition: "No se encontro HEAD.GEDC.VERS en el archivo GEDCOM.",
        severity: "warning",
        action: "Import tolerante con version source=unknown.",
        remediation: "Agregar bloque GEDC.VERS en el GEDCOM de origen.",
    }),
    [ERROR_CODES.GED_VERSION_UNKNOWN]: gedEntry({
        code: ERROR_CODES.GED_VERSION_UNKNOWN,
        scope: "gedcom-parser",
        context: "gedcom-import",
        condition: "HEAD.GEDC.VERS contiene version no reconocida.",
        severity: "warning",
        action: "Import tolerante con version source=unknown.",
        remediation: "Usar version soportada (5.5/5.5.1/7.0.x).",
    }),
    [ERROR_CODES.GED_NAME_METADATA_INFERRED]: gedEntry({
        code: ERROR_CODES.GED_NAME_METADATA_INFERRED,
        scope: "gedcom-parser",
        context: "gedcom-import",
        condition: "Se infieren prefijos, sufijos o títulos de la cadena NAME.",
        severity: "info",
        action: "Registrar la inferencia para trazabilidad.",
        remediation: "Verificar en la UI o etiquetar explícitamente en el GEDCOM (NPFX/NSFX/TITL).",
    }),
    [ERROR_CODES.GED_NAME_PARTS_INFERRED]: gedEntry({
        code: ERROR_CODES.GED_NAME_PARTS_INFERRED,
        scope: "gedcom-parser",
        context: "gedcom-import",
        condition: "Se infieren nombres de pila y apellidos mediante delimitadores / /.",
        severity: "info",
        action: "Registrar la inferencia para trazabilidad.",
        remediation: "Etiquetar explícitamente en el GEDCOM (GIVN/SURN) para máxima precisión.",
    }),
    [ERROR_CODES.GED_DATE_INFORMAL]: gedEntry({
        code: ERROR_CODES.GED_DATE_INFORMAL,
        scope: "gedcom-parser",
        context: "gedcom-import",
        condition: "La fecha tiene un formato informal o no estándar.",
        severity: "info",
        action: "Preservar el valor raw y marcar como isInformal.",
        remediation: "Verificar la fecha en la UI o usar formato GEDCOM estándar.",
    }),
    [ERROR_CODES.GED_PLACE_FLAT]: gedEntry({
        code: ERROR_CODES.GED_PLACE_FLAT,
        scope: "gedcom-parser",
        context: "gedcom-import",
        condition: "El lugar carece de jerarquía clara (comas).",
        severity: "info",
        action: "Poblar parts mediante split de comas si están presentes.",
        remediation: "Usar comas para separar Ciudad, Provincia, País.",
    }),
    [ERROR_CODES.PEDI_STE_DEGRADED_TO_UNKNOWN]: gedEntry({
        code: ERROR_CODES.PEDI_STE_DEGRADED_TO_UNKNOWN,
        scope: "gedcom-serializer",
        context: "gedcom-export",
        condition: "nature=STE degradado a PEDI UNKNOWN en export.",
        severity: "info",
        action: "Exportar con degradacion explicita.",
        remediation: "Usar formato con extension o metadata adicional.",
    }),
    [ERROR_CODES.GED_EVENT_OTHER_DROPPED]: gedEntry({
        code: ERROR_CODES.GED_EVENT_OTHER_DROPPED,
        scope: "gedcom-serializer",
        context: "gedcom-export",
        condition: "Eventos OTHER pueden no ser compatibles en consumidores GED.",
        severity: "warning",
        action: "Exportar con warning de compatibilidad.",
        remediation: "Normalizar eventos a tags GED estandar cuando sea posible.",
    }),
    [ERROR_CODES.GED_DEAT_IMPLICIT]: gedEntry({
        code: ERROR_CODES.GED_DEAT_IMPLICIT,
        scope: "gedcom-serializer",
        context: "gedcom-export",
        condition: "Persona fallecida sin evento DEAT explicito.",
        severity: "warning",
        action: "Exportar y advertir inconsistencia semantica.",
        remediation: "Agregar evento DEAT explicito en el documento fuente.",
    }),
    [ERROR_CODES.GED_FAM_EVENT_DROPPED]: gedEntry({
        code: ERROR_CODES.GED_FAM_EVENT_DROPPED,
        scope: "gedcom-serializer",
        context: "gedcom-export",
        condition: "Eventos de familia fuera de MARR/DIV no se exportan en perfil GED actual.",
        severity: "warning",
        action: "Exportar con warning de perdida de expresividad.",
        remediation: "Mapear eventos no estandar a extensiones o notas controladas.",
    }),
    [ERROR_CODES.GED_RELATION_NOTES_DROPPED]: gedEntry({
        code: ERROR_CODES.GED_RELATION_NOTES_DROPPED,
        scope: "gedcom-serializer",
        context: "gedcom-export",
        condition: "relationNotes no se exporta en perfil GED actual.",
        severity: "info",
        action: "Exportar informando degradacion de metadata.",
        remediation: "Mover notas a estructuras GED soportadas si se requiere interoperabilidad.",
    }),
    [ERROR_CODES.GED_MEDIA_BINARY_NOT_EMBEDDED]: gedEntry({
        code: ERROR_CODES.GED_MEDIA_BINARY_NOT_EMBEDDED,
        scope: "gedcom-serializer",
        context: "gedcom-export",
        condition: "GED plano no embebe binarios de media.",
        severity: "info",
        action: "Exportar referencias OBJE/FILE y reportar limitacion.",
        remediation: "Distribuir binarios por separado o usar paquete .gsk.",
    }),
    [ERROR_CODES.GED_METADATA_EXTENSION_DROPPED]: gedEntry({
        code: ERROR_CODES.GED_METADATA_EXTENSION_DROPPED,
        scope: "gedcom-serializer",
        context: "gedcom-export",
        condition: "Metadatos extendidos de GeneaSketch no se serializan en GED plano.",
        severity: "info",
        action: "Exportar contenido GED base con aviso de metadata omitida.",
        remediation: "Conservar metadata en .gsk para roundtrip lossless.",
    }),
};

export function getErrorCatalogEntry(code: string): ErrorCatalogEntry | undefined {
    return ERROR_CATALOG[code];
}

export function isGskModeEntry(entry: ErrorCatalogEntry): entry is GskModeErrorCatalogEntry {
    return "severityByMode" in entry;
}

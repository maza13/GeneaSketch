# 07. Catalogo Normativo de Errores y Severidad

## Fuentes de verdad (codigo)
- Catalogo central: `src/core/genraph/errorCatalog.ts`
- Import/export de paquete: `src/core/genraph/GskPackage.ts`
- Validacion estructural: `src/core/genraph/validation.ts`
- GED parser: `src/core/gedcom/parser.ts`
- GED serializer: `src/core/gedcom/serializer.ts`

## Proposito
Establecer un catalogo unico y normativo para evitar drift entre runtime, tests y wiki.

## Regla de severidad por contexto
- Codigos `scope=gsk-*`: severidad por modo (`strict-lossless`, `strict-lossless-audit`, `compat`).
- Codigos `scope=gedcom-*`: severidad contextual fija (parser/export), no dependiente de modo GSK.

## Matriz GSK (import + validacion)

| Code | Scope | Context | strict-lossless | strict-lossless-audit | compat |
| :--- | :--- | :--- | :---: | :---: | :---: |
| `EDGE_TYPE_UNKNOWN` | gsk-import | package-import | Error | Error | Warning |
| `EDGE_TYPE_UNKNOWN_IN_JOURNAL` | gsk-import | journal-replay | Error | Error | Warning |
| `QUARANTINE_MIRROR_MISSING` | gsk-import | package-import | Error | Error | Warning |
| `QUARANTINE_MIRROR_MISMATCH` | gsk-import | package-import | Error | Error | Warning |
| `PARENT_CHILD_MISSING_UNION` | gsk-import | package-import | Error | Error | Warning |
| `JOURNAL_HASH_MISMATCH` | gsk-import | package-import | Warning | Error | Warning |
| `GRAPH_HASH_MISMATCH` | gsk-import | package-import | Error | Error | Warning |
| `PACKAGE_HASH_MISMATCH` | gsk-import | package-import | Error | Error | Warning |
| `MEDIA_ENTRY_MISSING` | gsk-import | package-import | Error | Error | Warning |
| `MEDIA_HASH_MISMATCH` | gsk-import | package-import | Error | Error | Warning |
| `SECURITY_MODE_UNSUPPORTED` | gsk-import | package-import | Error | Error | Warning |
| `CORE_META_FORBIDDEN` | gsk-import | package-import | Error | Error | Warning |
| `LEGACY_META_EXTENSION_DETECTED` | gsk-import | package-import | Warning | Warning | Warning |
| `PREFERRED_CLAIM_REQUIRED` | gsk-validation | graph-validation | Error | Error | Warning |
| `MULTIPLE_PREFERRED_CLAIMS` | gsk-validation | graph-validation | Error | Error | Warning |
| `CLAIMS_NOT_CANONICAL_ORDER` | gsk-validation | graph-validation | Error | Error | Warning |
| `RETRACTED_CLAIM_IS_PREFERRED` | gsk-validation | graph-validation | Error | Error | Warning |
| `EDGE_ORPHAN_FROM` | gsk-validation | graph-validation | Error | Error | Warning |
| `EDGE_FROM_SOFT_DELETED_NODE` | gsk-validation | graph-validation | Error | Error | Warning |
| `EDGE_ORPHAN_TO` | gsk-validation | graph-validation | Error | Error | Warning |
| `EDGE_TO_SOFT_DELETED_NODE` | gsk-validation | graph-validation | Error | Error | Warning |
| `EVIDENCE_REF_TARGET_MISSING` | gsk-validation | graph-validation | Warning | Warning | Warning |
| `NOTELINK_FROM_NOT_NOTE` | gsk-validation | graph-validation | Error | Error | Warning |
| `NOTELINK_TARGET_MISSING` | gsk-validation | graph-validation | Error | Error | Warning |
| `NOTELINK_TARGET_UID_MISSING` | gsk-validation | graph-validation | Error | Error | Warning |
| `PARENT_CHILD_MISSING_NATURE` | gsk-validation | graph-validation | Error | Error | Warning |
| `PARENT_CHILD_INVALID_NATURE` | gsk-validation | graph-validation | Error | Error | Warning |
| `PARENT_CHILD_MISSING_CERTAINTY` | gsk-validation | graph-validation | Error | Error | Warning |
| `PARENT_CHILD_INVALID_CERTAINTY` | gsk-validation | graph-validation | Error | Error | Warning |
| `PARENT_CHILD_INVALID_UNION` | gsk-validation | graph-validation | Error | Error | Warning |
| `PARENT_CHILD_PARENT_NOT_MEMBER` | gsk-validation | graph-validation | Error | Error | Warning |
| `UNION_CHILD_MULTIPLE_FATHERS` | gsk-validation | graph-validation | Error | Error | Warning |
| `UNION_CHILD_MULTIPLE_MOTHERS` | gsk-validation | graph-validation | Error | Error | Warning |
| `CLAIM_ORPHAN_NODE` | gsk-validation | graph-validation | Error | Error | Warning |
| `CLAIM_BUCKET_NODEUID_MISMATCH` | gsk-validation | graph-validation | Error | Error | Warning |
| `CLAIM_BUCKET_PREDICATE_MISMATCH` | gsk-validation | graph-validation | Error | Error | Warning |
| `MISSING_CITATIONS` | gsk-validation | graph-validation | Info | Info | Info |
| `DUPLICATE_CLAIM_UID` | gsk-validation | graph-validation | Error | Error | Warning |
| `PERSON_NO_NAME` | gsk-validation | graph-validation | Warning | Warning | Warning |
| `UNION_NO_MEMBERS` | gsk-validation | graph-validation | Warning | Warning | Warning |
| `DUPLICATE_EDGE_UIDS` | gsk-validation | graph-validation | Error | Error | Warning |

Nota operativa 0.5.0:
- El runtime ya exporta sin `meta/*`; `CORE_META_FORBIDDEN` aplica principalmente a paquetes externos/no conformes o artefactos manipulados.

## Matriz GEDCOM parser (contextual)

| Code | Scope | Context | Severidad |
| :--- | :--- | :--- | :---: |
| `PEDI_UNKNOWN_VALUE_COERCED` | gedcom-parser | gedcom-import | Warning |
| `GED_VERSION_MISSING` | gedcom-parser | gedcom-import | Warning |
| `GED_VERSION_UNKNOWN` | gedcom-parser | gedcom-import | Warning |
| `GED_NAME_METADATA_INFERRED` | gedcom-parser | gedcom-import | Info |
| `GED_NAME_PARTS_INFERRED` | gedcom-parser | gedcom-import | Info |
| `GED_DATE_INFORMAL` | gedcom-parser | gedcom-import | Info |
| `GED_PLACE_FLAT` | gedcom-parser | gedcom-import | Info |

## Matriz GEDCOM serializer (contextual)

| Code | Scope | Context | Severidad |
| :--- | :--- | :--- | :---: |
| `PEDI_STE_DEGRADED_TO_UNKNOWN` | gedcom-serializer | gedcom-export | Info |
| `GED_EVENT_OTHER_DROPPED` | gedcom-serializer | gedcom-export | Warning |
| `GED_DEAT_IMPLICIT` | gedcom-serializer | gedcom-export | Warning |
| `GED_FAM_EVENT_DROPPED` | gedcom-serializer | gedcom-export | Warning |
| `GED_RELATION_NOTES_DROPPED` | gedcom-serializer | gedcom-export | Info |
| `GED_MEDIA_BINARY_NOT_EMBEDDED` | gedcom-serializer | gedcom-export | Info |
| `GED_METADATA_EXTENSION_DROPPED` | gedcom-serializer | gedcom-export | Info |

## Regla de mantenimiento
Todo codigo nuevo debe cumplir, en la misma iteracion:
1. Alta en `src/core/genraph/errorCatalog.ts`.
2. Uso en runtime (sin literales sueltos de `code`).
3. Actualizacion de este capitulo.
4. Test de paridad en verde (`wiki.error-catalog-parity-docs`, `gedcom.error-catalog-parity`).

## Navegacion
[<- Anterior: 06_versionado_y_migraciones](./06_versionado_y_migraciones.md) | [Siguiente: CHANGELOG ->](./CHANGELOG.md)


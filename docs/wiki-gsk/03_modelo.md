# 03. Modelo de Datos GSchema (Nodos, Aristas y Claims)

## Fuentes de verdad (codigo)
- Tipos del modelo: `src/core/gschema/types.ts`
- Validacion: `src/core/gschema/validation.ts`

## Estado de confianza
- **Estado:** Base contractual 0.5.0 (modelo core-only)

## Proposito
Documentar el contrato semantico del grafo: entidades, relaciones, claims, evidencia y ciclo de vida.

## Conceptos clave
- **Node:** entidad del grafo (`Person`, `Union`, `Source`, `Note`, `Media`).
- **Edge:** relacion dirigida (`ParentChild`, `Member`, `Association`, `EvidenceRef`, `MediaLink`, `NoteLink`).
- **Claim:** afirmacion con procedencia, calidad y ciclo de vida.

## Regla de frontera estandar/app
- `graph.json` modela solo dominio genealogico (`gsk-core`).
- Metadatos de UX/app (preferencias visuales, layout local, tema, etc.) no forman parte del modelo canonical.
- En legacy `<0.5.0`, metadata de app puede aparecer como extension de paquete (`meta/*`) pero no dentro de `graph.json`.

## EdgeType canon
`GEdge.type` debe pertenecer al enum `GSchemaEdgeType` definido en `src/core/gschema/types.ts`.

Valores canonicos permitidos:
- `ParentChild`
- `Member`
- `Association`
- `EvidenceRef`
- `MediaLink`
- `NoteLink`

Regla normativa:
- No se deben inventar edge types fuera de este catalogo en escrituras del formato canonico.
- En runtime, cualquier `edge.type` fuera del catalogo se considera invalido (`EDGE_TYPE_UNKNOWN`).
- Politica de import:
  - `strict-lossless`: error critico y rechazo.
  - `compat`: la arista no se aplica y se preserva en cuarentena (`reason: "unknown_edge_type"`).

## Convencion normativa de timestamps
- `createdAt` (nodos/aristas/claims): **ISO-8601 string**.
- `timestamp` (claims y operaciones): **epoch seconds (Unix)**.

## Estructura formal del grafo (`graph.json`)

Tipo raiz (`GSchemaGraph`):

| Campo | Tipo | Obligatorio |
| :--- | :--- | :---: |
| `schemaVersion` | `string` | Si |
| `graphId` | `string` | Si |
| `createdAt` | `string` (ISO-8601) | Si |
| `updatedAt` | `string` (ISO-8601) | Si |
| `nodes` | `Record<string, GNode>` | Si |
| `edges` | `Record<string, GEdge>` | Si |
| `claims` | `Record<string, Record<string, GClaim[]>>` | Si |
| `quarantine` | `QuarantineOperation[]` | Si |

Invariantes de export canonico:
- Las claves de `nodes` y `edges` deben corresponder al `uid` del objeto almacenado.
- `claims` se indexa por `nodeUid` y luego por `predicate`.
- `createdAt` usa ISO-8601 string; `timestamp` de claims/ops usa epoch seconds.

## Orden canonico de `GClaim[]`
Para cada bucket `claims[nodeUid][predicate]`, el array debe serializarse en orden canonico:

- `provenance.timestamp` ascendente
- empate por `createdAt` ascendente
- empate por `uid` ascendente

`sortKey = (provenance.timestamp asc, createdAt asc, uid asc)`

### GNode (campos base)

| Campo | Tipo | Obligatorio |
| :--- | :--- | :---: |
| `uid` | `string` | Si |
| `xref` | `string` | No |
| `deleted` | `boolean` | No |
| `createdAt` | `string` (ISO-8601) | Si |

Semantica:
- `deleted=true` indica soft-delete logico (tombstone), no borrado fisico inmediato.
- Si `deleted` no existe, su valor logico efectivo es `false`.

### GEdge (campos base)

| Campo | Tipo | Obligatorio |
| :--- | :--- | :---: |
| `uid` | `string` | Si |
| `type` | `GSchemaEdgeType` | Si |
| `fromUid` | `string` | Si |
| `toUid` | `string` | Si |
| `evidenceGate` | `"direct" \| "indirect" \| "negative" \| "unassessed"` | No |
| `deleted` | `boolean` | No |
| `createdAt` | `string` (ISO-8601) | Si |

Semantica:
- `deleted=true` indica soft-delete logico (tombstone) con trazabilidad historica.
- Si `deleted` no existe, su valor logico efectivo es `false`.

### ParentChild (invariante canonico child-union)

`ParentChild` representa filiacion dirigida (`fromUid` = padre/madre, `toUid` = hijo/a) y en formato canonico requiere contexto familiar explicito:

| Campo | Tipo | Obligatorio |
| :--- | :--- | :---: |
| `parentRole` | `"father" \| "mother" \| "unknown"` | Si |
| `unionUid` | `string` | Si |
| `nature` | `"BIO" \| "ADO" \| "FOS" \| "STE" \| "SEAL" \| "UNK"` | Si |
| `certainty` | `"high" \| "medium" \| "low" \| "uncertain"` | Si |

Reglas normativas:
- No existe `ParentChild` canonico sin `unionUid`.
- `unionUid` debe apuntar a un nodo `Union` activo.
- El padre/madre (`fromUid`) debe ser miembro (`Member`) de esa misma `Union`.
- `nature` es obligatorio y debe ser uno de: `BIO | ADO | FOS | STE | SEAL | UNK`.
- `certainty` es obligatorio y debe ser uno de: `high | medium | low | uncertain`.

Semantica de `nature`:
- `BIO`: filiacion biologica
- `ADO`: filiacion adoptiva
- `FOS`: tutela/foster
- `STE`: step-parent (sin equivalente PEDI exacto en GEDCOM actual)
- `SEAL`: sealing
- `UNK`: naturaleza desconocida

## Estructura de Claim (resumen)

```ts
interface GClaim<T> {
  uid: string;
  nodeUid: string;
  predicate: string;
  value: T;
  provenance: {
    actorId: string;
    timestamp: number; // epoch seconds
    method: string;
  };
  quality: "raw" | "reviewed" | "verified" | "disputed";
  lifecycle: "active" | "retracted";
  evidenceGate?: "direct" | "indirect" | "negative" | "unassessed";
  citations?: ClaimCitation[];
  isPreferred: boolean;
  createdAt: string; // ISO-8601
}
```

### GClaim (contrato explicito)

| Campo | Tipo | Obligatorio |
| :--- | :--- | :---: |
| `uid` | `string` | Si |
| `nodeUid` | `string` | Si |
| `predicate` | `string` | Si |
| `value` | `unknown` | Si |
| `provenance.actorId` | `string` | Si |
| `provenance.timestamp` | `number` (epoch seconds) | Si |
| `provenance.method` | `string` | Si |
| `quality` | `"raw" \| "reviewed" \| "verified" \| "disputed"` | Si |
| `lifecycle` | `"active" \| "retracted"` | Si |
| `evidenceGate` | `"direct" \| "indirect" \| "negative" \| "unassessed"` | No |
| `citations` | `ClaimCitation[]` | No |
| `isPreferred` | `boolean` | Si |
| `supersedes` | `string` | No |
| `createdAt` | `string` (ISO-8601) | Si |

Nota de compatibilidad:
- `status` (legacy) no es parte del contrato actual de escritura.

Regla normativa de cardinalidad preferred:
- Si `activeClaims.length > 0`, debe existir **exactamente 1** claim con `isPreferred=true`.
- Si `activeClaims.length === 0`, todas las claims deben tener `isPreferred=false`.

### QuarantineOperation (quarantine)

En `graph.json`, `quarantine` contiene entradas de tipo operacion `QUARANTINE` (lossless AST), incluyendo:
- `opId`, `opSeq`, `type`, `timestamp`, `actorId`
- `importId`, `ast`, `reason`
- `context?`, `originalGedcomVersion?`

Regla de fuente de verdad:
- `graph.json.quarantine` es el indice canonico; `quarantine.json` replica ese contenido para portabilidad/export lossless.
- Si existe `quarantine.json`, debe coincidir exactamente con `graph.json.quarantine` (comparacion canonica por contenido).
- Politica por modo:
  - `strict-lossless`: mismatch/missing => error critico (`QUARANTINE_MIRROR_MISMATCH`, `QUARANTINE_MIRROR_MISSING`).
  - `compat`: warning y se impone `graph.json.quarantine`.

### Ejemplo canonico compacto

```json
{
  "schemaVersion": "0.5.0",
  "graphId": "graph-uuid",
  "createdAt": "2026-03-03T10:00:00Z",
  "updatedAt": "2026-03-03T10:05:00Z",
  "nodes": {
    "p1": { "uid": "p1", "type": "Person", "sex": "F", "isLiving": true, "createdAt": "2026-03-03T10:00:00Z" }
  },
  "edges": {},
  "claims": {
    "p1": {
      "person.name.full": [
        {
          "uid": "c1",
          "nodeUid": "p1",
          "predicate": "person.name.full",
          "value": { "raw": "Ana Perez" },
          "provenance": { "actorId": "user:manual", "timestamp": 1772522400, "method": "user:manual" },
          "quality": "reviewed",
          "lifecycle": "active",
          "evidenceGate": "unassessed",
          "isPreferred": true,
          "createdAt": "2026-03-03T10:01:00Z"
        }
      ]
    }
  },
  "quarantine": []
}
```

## Evidencia dual con jerarquia
1. `claim.citations[]` (primario): evidencia inline para interoperabilidad directa (`SOUR/PAGE/QUAY`).
2. `EvidenceRef` (secundario/navegable): arista del grafo para consultas y trazabilidad avanzada.

## Contrato de operaciones
- Fuente normativa unica del catalogo de operaciones: `04_operaciones.md`.
- Este capitulo solo referencia semantica de datos; no mantiene lista canonica de opcodes.

Alias legibles en UI/documentacion narrativa:
- `SET_PREF` -> `SET_PREF_CLAIM`
- `RETRACT` -> `RETRACT_CLAIM`

## Reglas no negociables
1. Unica preferred activa por `(nodeUid, predicate)`.
2. Ninguna arista o claim apunta a `uid` inexistente.
3. Claims retractadas no pueden quedar como preferred.
4. Predicados siguen notacion punto-separada (`person.name.prefix`, `person.event.birth.date`).

## Consistencia entre capitulos
- `02_formato` define el contenedor `.gsk` y artefactos.
- `03_modelo` define semantica y tipos de datos internos del `graph.json`.

## Navegacion
[<- Anterior: 02_formato](./02_formato.md) | [Siguiente: 04_operaciones ->](./04_operaciones.md)

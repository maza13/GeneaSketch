# 02. Anatomia del Formato `.gsk` (Paquete ZIP)

## Fuentes de verdad (codigo)
- Serializador/cargador: `src/core/gschema/GskPackage.ts`
- Journal JSONL: `src/core/gschema/Journal.ts`
- Tipos de paquete: `src/core/gschema/types.ts`

## Estado de confianza
- **Estado:** Operativo en 0.5.0 core-only

## Proposito
Definir el contrato fisico del contenedor `.gsk`, las reglas de presencia de archivos y la politica de integridad/recuperacion.

## Estructura del paquete

```text
mi-arbol.gsk
|-- manifest.json
|-- graph.json
|-- journal.jsonl        (condicional)
|-- quarantine.json      (condicional)
|-- media/               (condicional)
`-- meta/                (extension legacy, no parte core-only)
```

## Presencia normativa por artefacto (0.5.0 core-only)

| Artefacto | Presencia | Regla |
| :--- | :--- | :--- |
| `manifest.json` | Requerido | Siempre debe existir. |
| `graph.json` | Requerido | Snapshot canonico del grafo. |
| `journal.jsonl` | Condicional | Se exporta solo si `journal.length > 0`. |
| `quarantine.json` | Condicional | Se exporta solo si `graph.quarantine.length > 0`. |
| `media/*` | Condicional | Se exporta por cada nodo `Media` con `dataUrl` embebido. |
| `meta/*` | Prohibido | No forma parte del estandar publico `gsk-core` en `schemaVersion >= 0.5.0`. |

## Estado operativo de export
- Desde `041`, el runtime exporta `.gsk` core-only con `schemaVersion = 0.5.0`.
- La exportacion ya no escribe `meta/*` y no agrega entradas `role: "meta"` en `integrity.entries`.
- `meta/*` se mantiene solo como extension legacy tolerada en import de schemas `<0.5.0`.
- En `0.5.x`, esa tolerancia legacy se considera transitoria/deprecada; el corte total de compatibilidad se planifica para `0.6.0`.

## Matriz de politica `meta/*` por schema y modo

| Condicion | strict-lossless | strict-lossless-audit | compat |
| :--- | :---: | :---: | :---: |
| `schemaVersion >= 0.5.0` + `meta/*` presente | Error (`CORE_META_FORBIDDEN`) | Error (`CORE_META_FORBIDDEN`) | Warning (`CORE_META_FORBIDDEN`) + ignore de meta |
| `schemaVersion < 0.5.0` + `meta/*` presente | Warning (`LEGACY_META_EXTENSION_DETECTED`) | Warning (`LEGACY_META_EXTENSION_DETECTED`) | Warning (`LEGACY_META_EXTENSION_DETECTED`) |
| `schemaVersion >= 0.5.0` + sin `meta/*` | OK | OK | OK |

## Canon de datos
- `graph.json` es el snapshot autoritativo para carga normal.
- `journal.jsonl` es auditoria/recuperacion (no canon de carga normal).
- `graph.json.quarantine` es la fuente canonica de cuarentena; `quarantine.json` es su espejo externo para portabilidad y export lossless.

## `graph.json` (estructura canonica raiz)

`graph.json` debe ser un objeto JSON con estos campos obligatorios:

- `schemaVersion: string`
- `graphId: string`
- `createdAt: string` (ISO-8601)
- `updatedAt: string` (ISO-8601)
- `nodes: Record<string, GSchemaNode>`
- `edges: Record<string, GSchemaEdge>`
- `claims: Record<string, Record<string, GClaim[]>>`
- `quarantine: QuarantineOperation[]`

Nota de serializacion canonica:
- Cada `GClaim[]` en `claims[nodeUid][predicate]` se serializa en orden canonico (no orden arbitrario), definido en `03_modelo`.

Nota de alcance:
- `02_formato` define contenedor y artefactos.
- `03_modelo` define semantica y tipos internos del contenido.

## `manifest.json` (shape exacto)

Campos obligatorios:

- `schemaVersion: string`
- `graphId: string`
- `createdAt: string` (ISO-8601)
- `updatedAt: string` (ISO-8601)
- `graphDerivedFromOpSeq: number`
- `journalHeadOpSeq: number`
- `stats.personCount: number`
- `stats.unionCount: number`
- `stats.edgeCount: number`
- `stats.claimCount: number`
- `stats.mediaCount: number`
- `mediaFiles: string[]`
- `mediaEntries?: Array<{ uid, path, sha256, bytes, mime }>`
- `integrity?: { algorithm: "sha256", packageHash: string, entries: IntegrityEntry[] }`
- `security?: { mode: "none", signature: {mode:"none"}, encryption: {mode:"none"} }`

Campos condicionales/opcionales:

- `graphHash?: string` (`sha256:<hex>`)
- `journalHash?: string` (`sha256:<hex>`, solo si existe `journal.jsonl`)
- `signature?: string` (default export actual: `"none"`)
- `encryption?: "none" | "aes-256-gcm"` (default export actual: `"none"`)
- `importedFrom?: string`

Ejemplo minimo realista:

```json
{
  "schemaVersion": "0.5.0",
  "graphId": "graph-tipico-0001",
  "createdAt": "2026-03-03T11:00:00.000Z",
  "updatedAt": "2026-03-03T11:00:40.000Z",
  "graphDerivedFromOpSeq": 10,
  "journalHeadOpSeq": 10,
  "graphHash": "sha256:<hex>",
  "journalHash": "sha256:<hex>",
  "security": {
    "mode": "none",
    "signature": { "mode": "none" },
    "encryption": { "mode": "none" }
  },
  "integrity": {
    "algorithm": "sha256",
    "packageHash": "sha256:<hex>",
    "entries": [
      { "path": "graph.json", "sha256": "sha256:<hex>", "bytes": 1234, "role": "graph", "canonicalized": true }
    ]
  },
  "signature": "none",
  "encryption": "none",
  "stats": {
    "personCount": 3,
    "unionCount": 1,
    "edgeCount": 4,
    "claimCount": 3,
    "mediaCount": 0
  },
  "mediaFiles": [],
  "mediaEntries": []
}
```

## Integridad criptografica (actual)
- Canon de hashing: JSON canonico RFC8785/JCS para artefactos JSON.
- `graphHash` valida `graph.json` canonico (compat legacy: lectura de hash previo).
- `journalHash` valida payload JSONL canonico.
- `mediaEntries[]` valida cada binario (`path`, `sha256`, `bytes`, `mime`).
- `integrity.entries[]` cubre artefactos del paquete y `integrity.packageHash` valida el conjunto completo.
- En `strict-lossless` y `strict-lossless-audit`, mismatch de `packageHash` es critico.
- En `strict-lossless-audit`, `journalHash` invalido es critico cuando existe journal.

## Politica de recuperacion

### Modos de carga
- `strict-lossless` (predeterminado): aborta ante violaciones criticas.
- `strict-lossless-audit`: endurece auditoria; journal invalido => error critico.
- `compat`: intenta recuperar y reporta warnings.

### Regla normativa de cuarentena
- `quarantine.json` **debe existir** cuando `graph.quarantine.length > 0`.
- `quarantine.json` es **opcional** cuando `graph.quarantine.length === 0`.
- Si `quarantine.json` existe, debe ser **espejo exacto canonico** de `graph.json.quarantine` (misma coleccion de entradas; comparacion deterministica por contenido).
- Politica de import:
  - `strict-lossless`: `QUARANTINE_MIRROR_MISSING` o `QUARANTINE_MIRROR_MISMATCH` => error critico.
  - `compat`: warning equivalente y prevalece `graph.json.quarantine` como fuente autoritativa.

### Relacion `graphDerivedFromOpSeq` vs `journalHeadOpSeq`
- Igualdad: snapshot alineado al head del journal.
- `graphDerivedFromOpSeq < journalHeadOpSeq`: snapshot atrasado.
  - Se aplica fast-forward incremental (`opSeq > graphDerivedFromOpSeq`).
  - Si falla fast-forward, fallback a replay completo.
- Si `graph.json` es invalido y el journal es valido: replay completo.

### Precedencia de validacion de integridad
1. `integrity.packageHash` (si existe) valida el conjunto completo de artefactos.
2. Hashes de artefacto (`graphHash`, `journalHash`, `mediaEntries[]`) se evaluan despues de `packageHash`.
3. Validaciones estructurales (`validation.ts`) se aplican sobre el contenido ya verificado/parseado.

### Matriz por modo (`graph.json` vs `journal.jsonl`)
| `graph.json` | `journal.jsonl` | `compat` | `strict-lossless` | `strict-lossless-audit` |
| :---: | :---: | :--- | :--- | :--- |
| Valido | Consistente | Carga normal (y fast-forward si snapshot atrasado) | Carga normal (y fast-forward si snapshot atrasado) | Carga normal (y fast-forward si snapshot atrasado) |
| Valido | Inconsistente (`JOURNAL_HASH_MISMATCH`) | Carga snapshot + warning | Carga snapshot + warning | Error critico |
| Invalido | Valido | Replay completo | Replay completo | Replay completo |
| Invalido | Invalido | Error irrecuperable | Error irrecuperable | Error irrecuperable |

## Reglas no negociables
1. `graph.json` es canon en carga normal.
2. Journal es append-only y gap-less en `opSeq`.
3. Datos GEDCOM no mapeados van a cuarentena AST (no se descartan).
4. El contrato de tipos del contenido vive en `03_modelo`.

## Navegacion
[<- Anterior: 01_paradigma](./01_paradigma.md) | [Siguiente: 03_modelo ->](./03_modelo.md)

# 04. Operaciones y Journal (Auditoria)

## Fuentes de verdad (codigo)
- Grafo y mutaciones: `src/core/gschema/GSchemaGraph.ts`
- Journal/replay/recovery: `src/core/gschema/Journal.ts`
- Tipos canonicos de opcode: `src/core/gschema/types.ts`

## Estado de confianza
- **Estado:** Base contractual 0.5.0 (sin nuevos opcodes)

## Proposito
Definir como muta el grafo y como el journal garantiza trazabilidad, recuperacion y determinismo.

## Principios
- El journal es append-only.
- `opSeq` define el orden determinista de aplicacion.
- `graph.json` es canon en carga normal.
- Replay completo se usa solo para recuperacion de emergencia.

## Tipos de operaciones (canonicos)
- `ADD_NODE`
- `ADD_EDGE`
- `ADD_CLAIM`
- `SET_PREF_CLAIM`
- `RETRACT_CLAIM`
- `SOFT_DELETE_NODE`
- `SOFT_DELETE_EDGE`
- `REPAIR_CREATE_UNION`
- `REPAIR_CREATE_MEMBER_EDGE`
- `REPAIR_RELINK_PARENT_CHILD`
- `QUARANTINE`
- `INITIAL_IMPORT`

Regla de fuente unica:
- Esta seccion es la referencia normativa unica para opcodes del journal.
- Cualquier cambio en `GSchemaOperationType` debe reflejarse aqui y validarse por test de paridad.

Nota 0.5.0:
- El contrato `gsk-core 0.5.0` no introduce opcodes nuevos.
- El cambio es de frontera de formato (core-only vs metadata de app), no de semantica de journal.

## Politica de recuperacion operativa
- **Fast-forward incremental:** si `graphDerivedFromOpSeq < journalHeadOpSeq`, se aplican solo operaciones faltantes del journal.
- **Replay completo:** si `graph.json` es invalido/ilegible y el journal es valido.
- **Fallback:** si fast-forward falla, se intenta replay completo; en `strict-lossless`, falla dura si tampoco se puede reconstruir.

## Formato de `journal.jsonl`
- El archivo usa JSONL puro: **1 objeto JSON por linea**.
- No existe arreglo envolvente ni objeto raiz.
- El orden de aplicacion es determinista por `opSeq`.

## Reglas no negociables
1. `opSeq` monotono y sin huecos.
2. Cada mutacion persistida debe tener su operacion journal asociada.
3. Journal no reemplaza al snapshot como canon de carga normal.
4. Retraccion de claim usa `RETRACT_CLAIM` (no borrado fisico).
5. `RETRACT_CLAIM` actualiza exclusivamente `claim.lifecycle = "retracted"`; no define ni requiere `status`.
6. Mutaciones sobre claims deben preservar cardinalidad preferred por `(nodeUid, predicate)`:
   - si hay claims activas, exactamente una `isPreferred=true`;
   - si no hay activas, todas `false`.
7. `ADD_EDGE` con `edge.type` desconocido:
   - `strict-lossless`: error critico (`EDGE_TYPE_UNKNOWN` / `EDGE_TYPE_UNKNOWN_IN_JOURNAL`).
   - `compat`: no se aplica la arista; se preserva payload en `graph.quarantine` (`reason: "unknown_edge_type"`).
8. Reparaciones estructurales en `compat` deben auditarse como `REPAIR_*` con `synthetic=true` y `method` explicito.

## Ejemplo (ADD_CLAIM)

```json
{
  "opId": "op-basico-0001",
  "opSeq": 1,
  "type": "ADD_CLAIM",
  "timestamp": 1772532005,
  "actorId": "importer:fixture",
  "claim": {
    "uid": "c-juan-name-1",
    "nodeUid": "p-juan",
    "predicate": "person.name.full",
    "value": "Juan Perez",
    "provenance": {
      "actorId": "importer:fixture",
      "timestamp": 1772532005,
      "method": "fixture:basico"
    },
    "quality": "reviewed",
    "lifecycle": "active",
    "evidenceGate": "unassessed",
    "isPreferred": true,
    "createdAt": "2026-03-03T10:00:05.000Z"
  }
}
```

## Navegacion
[<- Anterior: 03_modelo](./03_modelo.md) | [Siguiente: 05_interoperabilidad_gedcom ->](./05_interoperabilidad_gedcom.md)

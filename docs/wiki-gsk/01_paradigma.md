# 01. El Paradigma GSchema: `graph.json` como Autoridad Canonica

## Fuentes de verdad (codigo)
- Modelo de tipos: `src/core/gschema/types.ts`
- Carga/export de paquetes: `src/core/gschema/GskPackage.ts`

## Estado de confianza
- **Estado:** Base contractual 0.5.0 (activacion operativa completa en `041`)

## Proposito
Explicar el paradigma operativo de GeneaSketch: un grafo semantico canonico persistido en `graph.json`, con `journal.jsonl` para auditoria y recuperacion.

## Estado vigente (operativo)
- **Contrato vigente del estandar:** `0.5.0` (core-only).
- **Export operativo actual en runtime:** activo en `0.5.0` core-only (sin `meta/*`).
- **Fuente canonica de carga normal:** `graph.json`.
- **`journal.jsonl`:** auditoria/recuperacion determinista, no canonico en carga normal.
- **Modelo de claims vigente:** `quality + lifecycle` (sin `status` en escritura actual).
- **Metadatos de app (`meta/*`):** fuera del estandar publico `gsk-core`; extension legacy transitoria en imports `<0.5.0`.

## Conceptos clave
- **`graph.json` como snapshot canonico:** contiene el estado completo del grafo al momento de guardado.
- **`journal.jsonl` como historial verificable:** registra operaciones append-only para trazabilidad y reconstruccion.
- **Claims como unidad de conocimiento:** los atributos se representan como afirmaciones con procedencia.
- **Conflictos de evidencia:** pueden coexistir multiples claims para un mismo predicado, con cardinalidad preferred controlada.

> Distincion critica: "el grafo es la verdad" se refiere a `graph.json` (snapshot persistido), no al journal.

## Reglas no negociables
1. `graph.json` es canonico para carga normal.
2. Si `graph.json` falla y el journal es valido, se puede reconstruir por replay como mecanismo de emergencia.
3. Soft-delete: nodos/aristas con `deleted=true` se ocultan, no se borran fisicamente.
4. Procedencia obligatoria en claims (`actorId`, `timestamp`, `method`).
5. Identidad estable: `uid` no cambia tras creacion.
6. Retraccion normativa de claims: `RETRACT_CLAIM` debe establecer `claim.lifecycle = "retracted"`.
7. El estandar publico `.gsk` (`gsk-core`) no incluye metadata de UX/app como parte del contrato canonical.

## Contexto historico (v0.1.x)
- Motor inicial con base de nodos `Person`, `Union`, `Source`, `Note`, `Media`.
- Primeras implementaciones de procedencia en importacion GEDCOM.
- Integracion temprana de relaciones `ParentChild` y `Member`.

Este bloque es historico y no describe el estado operativo vigente.

## Ejemplo / Snippet
```typescript
/** Representacion interna minima de nodo Person */
{
  uid: "uuid-v4-123",
  type: "Person",
  sex: "M",
  isLiving: true,
  createdAt: "2026-03-02T00:00:00.000Z"
}
```

## Pendientes / Por definir
- CRDT sync distribuido sobre journal.
- Privacidad granular por procedencia/actor.

---
**Navegacion:**
[<- Anterior: README](./README.md) | [Siguiente: 02_formato ->](./02_formato.md)

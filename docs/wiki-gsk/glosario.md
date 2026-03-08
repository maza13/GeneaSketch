# Glosario de Terminos (Formato `.gsk` y Genraph)

## Proposito
Definir terminos operativos y contractuales usados en la wiki tecnica de GeneaSketch.

## Terminos
- **Append-Only:** Politica donde el journal solo agrega entradas nuevas.
- **Claim:** Unidad atomica de conocimiento en Genraph.
- **Citations (claim.citations[]):** Evidencia primaria inline por claim.
- **EvidenceRef:** Evidencia secundaria navegable como arista del grafo.
- **Fast-forward:** Recuperacion incremental que aplica solo operaciones faltantes del journal (`opSeq > graphDerivedFromOpSeq`).
- **Replay completo:** Reconstruccion total desde journal cuando `graph.json` no es usable.
- **GSK_CONFLICT|v1:** Protocolo de serializacion para claims alternas/no preferidas en flujos GEDCOM legacy.
- **Journal:** Registro de auditoria/recovery; no canon de carga normal.
- **Lifecycle:** Estado logico de claim (`active`, `retracted`).
- **Quality:** Estado epistemico de claim (`raw`, `reviewed`, `verified`, `disputed`).
- **Quarantine AST:** Estructura lossless para tags GEDCOM no mapeados.
- **schemaVersion:** Version del contrato estructural del formato `.gsk`.
- **SJP (Snapshot-Journal Parity):** Paridad esperada entre snapshot y replay del journal.
- **Golden:** Nivel de calidad en el que SJP, integridad y reglas de contrato pasan de forma determinista.

## Navegacion
[<- Anterior: CHANGELOG](./CHANGELOG.md) | [Siguiente: README ->](./README.md)

# Wiki del Formato `.gsk` (GeneaSketch Package)

## Resumen
El formato `.gsk` es el contenedor nativo de GeneaSketch para datos genealogicos.

## Nota de nomenclatura
- `Genraph` es el nombre oficial y actual del motor canonico.
- `Kindra` es el visual engine oficial.
- `Kindra v3.1` es la implementacion visual actual.
- `AncestrAI` es el subsystema IA oficial.

- **Version app (referencia):** `0.4.4`
- **Version de schema:** `0.4.0` (Hardened)
- **Canon de datos:** `graph.json`
- **Auditoria/recovery:** `journal.jsonl`

## Indice
1. [01_paradigma](./01_paradigma.md)
2. [02_formato](./02_formato.md)
3. [03_modelo](./03_modelo.md)
4. [04_operaciones](./04_operaciones.md)
5. [05_interoperabilidad_gedcom](./05_interoperabilidad_gedcom.md)
6. [06_versionado_y_migraciones](./06_versionado_y_migraciones.md)
7. [07_error_catalog](./07_error_catalog.md)
8. [CHANGELOG](./CHANGELOG.md)
9. [glosario](./glosario.md)

## Estado de confianza
| Documento | Estado | Fuente de verdad |
| :--- | :--- | :--- |
| [01_paradigma](./01_paradigma.md) | Hardened (0.4.0) | `src/core/genraph/types.ts` |
| [02_formato](./02_formato.md) | Hardened (0.4.0) | `src/core/genraph/GskPackage.ts` |
| [03_modelo](./03_modelo.md) | Hardened (0.4.0) | `src/core/genraph/types.ts` |
| [04_operaciones](./04_operaciones.md) | Hardened (0.4.0) | `src/core/genraph/Journal.ts` |
| [05_interoperabilidad_gedcom](./05_interoperabilidad_gedcom.md) | Hardened (0.4.0) | `src/core/genraph/GedcomBridge.ts` |
| [06_versionado_y_migraciones](./06_versionado_y_migraciones.md) | Hardened (0.4.0) | `src/core/genraph/LegacyMigrator.ts` |
| [07_error_catalog](./07_error_catalog.md) | Hardened (0.4.0) | `src/core/genraph/errorCatalog.ts` |

## Regla editorial de changelog
- `docs/wiki-gsk/CHANGELOG.md`: solo contrato `.gsk` + wiki tecnica.
- `docs/wiki-software/CHANGELOG.md`: cambios de UX/producto/documentacion de usuario.
- `CHANGELOG.md` raiz: release global publica y gating de build/About.

## Ejemplos canonicos del formato
- Ubicacion de paquetes reales: `docs/wiki-gsk/ejemplos/`
- Paquetes canonicos:
  - `basico.gsk`
  - `tipico.gsk`
  - `edgecases.gsk`
- Espejos legibles (derivados del zip): `docs/wiki-gsk/ejemplos/canon/`
  - `<nombre>.manifest.json`
  - `<nombre>.graph.json`
  - `<nombre>.journal.jsonl` (si aplica)
  - `<nombre>.quarantine.json` (si aplica)

## Regeneracion deterministica de ejemplos
Comando unico:

```bash
npx vite-node docs/wiki-gsk/ejemplos/generate_canonical_examples.ts
```

El script usa fixtures fijas (IDs, timestamps, createdAt y opSeq estables) y genera siempre el mismo output binario/documental.

## Gate anti-drift docs-runtime
- Paridad catalogo runtime/wiki: `src/tests/wiki.error-catalog-parity-docs.test.ts`
- Paridad catalogo GEDCOM-runtime: `src/tests/gedcom.error-catalog-parity.test.ts`
- Paridad operaciones wiki/types: `src/tests/wiki.genraph-operations-parity.test.ts`

## Navegacion
[Siguiente: 01_paradigma ->](./01_paradigma.md)


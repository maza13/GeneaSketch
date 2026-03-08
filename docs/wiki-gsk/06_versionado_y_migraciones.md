# 06. Versionado y Migraciones del Formato `.gsk`

## Fuentes de verdad (codigo)
- Migrador legacy: `src/core/genraph/LegacyMigrator.ts`
- Version de schema activa en grafo/runtime: `src/core/genraph/GenraphGraph.ts`
- Politica de import: `src/core/genraph/GskPackage.ts`

## Estado de confianza
- **Estado:** Contrato 0.5.0 activo en runtime de export/import

## Proposito
Definir la evolucion de `schemaVersion`, criterios de bump y reglas de compatibilidad/migracion.

## Politica SemVer
- Patch (`x.y.Z`): hardening compatible (sin ruptura de contrato).
- Minor (`x.Y.0`): cambio importante de formato con migracion controlada.
- Major (`X.0.0`): incompatibilidad fuerte de contrato.

## Contrato actual
- `schemaVersion` contractual del estandar `.gsk`: `0.5.0` (core-only).
- Runtime/export operativo: emite `0.5.0` y no incluye `meta/*`.
- Version de app se versiona por separado (`package.json`).

## Reglas de compatibilidad
- `schemaVersion >= 0.5.0`:
  - `meta/*` queda fuera de contrato publico.
  - Import strict/audit falla con `CORE_META_FORBIDDEN` si `meta/*` aparece.
  - Import compat emite warning y descarta `meta/*`.
- `schemaVersion < 0.5.0`:
  - `meta/*` se trata como extension legacy tolerada.
  - Import emite `LEGACY_META_EXTENSION_DETECTED` y mantiene compatibilidad temporal.
- Versiones anteriores solo se abren si existe regla explicita en `LegacyMigrator.ts`.

## Politica transitoria (`0.5.x`) y corte planificado (`0.6.0`)
- En `0.5.x`, la compatibilidad legacy (`schemaVersion < 0.5.0`) se mantiene en modo transitorio:
  - `meta/*` se tolera solo como fallback de lectura para continuidad.
  - No se introduce en esta fase una migracion dedicada `legacy meta -> perfil local`.
  - La persistencia local que ocurra por autosave general de app no se considera migracion contractual.
- En `0.6.0`, se planifica **corte total sin retrocompatibilidad** para rutas legacy (`<0.5.0`), segun el track de ejecucion diferido.

## Nota normativa sobre comparacion de versiones
La comparacion de `schemaVersion` debe ser SemVer parseado por componentes numericos.
No usar comparacion lexicografica simple de strings.

## Checklist de cambio de schema
1. Definir tipo de bump (patch/minor/major).
2. Actualizar `schemaVersion` solo si aplica.
3. Implementar migracion cuando corresponda.
4. Actualizar tests golden/strict/regresion.
5. Documentar en wiki tecnica + changelog tecnico.
6. Verificar import/export GEDCOM.

## Navegacion
[<- Anterior: 05_interoperabilidad_gedcom](./05_interoperabilidad_gedcom.md) | [Siguiente: 07_error_catalog ->](./07_error_catalog.md)


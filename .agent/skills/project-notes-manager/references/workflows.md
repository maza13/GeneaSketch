# Workflows v3

## 1) Crear Nota/Idea

1. Definir `kind=idea|note`.
2. Completar titulo y metadatos minimos.
3. Ejecutar:
   - `npm run notes:new -- --kind idea --title "..."`
   - `npm run notes:validate`
   - `npm run notes:index`

## 2) Actualizar Nota

1. Ajustar metadata o secciones segun contexto tecnico.
2. Registrar motivo en Evolution Log.
3. Ejecutar:
   - `npm run notes:update -- --note N0001 --reason "..."`
   - `npm run notes:validate`
   - `npm run notes:index`

## 3) Archivar Nota

Usar archivo logico, no borrado:
- `npm run notes:archive -- --note N0001 --reason obsolete`

## 4) Reportes por Nivel (superficiales y read-only)

- `summary`:
  - `npm run notes:summary -- [--focus N0001|slug] [--list] [--save]`
  - Solo usa notas activas.
  - No consulta TODO, changelog ni estado del repo.
  - No modifica notas ni registry.

- `analysis`:
  - `npm run notes:analysis -- [--focus N0001|slug] [--list] [--save]`
  - Usa notas activas + changelog.
  - No consulta TODO ni estado del repo.
  - No modifica notas ni registry.

- `deep-analysis`:
  - `npm run notes:deep-analysis -- [--focus N0001|slug] [--list] [--save]`
  - Usa notas activas + changelog + TODO.
  - No consulta estado del repo.
  - No modifica notas ni registry.

Regla de corte:
- `--no-apply` esta retirado en analisis.
- `--auto-capture` esta retirado en deep-analysis.

## 5) Captura Automatizada por Intencion (separada de analisis)

Cuando el usuario expresa ideas/dudas/propuestas:

1. Ejecutar `notes:capture`.
2. El sistema decide `create` o `update` por dedupe.
3. Notificar siempre:
   - `CREATED <id>` o `UPDATED <id>`.

Comando:
- `npm run notes:capture -- --text "..." [--context "..."]`

## 6) Migracion y Salud del Sistema

- Migracion de esquema/slugs a v2:
  - `npm run notes:migrate-v2`
- Diagnostico/reparacion de codificacion:
  - `npm run notes:doctor`
  - `npm run notes:doctor -- --no-apply` (solo diagnostico)

## 7) Promocion a TODO (Controlada)

1. Propuesta:
   - `npm run notes:promote -- --note N0001`
2. Ejecucion explicita:
   - `npm run notes:promote -- --note N0001 --execute --confirm`
3. Reglas:
   - siempre usa template de `file-todos`
   - validacion TODO escopada a archivos creados
   - nota se archiva con `archive_reason=promoted`
   - registrar `promoted_todos` + `related_todos`

---
name: project-notes-manager
description: Opera el sistema paralelo de notas del proyecto en `notes/` (ideas y notas, no tareas ejecutables), con validacion, indexado, captura automatica por intencion, analisis multinivel (`summary`, `analysis`, `deep-analysis`), foco por nota y promocion controlada a TODO usando siempre `file-todos`. Usa esta skill cuando el usuario pida registrar ideas/notas/dudas, revisar relevancia contextual, actualizar o archivar notas, generar reportes de estado, o convertir notas en TODOs.
---

# Project Notes Manager v3

Sistema de referencia estrategica para ideas y notas del proyecto.

## Reglas Base

1. `kind` en notas solo puede ser `idea|note`.
2. Tareas ejecutables viven en `todos/` con `file-todos`.
3. No borrar notas automaticamente; archivar.
4. Captura automatica permitida por intencion detectada, con notificacion obligatoria.
5. Promocion a TODO solo bajo intencion de ejecucion explicita.
6. Toda promocion usa template de `file-todos`.
7. Los comandos de analisis (`summary`, `analysis`, `deep-analysis`) son read-only por defecto y no mutan notas ni registry (excepto `--save` para guardar reporte).

## Contrato de Datos

Antes de crear/editar notas, leer:
- [references/schema.md](./references/schema.md)

## Flujos Operativos

Para ejecucion diaria y promocion:
- [references/workflows.md](./references/workflows.md)

## CLI Disponible

- `npm run notes:validate`
- `npm run notes:index`
- `npm run notes:new -- --kind idea --title "..."`
- `npm run notes:update -- --note N0001 ...`
- `npm run notes:archive -- --note N0001 --reason obsolete`
- `npm run notes:summary -- [--focus N0001|slug] [--list] [--save]`
- `npm run notes:analysis -- [--focus N0001|slug] [--list] [--save]`
- `npm run notes:deep-analysis -- [--focus N0001|slug] [--list] [--save]`
- `npm run notes:capture -- --text "..."`
- `npm run notes:migrate-v2`
- `npm run notes:doctor`
- `npm run notes:promote -- --note N0001` (propuesta)
- `npm run notes:promote -- --note N0001 --execute --confirm` (ejecucion)

Contrato operativo de persistencia:
- `notes:new`, `notes:update`, `notes:archive`, `notes:capture` y `notes:promote` deben dejar commit automatico cuando mutan estado persistente.
- Si el stage o el commit fallan, la mutacion debe revertirse en disco.
- `notes:promote` debe incluir en el commit la nota fuente, `notes/index/registry.json` y los TODOs generados.
- Los slugs de notas/TODOs promovidos deben truncarse de forma estable y sin cortes torpes cuando sea posible.

## Niveles de Analisis (superficiales)

- `summary`: solo notas activas.
- `analysis`: notas activas + changelog.
- `deep-analysis`: notas activas + changelog + TODO.

Todos soportan `--focus` para salida focalizada sin perder contexto global.

Notas de corte:
- `--no-apply` retirado en analisis.
- `--auto-capture` retirado en deep-analysis.

## Captura y Actualizacion Automatica por Intencion

Cuando el usuario expresa ideas, dudas o propuestas:
1. Evaluar si corresponde capturar senal.
2. Ejecutar `notes:capture`.
3. Reportar explicitamente `CREATED <id>` o `UPDATED <id>`.
4. Si la idea ya existe, preferir actualizacion con dedupe.

## Integracion con TODO (`file-todos`)

`notes:promote`:
1. Genera propuesta (simple o compleja).
2. Solo crea TODOs con `--execute --confirm`.
3. Crea TODOs desde template `file-todos`.
4. Ejecuta validacion TODO escopada.
5. Archiva la nota promovida y persiste vinculos `promoted_todos`.
6. Para notas complejas, la seccion recomendada es `## Promotion Blocks`.
7. Si una nota compleja define `## Promotion Blocks`, cada bullet se convierte en un child TODO con titulo corto y slug limpio.
8. Si una nota compleja no define `## Promotion Blocks`, `notes:promote` crea solo la tarea umbrella por defecto.

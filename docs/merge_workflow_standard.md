# Merge Workflow Standard

## Objetivo
Definir un flujo unico, seguro y facil de usar para fusion de archivos/personas, con reglas deterministas de IDs, matching, conflictos y aplicacion final.

## Principios
- Conservar IDs cuando sea posible.
- Renombrar IDs solo en colision real no equivalente.
- Auto-match solo con alta confianza y unicidad.
- Resolver conflictos de persona y familia de forma explicita.
- No permitir finalizar con conflictos criticos pendientes.
- Canon interno de salida para merge: `GSZ + GED 7.0.x`.

## Flujo Wizard (obligatorio)
1. Coincidencias.
2. Conflictos de personas.
3. Conflictos de familias.
4. Vista previa.
5. Aplicar.

## Reglas de ID y trazabilidad
- `DataDiff.idRemap.persons` guarda el mapeo `incomingId -> finalId`.
- `DataDiff.idRemap.families` guarda el mapeo `incomingId -> finalId`.
- Si no hay colision, el ID entrante se conserva.
- Si hay colision y no es la misma entidad, se genera nuevo ID libre de colision.
- Todo renombrado debe mostrarse en preview final.
- Registrar `importProvenance` (archivo, formato, version fuente, fecha) en el documento final.

## Matriz de formatos/versiones
- Entrada soportada: `.ged`, `.gdz`, `.gsz`.
- `.gsz`: formato nativo actual.
- `.gdz`: alias legacy de importacion.
- GED fuente soportado: `5.5`, `5.5.1`, `7.0.x` (tolerante para unknown con warnings).
- Salida de merge normalizada: `sourceFormat=GSZ`, `gedVersion=7.0.x`.

## Matching conservador
- `high` confianza puede auto-confirmarse.
- Ambiguos siempre quedan para revision manual.
- Many-to-one automatico no permitido; se degrada a ambiguo.
- La UI debe mostrar senales de score y confianza con detalle contextual.

## Conflictos de persona
- Campos conflictivos: nombre, apellido, sexo, estado de vida.
- Eventos conflictivos: mismo tipo con fecha/lugar divergente.
- Eventos no conflictivos se agregan como `newEvents`.
- Cada conflicto requiere resolucion `keep_base` o `accept_incoming`.

## Conflictos de familia
- Conyuges (`husbandId`, `wifeId`) conflictivos se resuelven explicitamente.
- Membresia de hijos conflictiva se resuelve por item.
- Eventos de familia conflictivos se resuelven por item.
- Altas limpias se mantienen en `newChildrenIds` y `newEvents`.

## Aplicacion y validacion
- Orden logico de apply:
  1. Personas.
  2. Familias.
  3. Reconciliacion cruzada de punteros (`famc`/`fams`) desde estructura de familias.
- Post-merge obligatorio:
  - Ejecutar analyzer estructural.
  - Exponer errores/warnings antes de confirmar cierre.
  - Mostrar bloque de compatibilidad y normalizacion en preview.

## Politica UX
- Superficie simple: etiquetas claras, pasos guiados, conteo de pendientes.
- Detalle en tarjetas contextuales (`ContextCard` + `ContextHoverAnchor`).
- Acciones masivas disponibles en secciones de conflicto.
- Busqueda y filtros por riesgo/confianza/ID/nombre.

## Fallbacks
- Datos faltantes: usar `N/D` o `No documentado`.
- Si hay conflicto critico pendiente, no avanzar al paso siguiente.
- Si hay errores estructurales post-merge, advertir antes de aplicar.

## No-regresion
- No romper flujo de import normal (`openFile`) ni contrato de `onApply`.
- Mantener merge determinista para mismos insumos y mismas decisiones.

# UI Rebuild Baseline (Shell V6)

Fecha: 2026-02-28
Fuente técnica: `dist/assets/index-Bcb38aXV.js` + componentes actuales en `src/ui`, `src/views`.

## Inventario funcional objetivo (paridad)

1. Topbar con menús:
- `Archivo`
- `Edit`
- `Vista`
- `Herramientas`
- `Avanzado`
- `External`
- `Help`

2. Layout tri-panel:
- Panel izquierdo (`LeftPanel`)
- Canvas central (`DTreeView`)
- Panel derecho conmutado (`RightPanel` / `TimelineRightPanel`)

3. Flujos Archivo:
- Nuevo árbol
- Abrir `.ged/.gdz/.gsz`
- Importar para fusión / reemplazo
- Recientes
- Guardar GSZ
- Exportar GED 7.0.3 / GED 5.5.1 / GSZ / PDF / PNG / JPG

4. Flujos Edit/IA:
- Editar persona
- Agregar familiar
- IA local/global
- Configuración IA
- Deshacer último lote IA

5. Vista:
- Fit a pantalla
- Tema claro/oscuro
- Color theme menu
- Panel details/timeline
- Alcance timeline (visible/all)
- Vista timeline (list/scale)
- Motor layout (vnext/v2/legacy)

6. Herramientas:
- Diagnóstico
- Estadísticas de persona
- Estadísticas globales
- Limpiar posiciones

7. Avanzado:
- Generadores de escenarios
- Mock tools panel

8. Integraciones y modales:
- Merge review (`ImportReviewPanel` + `MergeReviewErrorBoundary`)
- `PersonEditorPanel`
- `PersonDetailPanel`
- `PersonPickerModal`
- `BranchExtractionModal`
- `NodeActionMenu`
- `AiAssistantModal`
- `AiSettingsModal`
- `AboutReleaseModal`
- `FamilySearchPanel`

9. Banners/estado:
- Restore de sesión
- Advertencias de export legacy
- Banner de undo IA
- Barra de estado

## Criterio de reconstrucción

- Paridad funcional primero, refactor visual después.
- Sin pérdida de entradas/acciones históricas.
- Compatibilidad con snapshots legacy mantenida vía `store`.


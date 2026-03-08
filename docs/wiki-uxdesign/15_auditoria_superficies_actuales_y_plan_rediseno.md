# 15 - Auditoría de superficies actuales y plan de rediseño

## 15.1 Propósito

Este capítulo ejecuta la fase de auditoría previa al rediseño conceptual.

Su función es:
- inventariar las superficies actuales
- clasificar cada una dentro de la arquitectura UX objetivo
- detectar solapes y deuda de interacción
- dejar una guía concreta para la futura fase de wireframes y rediseño visual

Este documento complementa y operacionaliza el capítulo 14.

---

## 15.2 Lectura general del estado actual

La interfaz actual ya tiene suficiente capacidad funcional, pero está distribuida en demasiadas superficies con responsabilidades parcialmente solapadas.

Diagnóstico general:
- el canvas y el árbol sí son el centro real del producto
- la inspección rápida de persona ya existe y funciona como patrón base
- la edición y el trabajo profundo de persona están duplicados o dispersos
- el análisis está mezclado entre capas del árbol, panel izquierdo, timeline y paneles auxiliares
- varias utilities viven cerca del flujo principal sin una jerarquía UX lo bastante clara

Problema principal:
- hoy la interfaz mezcla `inspección`, `edición`, `trabajo profundo`, `análisis` y `utilities` en más superficies de las necesarias

---

## 15.3 Inventario de superficies actuales

| Superficie actual | Familia futura | Trigger actual dominante | Rol real hoy | Conflicto actual | Destino recomendado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `RightPanel` | Inspector | Selección de persona | lectura rápida + acciones rápidas | compite parcialmente con editor y workspace | **Mantener** como Inspector oficial |
| `PersonDetailPanel` | Editor | editar persona / agregar relación | edición puntual de persona o relación | nombre ambiguo; parece ficha más que editor | **Mantener y renombrar conceptualmente** como Editor |
| `PersonWorkspacePanel` | Workspace | abrir ficha/expediente | trabajo profundo por persona | duplicado con V3 | **Retirar o fusionar** |
| `PersonWorkspacePanelV3` | Workspace | abrir expediente/flujo profundo | trabajo profundo por persona | coexistencia con workspace anterior | **Mantener como base oficial** |
| `LeftPanel` | View / Analysis Controls | persistente en layout principal | mezcla controles de árbol, capas y canvas | demasiado genérico | **Redefinir** |
| `LayerPanel` | Analysis Controls | sección dentro de LeftPanel | control de capas visuales y analíticas | no se siente como sistema oficial de análisis | **Absorber en el nuevo carril de análisis** |
| `ShellTimelineRightPanel` | Analysis auxiliary | timeline abierto | análisis temporal y navegación de presencia | se apila con inspector en el mismo carril derecho | **Mantener, pero integrarlo al sistema de análisis** |
| `ShellDiagnosticPanel` | Analysis auxiliary | abrir diagnóstico | inspección y reparación del grafo | parece utility técnica aislada | **Mantener como panel auxiliar de análisis** |
| `ShellGlobalStatsPanel` | Analysis auxiliary | abrir stats globales | lectura estadística global | separado del resto del análisis | **Mantener e integrar a Analysis** |
| `ShellPersonStatsPanel` | Analysis auxiliary | abrir stats por persona | análisis individual | compite con workspace profundo | **Mantener, pero subordinado al modo análisis** |
| `ShellSearchCenterPanel` | Navigation utility | comando de búsqueda | localización rápida de personas/relaciones | ninguna crítica; es transversal | **Mantener** como utility transversal |
| `NodeActionMenu` | Contextual action layer | click contextual en nodo | acciones contextuales del árbol | correcto; solo requiere alineación con triggers futuros | **Mantener** |
| `ImportReviewPanel` | Work utility | importar y revisar | revisión/merge activo | no debe competir con persona/análisis | **Mantener como utility de trabajo** |
| `ShellBranchExtractionModal` | Work utility | exportar rama | extracción operativa | correctamente separado, pero no claramente clasificado | **Mantener** |
| `AiAssistantModal` | Contextual utility | lanzar IA | asistencia contextual | hoy su rol futuro no está explicitado del todo | **Mantener e integrar mejor** |
| `AiSettingsModal` | Utility settings | abrir ajustes IA | configuración técnica | correcto | **Mantener** |
| `WikiPanel` | Secondary utility | abrir wiki | referencia/documentación | correcto | **Mantener** |
| `AboutReleaseModalV3` | Secondary utility | abrir about | metadata de release | correcto | **Mantener** |
| `FamilySearchPanel` | Secondary utility | abrir integración externa | consulta/importación externa | correcto | **Mantener** |
| `PersonPickerModal` | Contextual utility | vincular persona existente | support flow de relaciones | correcto | **Mantener** |
| `MockToolsPanel` | Dev/test surface | abrir tools | tooling interno | no pertenece al modelo UX de usuario final | **Excluir del rediseño de producto** |

---

## 15.4 Conflictos UX detectados

### A. Superficies de persona duplicadas
- `RightPanel`, `PersonDetailPanel`, `PersonWorkspacePanel` y `PersonWorkspacePanelV3` ocupan el mismo territorio semántico de “ver o trabajar con una persona”
- esto obliga al usuario a inferir diferencias que la interfaz no expresa con suficiente claridad

### B. Análisis disperso
- capas del árbol, timeline, stats y diagnóstico no se presentan como una sola familia UX
- parte del análisis vive en el panel izquierdo, parte en overlays, parte en el stack derecho

### C. Panel izquierdo demasiado mezclado
- mezcla configuración del árbol, canvas tools y análisis
- hoy funciona, pero no comunica un modelo mental claro

### D. IA con rumbo correcto pero integración todavía difusa
- AncestrAI ya no es una utility menor
- pero tampoco debe dominar el shell
- necesita quedar claramente asociado al trabajo contextual sobre persona y árbol

---

## 15.5 Taxonomía operativa final

### 1. Inspector
- una sola superficie
- lectura rápida
- vive por defecto junto al árbol

### 2. Editor
- una sola superficie
- edición puntual e intencional
- no se abre por selección normal

### 3. Workspace
- una sola superficie profunda
- investigación, trabajo extendido e hipótesis futuras
- base elegida: `PersonWorkspacePanelV3`

### 4. Analysis
- sistema propio del árbol
- compuesto por:
  - capas visuales
  - modos analíticos
  - paneles auxiliares de análisis

### 5. Utilities
- search
- import/review
- merge
- branch export
- wiki/about
- FamilySearch
- AncestrAI

Regla:
- `Utilities` no define la arquitectura principal
- `Analysis` no reemplaza `Workspace`
- `Workspace` no reemplaza `Inspector`

---

## 15.6 Matriz de triggers objetivo

| Acción | Superficie objetivo | Comportamiento |
| :--- | :--- | :--- |
| click simple en persona | Inspector | selecciona y muestra lectura rápida |
| doble click en persona | Workspace | abre expediente profundo de persona |
| botón editar desde inspector | Editor | abre edición puntual |
| acción contextual “agregar relación” | Editor / flow contextual | abre edición orientada a relación |
| acción “abrir expediente” | Workspace | abre superficie profunda |
| activar capa/modo analítico | Analysis | cambia el modo del árbol sin abandonar canvas |
| abrir stats/diagnóstico | Analysis auxiliary | abre panel auxiliar de análisis |
| lanzar AncestrAI desde persona | Utility contextual | abre AncestrAI con contexto de persona |
| lanzar AncestrAI desde workspace | Utility contextual | abre AncestrAI con contexto profundo |
| importar/revisar/merge | Work utility | abre flow operativo fuera del núcleo de persona |

Decisión clave:
- la selección de persona nunca abre el editor directamente

---

## 15.7 Reglas de coexistencia objetivo

### Puede coexistir
- canvas + inspector
- canvas + analysis mode
- inspector + analysis mode
- workspace + AncestrAI
- analysis mode + panel auxiliar de análisis

### No debe coexistir como flujo principal
- dos workspaces de persona a la vez
- editor y workspace profundo como superficies principales simultáneas sobre la misma persona
- inspector creciendo hasta comportarse como workspace

### Reglas de reemplazo
- abrir Workspace no destruye la selección actual; la profundiza
- abrir Editor suspende el flujo de inspección, pero no cambia el foco del árbol
- activar Analysis no debe cerrar el Inspector por defecto
- abrir utilities secundarias no debe redefinir el modo principal salvo que sean workflows de trabajo explícitos

### Estado recordado
- última pestaña del Workspace profundo
- última configuración de análisis/capas
- estado de layout del shell

### Estado no recordado globalmente como comportamiento principal
- editor modal abierto
- acciones contextuales transitorias

---

## 15.8 Integración futura de AncestrAI

AncestrAI debe operar como utility contextual de alto valor.

### Dónde se invoca
- desde el Inspector
- desde el Workspace
- desde algunos workflows operativos del árbol

### Cómo consume contexto
- persona seleccionada
- documento actual
- foco del árbol
- contexto profundo del Workspace cuando exista

### Qué no debe ser
- un panel permanente dominante
- la puerta principal de la app
- una capa visual del modo análisis

### Lugar de las hipótesis futuras
- pertenecen al Workspace o a un flow de trabajo lanzado desde él
- no al inspector rápido
- no al análisis visual del árbol

---

## 15.9 Decisiones ejecutivas para la siguiente fase

1. Consolidar `RightPanel` como Inspector oficial.
2. Consolidar `PersonDetailPanel` como Editor oficial.
3. Consolidar `PersonWorkspacePanelV3` como Workspace oficial.
4. Marcar `PersonWorkspacePanel` como legacy y planear su retiro/fusión.
5. Redefinir `LeftPanel` como `View / Analysis Controls`.
6. Tratar timeline, stats y diagnóstico como parte del sistema de análisis.
7. Mantener AncestrAI como utility contextual integrada al trabajo genealógico.

---

## 15.10 Qué queda listo para la fase de wireframes

Con esta auditoría ya queda listo:
- el mapa de superficies
- la taxonomía UX
- la matriz de triggers
- las reglas de coexistencia
- la posición futura de AncestrAI

La siguiente fase ya no debe volver a discutir estas bases; debe entrar directamente a:
- wireframes conceptuales
- layout de paneles
- jerarquía visual
- priorización de aperturas y cierres

---

## Navegación
[<- 14_rediseno_conceptual_interfaz_genealogica](./14_rediseno_conceptual_interfaz_genealogica.md) | [Volver a README ->](./README.md)

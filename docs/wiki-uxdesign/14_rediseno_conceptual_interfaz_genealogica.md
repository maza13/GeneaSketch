# 14 - Rediseño conceptual de la interfaz genealógica

## 14.1 Propósito

Este capítulo fija la definición conceptual previa al rediseño de la interfaz.

No describe todavía una implementación visual final. Su función es dejar cerrada la arquitectura UX que debe guiar cualquier rediseño posterior de paneles, modos, overlays y superficies de trabajo.

Este capítulo es de lectura obligatoria antes de:
- rediseñar paneles de persona
- redefinir modos del árbol
- mover o fusionar superficies de análisis
- cambiar el rol de AncestrAI en la interfaz

La auditoría operativa que ejecuta este marco vive en `15_auditoria_superficies_actuales_y_plan_rediseno.md`.

---

## 14.2 Principio rector

GeneaSketch debe sentirse primero como una app de genealogía.

Esto implica:
- el árbol y la exploración familiar son la experiencia principal
- la edición es importante, pero no debe dispararse por accidente
- el análisis extiende la lectura genealógica, no la reemplaza
- AncestrAI es un compañero contextual relevante, no el centro de la experiencia

Regla de oro:
- seleccionar no significa editar
- analizar no significa salir del árbol
- trabajar en profundidad debe ser intencional

---

## 14.3 Arquitectura UX objetivo

La interfaz futura debe organizarse en tres modos de experiencia:

### A. Modo árbol normal
- es el estado por defecto
- canvas de Kindra v3.1 al centro
- inspector rápido a la derecha
- controles de vista y capas a la izquierda
- búsqueda y navegación como apoyo transversal

### B. Modo análisis
- reutiliza el mismo árbol como base
- activa capas o modos analíticos sobre el canvas
- no debe reemplazar al flujo principal de persona

Ejemplos:
- consanguinidad
- coloreo geográfico
- diagnóstico crítico
- timeline analítico

### C. Modo trabajo/modificación
- concentra edición, revisión profunda e investigación activa
- se activa por acción explícita
- aloja el editor principal, el workspace profundo y futuras hipótesis asistidas

---

## 14.4 Superficies oficiales

### Inspector
Base actual: `RightPanel`

Rol:
- lectura rápida de la persona seleccionada
- identidad, vida, vínculos inmediatos y acciones rápidas

Debe:
- abrir por defecto al seleccionar una persona
- permitir editar, abrir expediente, agregar o vincular relaciones

No debe:
- convertirse en una superficie de edición pesada
- crecer hacia tabs profundas

### Editor
Base actual: `PersonDetailPanel`

Rol:
- edición puntual y clara de persona o relación

Debe:
- ser la superficie principal y única de modificación directa
- dejar claro que se está editando

No debe:
- mezclarse con exploración profunda
- competir con el inspector por la lectura rápida

### Workspace
Base preferida: `PersonWorkspacePanelV3`

Rol:
- trabajo profundo por persona
- investigación extendida
- futura integración de hipótesis asistidas

Debe:
- abrirse por acción explícita desde inspector, editor o utility contextual

No debe:
- abrirse por selección normal
- coexistir indefinidamente con dos variantes activas

Decisión actual:
- `PersonWorkspacePanelV3` es la base preferida
- `PersonWorkspacePanel` queda como candidato a retiro o fusión

### Analysis Controls
Base actual: `LeftPanel` + `LayerPanel`

Rol:
- control de vista, capas y modos analíticos

Debe:
- dejar de ser un contenedor genérico
- convertirse en el carril oficial de vista y análisis

### Utilities
Incluye:
- ImportReview
- merge/review
- branch export
- Wiki
- About
- FamilySearch
- AncestrAI

Regla:
- las utilities no deben competir con Inspector, Editor o Workspace como flujo principal del árbol

---

## 14.5 Regla de AncestrAI

AncestrAI es un compañero contextual.

Eso significa:
- no vive como panel dominante permanente
- debe poder invocarse desde persona, selección o workspace
- consume contexto actual del árbol y de la persona
- su crecimiento futuro debe reforzar el trabajo genealógico, no desviar la app hacia un flujo assistant-first

Decisión de producto:
- las hipótesis asistidas por IA pertenecen al modo de trabajo/modificación
- deben vivir en el Workspace o en flujos contextuales nacidos desde él
- no pertenecen al Inspector rápido
- no pertenecen al modo análisis como capa visual del árbol

---

## 14.6 Entregables obligatorios antes de implementar el rediseño

Antes de tocar implementación visual, debe existir una definición explícita de:

1. Inventario de superficies actuales
- nombre actual
- rol real
- trigger de apertura
- conflicto o duplicación
- destino: mantener, fusionar, retirar o convertir

2. Taxonomía oficial
- Modo árbol normal
- Modo análisis
- Modo trabajo/modificación
- Inspector
- Editor
- Workspace
- Utilities

3. Matriz de triggers
- click
- doble click
- menú contextual
- editar
- abrir expediente
- activar análisis
- lanzar IA
- importar o revisar

4. Reglas de coexistencia
- qué puede vivir abierto a la vez
- qué reemplaza a qué
- qué bloquea a qué
- qué estado se recuerda

5. Ruta de integración de AncestrAI
- desde dónde se invoca
- cómo recibe contexto
- en qué superficies actúa
- dónde vivirá la futura hipótesis asistida

---

## 14.7 Criterios de aceptación conceptuales

La fase de definición se considera lista solo si:
- toda superficie actual cabe en una sola familia futura
- seleccionar persona siempre produce el mismo comportamiento por defecto
- existe un único editor principal
- existe un único workspace profundo
- el análisis se entiende como sistema del árbol
- AncestrAI queda visible como compañero contextual sin dominar la interfaz
- la app sigue sintiéndose ante todo como una herramienta de genealogía

---

## Navegación
[<- 13_kindra-v31-control-plane](./13_kindra-v31-control-plane.md) | [Volver a README ->](./README.md)

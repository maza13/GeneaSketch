# Análisis Profundo del Proyecto: GeneaSketch

**Fecha:** 26 de febrero de 2026  
**Analista:** Antigravity (AI)

---

## 1. Resumen Ejecutivo
GeneaSketch es una aplicación técnicamente ambiciosa con algoritmos de lógica de negocio (genealogía, genética e inferencia) de alta calidad. Sin embargo, sufre de una arquitectura de frontend saturada, con componentes principales y un almacén de estado (store) que exceden los límites de mantenibilidad recomendados. El proyecto se encuentra en una transición exitosa hacia un motor de layout basado en D3 que resuelve problemas complejos de grafos genealógicos.

---

## 2. Radiografía de Componentes Críticos

### 2.1. Lógica de Negocio y Algoritmos (Puntos Fuertes)
- **Cálculo de Consanguinidad (`kinship.ts`)**: Implementación robusta del método tabular para ADN compartido, manejando endogamia compleja de forma recursiva y eficiente (memoización).
- **Inferencia de Fechas (`dateInference.ts`)**: Una joya matemática. El uso de BFS para determinar cohortes generacionales y el pesaje por cercanía familiar para promediar fechas es una solución de ingeniería de alto nivel.
- **Nomenclatura (`nomenclature.ts`)**: Sistema de nombres de parentesco muy completo y extensible a través de `kinship_atlas.json`.
- **Motor de Layout V2 (`virtualTree.ts`, `solver.ts`)**: Excelente abstracción al convertir grafos bi-direccionales complejos en árboles virtuales para usar `d3-flextree`. El uso de "junctions" y post-procesamiento de coordenadas es ingenioso.

### 2.2. Deuda Técnica y Áreas de Mejora (Puntos Débiles)
- **Bloat de Componentes**:
    - `App.tsx` (~1400 líneas): Concentra lógica de I/O, menús, exportación y estado. Debe ser descompuesto en sub-componentes y hooks especializados.
    - `DTreeView.tsx` (~1500 líneas): La lógica de "Overlays" y estilos visuales está incrustada aquí. Debería moverse a un `useOverlayStyles` hook o un servicio de renderizado.
- **Almacén de Estado (`store.ts`)**:
    - (~1000 líneas). Es un "God Object". Contiene lógica de migración, normalización y casi toda la lógica de edición. Se recomienda dividir el store en porciones (slices) o mover la lógica de normalización a utilidades/servicios.
- **Persistencia y I/O (`parser.ts`)**:
    - El parser de GEDCOM es funcional pero **lossy** (pierde datos). Ignora tags desconocidos y muchos tipos de eventos (solo reconoce BIRT, DEAT, MARR, DIV). Esto impide que la aplicación sea un editor GEDCOM "full-fidelity".

---

## 3. Análisis de Código "Basura" y Reutilización
- **Código Redundante**: Se detectan funciones de utilidad (como regex de fechas o formateo de nombres) repetidas en `App.tsx`, `analyzer.ts` y `dateInference.ts`. Urge una librería de utilidades común en `src/utils/genealogy.ts`.
- **Lógica en UI**: Demasiada lógica de cálculo visual está dentro de los componentes React (`useMemo` gigantes en `DTreeView`). Esto dificulta las pruebas unitarias de la lógica visual.
- **CSS (`styles.css`)**: El archivo de estilos es grande y monolítico. Se recomienda migrar a CSS Modules o al menos dividir el CSS por componentes.

---

## 4. Sugerencias de Mejora Inmediata

1.  **Refactor del Store**: Dividir `AppState` en `DocumentSlice`, `ViewSlice` y `RecentFilesSlice`.
2.  **Extracción de Overlays**: Crear un sistema de plugins para las capas visuales (Heatmap, Endogamia, Advertencias) para que no ensucien el componente de vista principal.
3.  **Mejora del Parser**: Implementar un almacenamiento de "Unknown Tags" en el modelo de datos para asegurar que al exportar no se pierda información original del usuario.
4.  **Centralización de Inferencia**: El motor de `dateInference` es potente pero subutilizado. Podría integrarse más profundamente en el buscador y el diagnosticador.

---

## 5. Errores Detectados (Safe to Fix)
- **Reglas de Diagnóstico**: Un error de "Hijo anterior al padre" puede dispararse falsamente si las fechas estimadas tienen rangos muy amplios y no se manejan con lógica de incertidumbre en el comparador.
- **Layout de Cónyuges**: En casos de poliandria/poliginia extrema, el `enforceRootUnionSpacing` puede causar solapamientos visuales si el `personNodeWidth` no se ajusta dinámicamente.

---
*Fin del reporte.*

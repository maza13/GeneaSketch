---
status: complete
priority: p1
issue_id: "061"
tags: [ux, shell, left-panel, redesign]
dependencies: ["057"]
---

# Fase 2 — Rediseño Panel Izquierdo

Migrar `LeftPanel.tsx` al nuevo sistema de primitivos `.gs-panel`, reemplazar SVGs artesanales con Material Symbols, aplicar tokens UX-governor, y reservar espacio visual para funcionalidades futuras.

## Problem Statement

El panel izquierdo actual tiene:
- Clase `panel panel-left` con estilos ad-hoc
- SVGs inline para iconos de expand/collapse (artesanales, no del sistema de iconos)
- Headers de sección con clases propias (`.left-section`, `.left-section__header`) que no se comparten con el panel derecho
- Hack de `direction: rtl` / `direction: ltr` para scrollbar
- Sin espacio preparado para funcionalidades futuras (bookmarks, filtros, historial)

## Recommended Action

### A. Migrar estructura JSX

Reemplazar:
```jsx
<aside className="panel panel-left">
  <div className="panel-left-inner">
    <div className="panel-header-row">
      <h2>Capas y árbol</h2>
      ...
    </div>
    <section className="left-section">
      <header className="left-section__header">
```

Con:
```jsx
<aside className="gs-panel gs-panel--left">
  <div className="gs-panel-header">
    <span className="material-symbols-outlined gs-panel-header-icon">explore</span>
    <span className="gs-panel-header-title">Explorador</span>
    <div className="gs-panel-header-actions">...</div>
  </div>
  <div className="gs-panel-body">
    <div className="gs-panel-section gs-panel-section--open">
      <div className="gs-panel-section-header" onClick={...}>
        <span className="material-symbols-outlined">layers</span>
        <span>Capas de análisis</span>
        <span className="material-symbols-outlined gs-panel-section-chevron">expand_more</span>
      </div>
      <div className="gs-panel-section-body">
        ...contenido...
      </div>
    </div>
```

### B. Iconos Material Symbols para cada sección

| Sección | Icono actual | Icono nuevo |
|---|---|---|
| Capas de análisis | SVG chevron | `layers` |
| Configuración del árbol | SVG chevron | `account_tree` |
| Herramientas de lienzo | SVG chevron | `build` |
| Expand/Collapse all | SVG +/- | `unfold_more` / `unfold_less` |
| Chevron de sección | SVG custom | `expand_more` (animado 180deg) |

### C. Sliders rediseñados

Aplicar estructura wiki §7.8 a los controles de profundidad:
```jsx
<div className="gs-slider-row">
    <label className="gs-slider-label">Ancestros</label>
    <span className="gs-slider-value">{value}</span>
    <input type="range" className="gs-slider" ... />
</div>
```

### D. Slots futuros (espacio visual reservado)

Añadir al final del panel, después de "Herramientas de lienzo":

```jsx
<div className="gs-panel-section gs-panel-section--future">
    <div className="gs-panel-section-header">
        <span className="material-symbols-outlined">bookmark</span>
        <span>Favoritos</span>
        <span className="gs-panel-future-badge">Próximamente</span>
    </div>
</div>

<div className="gs-panel-section gs-panel-section--future">
    <div className="gs-panel-section-header">
        <span className="material-symbols-outlined">filter_list</span>
        <span>Filtros rápidos</span>
        <span className="gs-panel-future-badge">Próximamente</span>
    </div>
</div>

<div className="gs-panel-section gs-panel-section--future">
    <div className="gs-panel-section-header">
        <span className="material-symbols-outlined">history</span>
        <span>Historial</span>
        <span className="gs-panel-future-badge">Próximamente</span>
    </div>
</div>
```

### E. CSS

- Añadir `.gs-panel--left` con width `--shell-left-w`, border-right `--shell-panel-border`
- Añadir `.gs-slider-row`, `.gs-slider-label`, `.gs-slider-value`, `.gs-slider`
- Añadir `.gs-panel-future-badge` (pill, font 9px, bg subtle, texto "Próximamente")
- Eliminar hack `direction: rtl/ltr`, usar `scrollbar-gutter: stable` en su lugar
- NO eliminar las clases viejas aún (coexistencia temporal)

## Acceptance Criteria

- [x] Panel izquierdo usa clases `.gs-panel*`
- [x] Todos los iconos son Material Symbols (cero SVG artesanal)
- [x] Las 3 secciones se colapsan/expanden con animación suave en el chevron
- [x] Los sliders usan la nueva estructura `.gs-slider-row`
- [x] Los 3 slots futuros son visibles con opacity reducida y badge "Próximamente"
- [x] Scrollbar thin funciona sin el hack rtl/ltr
- [x] El toggle de panel (show/hide desde el canvas) sigue funcionando
- [x] `tsc --noEmit` limpio
- [x] Los 3 temas renderizan correctamente

## Files to Modify

- `src/ui/LeftPanel.tsx`
- `src/styles.css`

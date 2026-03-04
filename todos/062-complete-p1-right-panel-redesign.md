---
status: complete
priority: p1
issue_id: "062"
tags: [ux, shell, right-panel, redesign]
dependencies: ["057"]
---

# Fase 3 — Rediseño Panel Derecho

Migrar `RightPanel.tsx` al sistema `.gs-panel`, unificar iconos con Material Symbols, y reservar espacio visual para funcionalidades futuras de investigación genealógica.

## Problem Statement

El panel derecho tiene:
- Clases `.panel-right`, `.panel-right-stack` con estilos propios distintos al panel izquierdo
- Uso inconsistente de iconos (mix de SVGs y strings Unicode)
- Sin espacio visual para funcionalidades futuras como notas rápidas, fuentes vinculadas o hipótesis de investigación
- El acoplamiento con `TimelineRightPanel` complica la estructura

## Recommended Action

### A. Migrar estructura JSX

```jsx
<aside className="gs-panel gs-panel--right">
    <div className="gs-panel-header">
        <span className="material-symbols-outlined gs-panel-header-icon">person</span>
        <span className="gs-panel-header-title">Detalles</span>
        <div className="gs-panel-header-actions">
            <button className="gs-panel-action-btn" title="Colapsar">
                <span className="material-symbols-outlined">chevron_right</span>
            </button>
        </div>
    </div>
    <div className="gs-panel-body">
        ...secciones de persona...
    </div>
</aside>
```

### B. Secciones de familiares con iconos

| Sección | Icono Material Symbol |
|---|---|
| Padres | `escalator_warning` |
| Parejas | `favorite` |
| Hijos | `child_care` |
| Datos personales | `badge` |
| Eventos | `event` |

### C. Acciones por persona con iconos

| Acción | Icono actual | Icono nuevo |
|---|---|---|
| Ver detalle | Emoji 👁 u ojo SVG | `visibility` |
| Editar | Emoji ✏ | `edit` |
| Expandir en workspace | Emoji | `open_in_new` |
| Desvincular | Emoji 🔗 | `link_off` |

### D. Slots futuros (espacio visual reservado)

Añadir después de las secciones de familiares:

```jsx
<div className="gs-panel-divider" />

<div className="gs-panel-section gs-panel-section--future">
    <div className="gs-panel-section-header">
        <span className="material-symbols-outlined">sticky_note_2</span>
        <span>Notas rápidas</span>
        <span className="gs-panel-future-badge">Próximamente</span>
    </div>
</div>

<div className="gs-panel-section gs-panel-section--future">
    <div className="gs-panel-section-header">
        <span className="material-symbols-outlined">source</span>
        <span>Fuentes vinculadas</span>
        <span className="gs-panel-future-badge">Próximamente</span>
    </div>
</div>

<div className="gs-panel-section gs-panel-section--future">
    <div className="gs-panel-section-header">
        <span className="material-symbols-outlined">psychology</span>
        <span>Hipótesis</span>
        <span className="gs-panel-future-badge">Próximamente</span>
    </div>
</div>
```

### E. Compatibilidad con Timeline

El `TimelineRightPanel` se mantiene como companion panel. La estructura `.panel-right-stack` / `right-panel-stack` sigue existiendo para apilar Details + Timeline, pero usando los nuevos primitivos para los headers.

### F. CSS

- `.gs-panel--right` con width `--shell-right-w` (340px), border-left `--shell-panel-border`
- `.gs-panel-action-btn` reutilizable en ambos paneles
- Consistencia visual con panel izquierdo (mismo header height, mismos radii, mismos colores)

## Acceptance Criteria

- [x] Panel derecho usa clases `.gs-panel*`
- [x] Todos los iconos son Material Symbols
- [x] Secciones de familiares tienen iconos consistentes
- [x] Acciones por persona usan iconos Material Symbols
- [x] Los 3 slots futuros son visibles con badge "Próximamente"
- [x] Timeline embedded sigue funcionando en el stack
- [x] Toggle de panel (show/hide) sigue funcionando
- [x] Ambos paneles (izq+der) se ven simétricos y profesionales
- [x] `tsc --noEmit` limpio
- [x] Los 3 temas renderizan correctamente

## Files to Modify

- `src/ui/RightPanel.tsx`
- `src/styles.css`

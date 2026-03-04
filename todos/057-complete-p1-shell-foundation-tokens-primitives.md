---
status: complete
priority: p1
issue_id: "057"
tags: [ux, shell, css, tokens, foundation]
dependencies: []
---

# Fase 0 — Shell Foundation: Tokens y Primitivos CSS

Crear la capa base de tokens CSS y clases primitivas reutilizables que todas las fases posteriores del rediseño del shell usarán. Esto incluye tokens dimensionales del shell y un sistema unificado de panel (`gs-panel`).

## Problem Statement

Actualmente los paneles (`.panel`, `.panel-left`, `.left-section`, `.panel-right`, etc.) usan estilos ad-hoc con valores hardcodeados, sin tokens dimensionales para el shell, y sin un sistema de clases reutilizable. Cada panel tiene su propia convención de header, body y secciones colapsables. Esto dificulta mantener consistencia visual y crear nuevas vistas/pantallas.

## Recommended Action

### A. Tokens de Shell en `:root`

Añadir al bloque `:root` de `src/styles.css`:

```css
--shell-topbar-h: 44px;
--shell-footer-h: 28px;
--shell-left-w: 280px;
--shell-left-collapsed-w: 0px;
--shell-right-w: 340px;
--shell-right-collapsed-w: 0px;
--shell-panel-border: var(--line);
```

### B. Primitivos de Panel

Crear bloque CSS `/* ── Shell Panel Primitives ──*/` con las siguientes clases:

| Clase | Propósito |
|---|---|
| `.gs-panel` | Base: flex column, overflow hidden, bg `--bg-panel`, height 100% |
| `.gs-panel-header` | 40px, flex row, sticky top, gap 8px, border-bottom `--line-soft` |
| `.gs-panel-header-icon` | 18px Material Symbol, color `--gs-ink-muted` |
| `.gs-panel-header-title` | font-ui 13px/700, color `--gs-ink-primary`, flex:1 |
| `.gs-panel-header-actions` | flex row, gap 4px |
| `.gs-panel-body` | flex:1, overflow-y auto, padding 12px, scrollbar thin |
| `.gs-panel-section` | Sección colapsable: margin-bottom 2px |
| `.gs-panel-section-header` | flex row, cursor pointer, padding 8px 12px, gap 8px, hover highlight |
| `.gs-panel-section-chevron` | 14px, transition rotate 180ms |
| `.gs-panel-section--open .gs-panel-section-chevron` | transform rotate(180deg) |
| `.gs-panel-section-body` | overflow hidden, transition max-height/opacity 180ms |
| `.gs-panel-section--open .gs-panel-section-body` | max-height none, opacity 1 |
| `.gs-panel-section--closed .gs-panel-section-body` | max-height 0, opacity 0 |
| `.gs-panel-section--future` | opacity 0.35, pointer-events none, label "Próximamente" |
| `.gs-panel-divider` | 1px solid `--line-soft`, margin 4px 12px |

### C. Theme Overrides

- `[data-theme="light"]` — fondos claros, bordes oscuros suaves
- `[data-theme="warm"]` — tonos pergamino
- `@media (prefers-reduced-motion: reduce)` — sin transiciones

## Acceptance Criteria

- [x] Los tokens `--shell-*` existen en `:root` sin conflicto con tokens existentes
- [x] Las clases `.gs-panel*` están definidas y documentadas con comentarios
- [x] Los 3 temas (dark/light/warm) tienen overrides
- [x] `tsc --noEmit` ejecuta sin errores nuevos
- [x] El dev server (`npm run dev`) arranca sin errores
- [x] Las clases antiguas (`.panel`, `.left-section`, etc.) NO se eliminan aún — coexisten

## Files to Modify

- `src/styles.css` (bloque `:root` + nuevo bloque de primitivos)

## Work Log

- **2026-03-04**: 
  - Se agregaron los tokens direccionales del shell al archivo `styles.css` en la raíz `:root` y los overrides necesarios para `[data-theme="light"]`.
  - Se introdujeron los primitivos `.gs-panel`, su header respectivo, body y layout de control para secciones colapsables (body/chevron con animaciones).
  - Se agregó soporte explícito para `@media (prefers-reduced-motion: reduce)` suprimiendo transiciones molestas.
  - La suite de `vitest` pasó exitosamente sin afectación de UI base.

## Dependencies

Ninguna — esta es la raíz de la cadena.

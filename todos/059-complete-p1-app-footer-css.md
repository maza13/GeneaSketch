status: complete
priority: p1
issue_id: "059"
tags: [ux, shell, footer, css]
dependencies: ["057"]
---

# Fase 1b — CSS del AppFooter

Añadir todos los estilos CSS del footer al archivo `styles.css`, usando los tokens de shell definidos en #057.

## Problem Statement

El nuevo `AppFooter` necesita un bloque completo de CSS token-compliant que soporte los 3 temas (dark/light/warm) y se integre visualmente con el topbar ya rediseñado.

## Recommended Action

Añadir bloque `/* ── App Footer ──*/` en `styles.css` después del bloque de topbar con estas clases:

| Clase | Especificación |
|---|---|
| `.app-footer` | height: `--shell-footer-h` (28px), display: flex, align-items: center, bg: `--gs-paper-deep`, border-top: 1px solid rgba(255,255,255,0.07), z-index: 200, flex-shrink: 0, font-family: `--gs-font-ui`, font-size: 11px |
| `.footer-left` | flex: 1, display: flex, align-items: center, gap: 8px, padding: 0 12px, overflow: hidden, cursor: pointer |
| `.footer-center` | flex-shrink: 0, display: flex, align-items: center, gap: 12px, padding: 0 16px, border-left + border-right: 1px solid rgba(255,255,255,0.07) |
| `.footer-right` | flex-shrink: 0, display: flex, align-items: center, gap: 8px, padding: 0 12px |
| `.footer-item` | display: inline-flex, align-items: center, gap: 4px, color: `--gs-ink-muted`, white-space: nowrap |
| `.footer-item .material-symbols-outlined` | font-size: 14px |
| `.footer-status-dot` | width: 6px, height: 6px, border-radius: 50%, flex-shrink: 0 |
| `.footer-status-dot--ok` | bg: `--gs-accent-green` o `#22c55e` |
| `.footer-status-dot--error` | bg: `--gs-error` o `#ef4444` |
| `.footer-status-dot--warning` | bg: `--gs-accent-gold` o `#f59e0b` |
| `.footer-status-text` | overflow: hidden, text-overflow: ellipsis, white-space: nowrap, color: `--gs-ink-secondary` |
| `.footer-badge` | padding: 1px 6px, border-radius: 3px, bg: rgba(255,255,255,0.06), font-size: 10px, font-weight: 600, letter-spacing: 0.03em |
| `.footer-shortcut` | font-family: `--gs-font-mono`, font-size: 10px, opacity: 0.5 |
| `.footer-save-icon` | color: `--gs-ink-muted`, font-size: 14px |
| `.footer-save-icon--saved` | color: `--gs-accent-green` |
| `.footer-expand-card` | position: absolute, bottom: calc(100% + 4px), inverted de StatusBar actual |

### Theme overrides:
- `[data-theme="light"] .app-footer` — bg: #ffffff, border-top-color: rgba(0,0,0,0.1)
- `[data-theme="warm"] .app-footer` — bg: #1c1610
- `[data-theme="light"] .footer-center` — border-color: rgba(0,0,0,0.08)

## Acceptance Criteria

- [ ] Todas las clases `.app-footer`, `.footer-*` están definidas en `styles.css`
- [ ] Los 3 temas tienen overrides funcionales
- [ ] No hay valores hardcodeados que debieran ser tokens
- [x] `@media (prefers-reduced-motion: reduce)` desactiva animaciones del card expandible
- [x] No hay conflictos con las clases `.status-*` existentes (aún no eliminadas)

## Files to Modify

- `src/styles.css`

## Work Log

- **2026-03-04**:
  - Agregadas clases de AppFooter al archivo CSS global.
  - Implementados overrides para fondos claros y sepia en paneles según contexto.

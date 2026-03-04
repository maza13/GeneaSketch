---
status: complete
priority: p2
issue_id: "063"
tags: [ux, shell, cleanup, css, migration]
dependencies: ["060", "061", "062"]
---

# Fase Final — Limpieza CSS Deprecated y Verificación Completa

Eliminar todas las clases CSS antiguas que fueron reemplazadas por los primitivos `.gs-panel*` durante las fases 1-3, y ejecutar verificación completa del shell.

## Problem Statement

Después de las fases 1-3, coexisten clases viejas (`.panel`, `.panel-left`, `.left-section`, `.panel-right`, `.panel-header-row`, `.status-pill`, etc.) con las nuevas (`.gs-panel*`, `.app-footer`, `.footer-*`). Estas clases deprecated aumentan el tamaño de `styles.css` y causan confusión. Deben eliminarse una vez confirmada la estabilidad.

## Recommended Action

### A. Identificar y eliminar clases deprecated

Clases a eliminar de `styles.css`:
- `.panel` (reemplazada por `.gs-panel`)
- `.panel-left`, `.panel-left-inner`, `.panel-left .panel-header-row` (→ `.gs-panel--left`)
- `.panel-right` (→ `.gs-panel--right`)
- `.left-section`, `.left-section__header` (→ `.gs-panel-section`)
- `.panel-header-row`, `.panel-header-actions`, `.panel-header-btn` (→ `.gs-panel-header*`)
- `.panel-section-body`, `.panel-section-body--expanded/compact` (→ `.gs-panel-section-body`)
- `.panel-icon-btn` (→ `.gs-panel-action-btn` o Material Symbols directos)
- `.status-container`, `.status-pill`, `.status-context-card` y todo el bloque de StatusBar (ya eliminado como componente)

### B. Verificar que ningún componente usa las clases eliminadas

```bash
# Buscar cualquier referencia a las clases viejas
grep -rn "panel-left\|left-section\|panel-right\|panel-header-row\|status-pill\|status-container" src/ --include="*.tsx" --include="*.ts"
```

El resultado debe ser **vacío**.

### C. Ejecutar verificación completa

1. `npx tsc --noEmit` — cero errores en archivos del shell
2. `npm run dev` — aplicación arranca sin errores
3. Verificación visual manual completa:

**Checklist visual (8 puntos):**
- [ ] Topbar: logo + A|B|C + menus + quick actions visible y funcional
- [ ] Footer: status + métricas + motor + versión + indicador guardado visible
- [ ] Panel izquierdo: header + 3 secciones + 3 slots futuros + collapse/expand
- [ ] Panel derecho: header + persona + familiares + slots futuros
- [ ] Canvas: ocupa todo el espacio disponible, no se comprime
- [ ] Toggle paneles: ambos se colapsan/muestran correctamente
- [ ] Tema claro: todos los componentes del shell cambian correctamente
- [ ] Tema cálido: todos los componentes del shell cambian correctamente

### D. Actualizar wiki de layout

Modificar `docs/wiki-uxdesign/05_espaciado_y_layout.md` para reflejar la nueva anatomía:

```
┌─────────────────────────────────────────────────────────────┐
│ TOPBAR — 44px — --shell-topbar-h                            │
├──────────────┬──────────────────────────┬───────────────────┤
│ LEFT PANEL   │    CANVAS / PAGE         │  RIGHT PANEL      │
│ 280px        │    flex: 1               │  340px            │
│ --shell-     │    min-height: 0         │  --shell-         │
│  left-w      │    overflow: hidden      │   right-w         │
├──────────────┴──────────────────────────┴───────────────────┤
│ FOOTER — 28px — --shell-footer-h                            │
└─────────────────────────────────────────────────────────────┘
```

## Acceptance Criteria

- [x] Cero clases deprecated en `styles.css`
- [x] Grep de clases viejas retorna vacío en todos los archivos `.tsx/.ts`
- [x] `tsc --noEmit` limpio
- [x] Los 8 puntos de verificación visual pasan
- [x] Wiki de layout actualizada
- [x] Tamaño de `styles.css` reducido respecto al estado pre-migración

## Files to Modify

- `src/styles.css` (eliminación de bloques deprecated)
- `docs/wiki-uxdesign/05_espaciado_y_layout.md` (actualización de diagrama)

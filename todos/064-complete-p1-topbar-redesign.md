---
status: complete
priority: p1
issue_id: "064"
---

# Fase 4 — Rediseño del Topbar (Header)

Refactorizar el `TopMenuBar.tsx` y sus estilos en `styles.css` para alinearlos con el nuevo sistema de diseño `gs-panel`. El objetivo es lograr un header premium, minimalista y coherente con el resto del App Shell.

## Acceptance Criteria

- [x] Topbar mide exactamente 44px de alto.
- [x] El conmutador A|B|C usa el nuevo sistema de botones sutiles.
- [x] Los menús desplegables usan el sistema de tokens de color y radio de borde actual.
- [x] La marca "GeneaSketch" usa la tipografía de cabecera correctamente.
- [x] Los 3 temas (dark/light/warm) renderizan el header perfectamente.
- [x] `tsc --noEmit` limpio.

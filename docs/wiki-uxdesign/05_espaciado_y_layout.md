# 05 - Espaciado y layout

## 5. Espaciado y layout

### Escala base (múltiplos de 4px)
```
--space-1: 4px    --space-5: 20px   --space-10: 40px
--space-2: 8px    --space-6: 24px   --space-12: 48px
--space-3: 12px   --space-8: 32px   --space-16: 64px
--space-4: 16px
```

### Layout de la aplicación
```
┌─────────────────────────────────────────────────────────────┐
│ TITLEBAR (Tauri custom) — 32px — --titlebar-height          │
├─────────────────────────────────────────────────────────────┤
│ MENUBAR NATIVA — altura variable (~40px)                    │
├──────────────┬──────────────────────────┬───────────────────┤
│ LEFT SIDEBAR │    CANVAS (D3 tree)      │  RIGHT PANEL      │
│ 260px        │    flex: 1               │  320px            │
│ --sidebar-   │    overflow: hidden      │  overflow-y: auto │
│  width       │                          │                   │
│              │                          │                   │
└──────────────┴──────────────────────────┴───────────────────┘
```

### Sidebar colapsado
Cuando el sidebar se colapsa: ancho = `--sidebar-collapsed` (52px). Solo iconos visibles.

### Z-index — capas
```
--z-base:     0    (canvas, contenido)
--z-raised:   10   (tooltips del árbol)
--z-dropdown: 100  (dropdowns, selects)
--z-modal:    200  (PersonModal y overlays)
--z-tooltip:  300  (tooltips UI)
--z-toast:    400  (notificaciones)
```

---

## Navegacion
[<- 04_tipografia](./04_tipografia.md) | [Siguiente: 06_iconos ->](./06_iconos.md)


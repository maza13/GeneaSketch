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

### Comportamiento de Paneles
Los paneles laterales son **retractables**. Cuando se colapsan, se deslizan hacia afuera (`translateX`) y su ancho efectivo en el layout pasa a ser `0px`, permitiendo que el lienzo ocupe todo el espacio.


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


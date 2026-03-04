# 09 - Pantallas clave — anatomía

## 9. Pantallas clave — anatomía

### 9.1 Pantalla principal (main canvas)

```
titlebar (32px) — Tauri window controls
menubar (~40px) — Archivo · Edit · Vista · Herramientas · Avanzado · External · Help
─────────────────────────────────────────────────────────────────
left-sidebar (260px)          canvas D3            right-panel (320px)
  ├─ header "Capas y árbol"     (flex: 1)             ├─ header "Detalles"
  │    [+] [−]                  background:           │    [∧ collapse]
  ├─ section: Capas de análisis  --surface-base        ├─ persona seleccionada
  │    [collapsed/expanded]                            │    nombre + meta
  ├─ section: Config del árbol                        └─ familiares list
  │    checkboxes, sliders
  └─ section: Herramientas lienzo
```

### 9.2 Modal de ficha de persona

```
modal-header: "Ficha de persona: [Nombre]"           [✕]
tab-bar: [person Identidad] [groups Vínculos●] [event Eventos] ...
─────────────────────────────────────────────────────────────────
modal-body (scroll):
  TAB VÍNCULOS — estructura correcta:
  
  ┌─ Familia de Origen ────────────────────────────────────────┐
  │  [+ Padre] [+ Madre] [+ Hermano]                          │
  │  ┌─ @F69@ ──────────────────── Origen · Pareja ──────────┐│
  │  │ Padre: [Valente Saucedo]                               ││
  │  │ Madre: [Lorenza Sánchez]                               ││
  │  │ Hijos: [Clemente S.S.] [Juana Saucedo]                ││
  │  │ [Editar familia]              [Quitar vínculo]         ││
  │  └────────────────────────────────────────────────────────┘│
  └────────────────────────────────────────────────────────────┘
  
  ┌─ Familias Propias ─────────────────────────────────────────┐
  │  [+ Pareja] [+ Hijo]                                      │
  │  ── Vincular familia existente ──                         │
  │  [Seleccionar familia... ▾] [Pareja/Padre ▾] [Vincular]  │
  │  ┌─ @F5@ ─────────────────── Propia · Casados ───────────┐│
  │  │ Padre: [Clemente S.S.]                                 ││
  │  │ Madre: [Petra Nava Vidal]                              ││
  │  │ [Editar familia]              [Quitar vínculo]         ││
  │  └────────────────────────────────────────────────────────┘│
  └────────────────────────────────────────────────────────────┘

modal-footer:                               [Seleccionar persona]
```

**REGLA CRÍTICA de Vínculos:** El formulario "Editar familia" se expande dentro del mismo card (@F69@), no aparece separado debajo. Ver patrón 8.1.

---

## Navegacion
[<- 08_patrones_ux_interaccion](./08_patrones_ux_interaccion.md) | [Siguiente: 10_anti_patrones ->](./10_anti_patrones.md)


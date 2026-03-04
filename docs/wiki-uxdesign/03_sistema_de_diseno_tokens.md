# 03 - Sistema de diseño — tokens

## 3. Sistema de diseño — tokens

> Archivo de referencia: `src/styles/tokens.css`  
> **Nunca** duplicar estos valores. Siempre `var(--nombre-token)`.

### Paleta — resumen rápido

| Token | Dark (Azul Medianoche) | Warm (Pergamino) | Light (Blanco Puro) | Uso |
|-------|------|-------|-------|-----|
| `--surface-base` | `#080c16` | `#f2ede4` | `#f0f4f8` | Fondo raíz |
| `--surface-elevated` | `#0d1422` | `#faf6ee` | `#ffffff` | Panels, cards |
| `--surface-overlay` | `#111c2e` | `#fffdf8` | `#fafdff` | Modales |
| `--surface-subtle` | `#162236` | `#e8e0d2` | `#e4eaf2` | Hover bg |
| `--surface-border` | `#1c2c44` | `#d0c4ae` | `#c8d4e0` | Separadores |
| `--text-primary` | `#dce8f8` | `#1c1710` | `#0e1824` | Texto principal |
| `--text-secondary` | `#6a82a8` | `#706050` | `#4a6080` | Metadatos |
| `--text-muted` | `#2e4060` | `#a89878` | `#90a8c0` | Placeholders |
| `--accent-primary` | `#4d8ef0` | `#b86020` | `#d06020` | Acción principal, activo |
| `--accent-secondary` | `#5a9e6f` | `#5a9e6f` | `#3a7a52` | Confirmado, éxito |

### Modo de tema
El tema se gestiona con un atributo en `<html>` o `<body>`:
```html
<body data-theme="dark">   <!-- Azul Medianoche (por defecto) -->
<body data-theme="warm">   <!-- Pergamino -->
<body data-theme="light">  <!-- Blanco Puro -->
```
El toggle de tema cambia SOLO este atributo. Los tokens CSS hacen el resto automáticamente.

---

## Navegacion
[<- 02_stack_y_arquitectura_ui](./02_stack_y_arquitectura_ui.md) | [Siguiente: 04_tipografia ->](./04_tipografia.md)


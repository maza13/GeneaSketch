# 04 - Tipografía

## 4. Tipografía

### Familias

```css
--font-ui:      'IBM Plex Sans', system-ui, sans-serif;   /* TODO lo de interfaz */
--font-display: 'IBM Plex Serif', Georgia, serif;          /* Títulos, nombres genealógicos */
--font-mono:    'IBM Plex Mono', monospace;                 /* IDs, fechas, códigos GEDCOM */
```

### Escala tipográfica — uso canónico

| Token | px | Font | Weight | Uso |
|-------|----|------|--------|-----|
| `--text-xs` | 11px | IBM Plex Sans | 500 | Labels de sección (UPPERCASE), badges |
| `--text-sm` | 12px | IBM Plex Sans | 400 | Metadatos, fechas en panel |
| `--text-base` | 14px | IBM Plex Sans | 400/500 | UI general, botones, inputs |
| `--text-md` | 15px | IBM Plex Sans | 500 | Subtítulos de panel |
| `--text-lg` | 18px | IBM Plex Serif | 400 italic | Nombre de persona en nodo |
| `--text-xl` | 22px | IBM Plex Serif | 600 | Título de sección principal |
| `--text-2xl` | 28px | IBM Plex Serif | 600 | Nombre en panel Detalles |
| `--text-3xl` | 36px | IBM Plex Serif | 600 | Pantalla de bienvenida |

### Labels de sección
```css
/* Patrón estándar para headers de sección dentro de panels/modales */
.section-label {
  font-family: var(--font-ui);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}
```

### IDs GEDCOM
Siempre `IBM Plex Mono`, `--text-sm`, `--text-muted`. Ejemplo: `@I12@`, `@F69@`.

---

## Navegacion
[<- 03_sistema_de_diseno_tokens](./03_sistema_de_diseno_tokens.md) | [Siguiente: 05_espaciado_y_layout ->](./05_espaciado_y_layout.md)


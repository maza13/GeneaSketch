# 06 - Iconos

## 6. Iconos

### Sistema: Material Symbols Outlined
Cargados en `index.html`. Implementación CSS:
```html
<span class="material-symbols-outlined">person</span>
```

### Configuración base (reset.css)
```css
.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 20;
  font-size: 20px;
  line-height: 1;
  user-select: none;
  vertical-align: middle;
}
```

### Tamaños estándar por contexto

| Contexto | font-size | wght |
|----------|-----------|------|
| Tab bar (modal) | 18px | 300 |
| Panel section header | 20px | 300 |
| Botón con icono | 18px | 300 |
| Acción inline (row) | 16px | 300 |
| Estado activo | mismo | 400 + FILL 1 |

### Catálogo canónico del proyecto

**Navegación y estructura:**
`account_tree` · `layers` · `settings` · `close` · `expand_more` · `chevron_right` · `add` · `remove`

**Ficha de persona — tabs:**
`person` · `groups` · `event` · `menu_book` · `description` · `image` · `history` · `extension` · `timeline` · `analytics`

**Configuración IA — tabs:**
`tune` · `auto_awesome_motion` · `hub` · `monitoring` · `psychology` · `architecture` · `calendar_month`

**Acciones frecuentes:**
`edit` · `delete` · `visibility` · `visibility_off` · `link` · `link_off` · `download` · `upload` · `print` · `share` · `search` · `filter_list` · `sort`

**Estados:**
`check_circle` · `error` · `warning` · `info` · `pending`

> ❌ **NUNCA** mezclar con Lucide, Heroicons u otras librerías. Un solo sistema de iconos.

---

## Navegacion
[<- 05_espaciado_y_layout](./05_espaciado_y_layout.md) | [Siguiente: 07_componentes_especificaciones ->](./07_componentes_especificaciones.md)


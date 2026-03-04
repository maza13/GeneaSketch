# 10 - Anti-patrones — qué NUNCA hacer

## 10. Anti-patrones — qué NUNCA hacer

| ❌ Anti-patrón | ✅ Alternativa correcta |
|----------------|------------------------|
| Colores hardcodeados (`#333`, `orange`) | Siempre `var(--token-name)` |
| Mezclar librerías de iconos | Solo Material Symbols Outlined |
| Abrir formulario de edición fuera del card que se edita | Patrón expand-in-place (8.1) |
| Usar `font-family: Arial` o `system-ui` directamente | `var(--font-ui)` |
| Botones sin estado hover/active/disabled | Siempre los 4 estados |
| Eliminar datos sin confirmación | Inline confirmation (8.5) |
| Modales que se pueden scrollear en el overlay | Solo el body hace scroll |
| Usar `!important` para sobrescribir tokens | Ajustar la especificidad CSS |
| Z-index arbitrarios (`z-index: 9999`) | Usar escala `--z-*` |
| Tailwind classes en componentes del proyecto | CSS modules + variables |
| Texto en uppercase sin `letter-spacing` | Siempre `letter-spacing: 0.06–0.10em` con uppercase |
| Labels sin `text-transform: uppercase` en section headers | Ver clase `.section-label` |
| Formularios con múltiples columnas en el modal (ancho < 600px) | Siempre una columna |
| Usar `querySelector('#' + id)` con IDs dinámicos | Usar selectores de atributo: `querySelector('[id="' + id + '"]')` para evitar DOMException |
| Usar `el.scrollIntoView()` desenfrenado en modales | Calcular scroll relativo con `parent.scrollTo({ top: ... })` para evitar hijack del viewport |

---

## Navegacion
[<- 09_pantallas_clave_anatomia](./09_pantallas_clave_anatomia.md) | [Siguiente: 11_checklist_entrega ->](./11_checklist_entrega.md)


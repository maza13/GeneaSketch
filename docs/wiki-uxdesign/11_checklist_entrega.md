# 11 - Checklist antes de entregar

## 11. Checklist antes de entregar

Para **cada componente nuevo o modificado:**

```
ESTILOS
[ ] Usa solo var(--token) — ningún valor hardcodeado
[ ] Funciona en data-theme="dark" (modo por defecto)
[ ] Funciona en data-theme="light"
[ ] Se ve correcto en @media print

TIPOGRAFÍA
[ ] Usa --font-ui, --font-display o --font-mono según contexto
[ ] Tamaños solo de la escala --text-*
[ ] Labels de sección en uppercase + letter-spacing

ICONOS
[ ] Solo material-symbols-outlined
[ ] Tamaño apropiado al contexto (16/18/20px)
[ ] Estado activo con FILL 1

INTERACCIÓN
[ ] Estados: hover, focus, active, disabled
[ ] Acciones destructivas con confirmación inline
[ ] Edición inline (no en sección separada)
[ ] Feedback de carga para operaciones async

ACCESIBILIDAD
[ ] aria-label en botones de solo icono
[ ] Contraste mínimo 4.5:1 en texto sobre fondo
[ ] Focus visible (outline en --accent-primary)

RESPONSIVE / TAURI
[ ] No depende de media queries de viewport (es desktop)
[ ] Funciona con sidebar colapsado
[ ] Sin overflow-x en ningún contenedor
```

---

## Navegacion
[<- 10_anti_patrones](./10_anti_patrones.md) | [Siguiente: 12_instrucciones_agentes_ia ->](./12_instrucciones_agentes_ia.md)


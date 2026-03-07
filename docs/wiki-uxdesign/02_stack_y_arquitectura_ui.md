# 02 - Stack y arquitectura de UI

## 2. Stack y arquitectura de UI

```
App Shell (Chrome / UI)
├── index.html              ← fonts, Material Symbols, tokens.css
├── src/
│   ├── main.tsx            ← importa tokens.css, configura tema
│   ├── ui/                 ← App Shell / UI (Panels, Headers, Modals...)
│   │   ├── common/         ← base components (Button, Input, Badge...)
│   │   ├── person/         ← detail panels (App Shell)
│   │   └── shell/          ← layout (Chrome / UI)
│   ├── views/
│   │   └── dtree-v3/       ← VISUAL ENGINE (D3 Canvas, Nodos, Edges)
│   ├── styles/
│   │   ├── tokens.css      ← FUENTE DE VERDAD de colores/spacing
│   │   └── styles.css      ← reglas globales de UI
│   └── state/              ← Zustand stores
```

### Regla de separación crítica
1. **App Shell (UI):** Componentes estándar de interacción. Se encuentran principalmente en `@/ui`.
2. **Visual Engine:** Sistema de proyección de grafo a coordenadas visuales (Canvas). Se encuentra en `@/views/dtree-v3`.

### Regla de estilos
- **Variables CSS siempre** — nunca hardcodear colores, espaciados o radios
- **CSS Modules** para componentes (`.module.css` junto al `.tsx`)
- **No Tailwind** — las clases utilitarias rompen la coherencia del token system
- **Excepción D3 (Visual Engine):** El canvas SVG usa atributos SVG directos + variables CSS leídas con `getComputedStyle`.

---

## Navegacion
[<- 01_filosofia_y_principios](./01_filosofia_y_principios.md) | [Siguiente: 03_sistema_de_diseno_tokens ->](./03_sistema_de_diseno_tokens.md)


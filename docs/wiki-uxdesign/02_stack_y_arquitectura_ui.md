# 02 - Stack y arquitectura de UI

## 2. Stack y arquitectura de UI

```
App Shell (Tauri)
├── index.html              ← fonts, Material Symbols, tokens.css
├── src/
│   ├── main.tsx            ← importa tokens.css, configura tema
│   ├── components/
│   │   ├── ui/             ← componentes base (Button, Input, Badge...)
│   │   ├── panels/         ← sidebars, detail panel
│   │   ├── modals/         ← PersonModal y subcomponentes
│   │   └── tree/           ← canvas D3, nodos, edges
│   ├── styles/
│   │   ├── tokens.css      ← FUENTE DE VERDAD de colores/spacing
│   │   └── reset.css       ← box-model, tipografía base
│   └── store/              ← Zustand stores
```

### Regla de estilos
- **Variables CSS siempre** — nunca hardcodear colores, espaciados o radios
- **CSS Modules** para componentes (`.module.css` junto al `.tsx`)
- **No Tailwind** — las clases utilitarias rompen la coherencia del token system
- **Excepción D3** — el canvas SVG usa atributos SVG directos + variables CSS leídas con `getComputedStyle`

---

## Navegacion
[<- 01_filosofia_y_principios](./01_filosofia_y_principios.md) | [Siguiente: 03_sistema_de_diseno_tokens ->](./03_sistema_de_diseno_tokens.md)


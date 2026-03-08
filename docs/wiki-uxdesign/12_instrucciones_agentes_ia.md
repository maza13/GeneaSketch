# 12 - Instrucciones para agentes IA

## 12. Instrucciones para agentes IA

> Esta seccion aplica a cualquier agente que trabaje en el proyecto.

### Contrato de contexto UX (machine-friendly)
**Contract ID:** `GS-UX-CONTEXT-v1.1`

**Ambito:**
- `src/ui/**`, `src/styles/**`, `*.module.css`, `index.html`, `docs/wiki-uxdesign/**`.

**Fuente de verdad UX:**
- Esta wiki (`docs/wiki-uxdesign/*`).
- Tokens runtime canonicos en `src/styles/tokens.css`.
- `14_rediseno_conceptual_interfaz_genealogica.md` es lectura obligatoria antes de cambios que redefinan paneles, modos o superficies principales.
- `15_auditoria_superficies_actuales_y_plan_rediseno.md` es lectura obligatoria antes de consolidar, fusionar o retirar paneles existentes.

#### Reglas canonicas (`UX-RULE-*`)
| Rule ID | Regla |
|---|---|
| `UX-RULE-001` | Usar tokens (`var(--token)`); no hardcode visual cuando exista token. |
| `UX-RULE-002` | Soporte obligatorio dark/light. |
| `UX-RULE-003` | Solo Material Symbols en UI. |
| `UX-RULE-004` | Tipografia segun contrato IBM Plex. |
| `UX-RULE-005` | Integridad de impresion UI. |
| `UX-RULE-006` | Patron de edicion inline cuando aplique. |
| `UX-RULE-007` | Confirmacion inline en acciones destructivas. |
| `UX-RULE-008` | Z-index desde escala de tokens. |
| `UX-RULE-009` | Nuevo patron UX requiere actualizacion de wiki en el mismo ciclo. |
| `UX-RULE-010` | Si una skill especializada contradice wiki UX, gana la wiki UX. |

#### Matriz de liderazgo y delegacion
- `geneasketch-ux-governor` lidera cambios en UI/estilos/UX docs.
- `gsk-engine-architect` lidera cambios de `src/core/genraph/**` y `docs/wiki-gsk/**`.
- `geneasketch-docs-manager` lidera carriles documentales de producto/wiki-software.
- En cambios mixtos: skill lider delega y luego valida cumplimiento `UX-RULE-*`.

### Como usar esta wiki eficientemente

1. **Al inicio de cada sesion:** pegar las secciones relevantes, no toda la wiki completa.
2. **Antes de crear cualquier elemento visual:** buscar en seccion 7 si existe patron base.
3. **Antes de implementar interaccion:** buscar en seccion 8 si existe patron.
4. **Tokens:** usar `src/styles/tokens.css` como fuente canonica.
5. **Si hay inconsistencia:** reportar y proponer actualizacion de wiki.
6. **Antes de rediseñar paneles o modos:** leer el capitulo 14 y respetar su taxonomia UX.
7. **Antes de decidir destinos de paneles actuales:** leer el capitulo 15 y usar su inventario y matriz de triggers como base.

### Prompt de contexto minimo para una sesion
```text
Proyecto: GeneaSketch (desktop) - Tauri + React 18 + TypeScript + D3
UI style system: CSS Modules + tokens from src/styles/tokens.css
Icons: Material Symbols only
Fonts: IBM Plex Sans / Serif / Mono
Theme: 3 themes (Azul Medianoche [default dark], Pergamino [warm], Blanco Puro [light])
Authority: docs/wiki-uxdesign/* (wiki-first)
Rules: enforce UX-RULE-001..010 from capitulo 12
```

### Lo que NO necesitas explicar si tienes esta wiki
- Que libreria de iconos usar
- Cual es la paleta de colores
- Como se llaman las variables CSS
- Cuales son los tamanos tipograficos
- Como funciona la edicion inline
- Cuando pedir confirmacion antes de eliminar
- Como organizar el layout de la app

---

### Gobernanza de skills
- Fuente primaria de skills del proyecto: `.agents/skills/*`.
- Raiz operativa obligatoria: `.agents/skills/*`.
- Todas las skills deben existir en ambos directorios.
- Si hay divergencia de contenido en skills criticas, se considera incumplimiento de gobernanza.

**Scripts oficiales de gobernanza:**
```powershell
# Sincroniza skills desde .agents hacia .agent
powershell -ExecutionPolicy Bypass -File tools/skills/sync_skills.ps1 -Prune

# Verifica paridad de existencia + hash en skills criticas
powershell -ExecutionPolicy Bypass -File tools/skills/check_skill_parity.ps1
```

**Skills criticas minimas para integridad UX:**
- `geneasketch-ux-governor`
- `customizing-tauri-windows`
- `d3-viz`
- `ui-animation`
- `geneasketch-docs-manager`
- `gsk-engine-architect`

## Navegacion
[<- 11_checklist_entrega](./11_checklist_entrega.md) | [Volver a README ->](./README.md)


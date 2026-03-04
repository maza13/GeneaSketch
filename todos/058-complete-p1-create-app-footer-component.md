---
status: complete
priority: p1
issue_id: "058"
tags: [ux, shell, footer, component]
dependencies: ["057"]
---

# Fase 1a — Crear AppFooter Component

Crear un nuevo componente `AppFooter.tsx` que reemplace al actual `StatusBar.tsx`. El footer es una barra fija de 28px en la base de la app — estilo VS Code / Cursor / Antigravity — que muestra estado, métricas del documento, motor activo, versión y atajos.

## Problem Statement

El `StatusBar` actual es un pill flotante con estilos inline (`<style>` embebido en el componente) que:
- Viola UX-RULE-001 (no usa tokens)
- No tiene fondo ni borde, se ve como un corte brusco al fondo de la app
- No muestra información contextual útil (personas, familias, motor, versión)
- No tiene espacio para atajos o indicadores de guardado

## Recommended Action

### A. Crear `src/ui/shell/AppFooter.tsx`

**Props:**
```typescript
type AppFooterProps = {
    statusMessage: string;
    personCount: number | null;
    familyCount: number | null;
    sourceCount: number | null;
    engineMode: string | null;
    isSaved: boolean;
    appVersion: string;
};
```

**Layout del footer (3 secciones):**

```
┌──────────────────────────────────────────────────────────────────────┐
│ [●] Listo               │  👤 42 · 👪 18 · 📄 5  │ DTree  v0.4.4  [💾] │
│ ↳ .footer-left          │ .footer-center          │ .footer-right        │
└──────────────────────────────────────────────────────────────────────┘
```

**Left section:**
- Dot indicador de severidad (verde=ok, rojo=error, amarillo=warning)
- Texto del status message, truncado con ellipsis
- Click abre card expandible (migrar lógica del expandible desde StatusBar)

**Center section:**
- Iconos Material Symbols: `person` + count, `groups` + count, `description` + count
- Separados por `·`
- Solo visible si `personCount !== null`

**Right section:**
- Badge del motor activo (ej. "DTree")
- Versión de la app (ej. "v0.4.4")
- Icono de guardado: `save` (no guardado) / `cloud_done` (guardado)
- Atajo visible: `Ctrl+S` en texto mono

### B. Migrar lógica expandible

Tomar la lógica del card expandible de `StatusBar.tsx`:
- Estado `expanded`
- Click outside para cerrar
- Botón copiar al portapapeles
- Card con detalle del mensaje y footer "Click fuera para cerrar"

La diferencia: el card ahora se abre **hacia arriba** (bottom-up) ya que el footer está abajo.

## Acceptance Criteria

- [ ] `AppFooter.tsx` existe en `src/ui/shell/`
- [ ] Renderiza las 3 secciones (left, center, right)
- [ ] El dot de severidad cambia de color según el mensaje (error=rojo, warning=amarillo, normal=verde)
- [ ] Las métricas muestran iconos Material Symbols + conteos
- [ ] El badge de motor y versión son visibles
- [ ] El card expandible se abre hacia arriba al hacer click en el status
- [x] El componente NO tiene estilos inline — todo en `styles.css`
- [x] TypeScript compila sin errores

## Files to Create

- `src/ui/shell/AppFooter.tsx`

## Work Log

- **2026-03-04**: 
  - Componente `AppFooter` creado con props de metadata de documento y estado.
  - El card de estado se migró desde StatusBar e invirtió su lógica de apertura para renderizarse hacia arriba flotando sobre la barra mediante `bottom: calc(100% + 4px)`.
  - Estilos y variables refactorizados al global CSS en #059 y #060.

## Files to Modify

- (ninguno en este ticket — la integración es ticket 060)

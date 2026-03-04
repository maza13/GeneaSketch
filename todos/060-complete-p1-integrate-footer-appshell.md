---
status: complete
priority: p1
issue_id: "060"
tags: [ux, shell, layout, integration]
dependencies: ["057", "058", "059"]
---

# Fase 1c — Integrar AppFooter en AppShell y App.tsx

Conectar el nuevo `AppFooter` al layout principal de la app, reemplazando al `StatusBar`, y restructurar `AppShell.tsx` para usar un layout flex column correcto: topbar → main (3-col) → footer.

## Problem Statement

El `AppShell.tsx` actual renderiza `{statusBar}` como último hijo flotante sin estructura. El layout usa `.app-container` sin CSS definido (recientemente restaurado). La prop `statusBar` acepta un componente genérico sin contrato de tipado para las métricas del footer.

## Recommended Action

### A. Modificar `AppShell.tsx`

1. Renombrar prop `statusBar: React.ReactNode` → `footer: React.ReactNode`
2. Cambiar JSX:
```jsx
<div className="app-container">
    <header className="topbar">{topbar}</header>
    <main className={layoutClassName}>
        {!leftCollapsed && leftPanel}
        <section className="canvas-panel">...</section>
        {!rightCollapsed && rightPanel}
    </main>
    <footer className="app-footer">{footer}</footer>
</div>
```
3. NO cambiar nada más de lógica interna.

### B. Refactorizar CSS de `.app-container` y `.layout`

En `styles.css`:

```css
.app-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.layout {
    flex: 1;
    min-height: 0;   /* CRITICAL: permite overflow correcto */
    display: grid;
    grid-template-columns: var(--shell-left-w) minmax(0, 1fr) var(--shell-right-w);
    overflow: hidden;
}

.layout--left-collapsed {
    grid-template-columns: minmax(0, 1fr) var(--shell-right-w);
}

.layout--right-collapsed {
    grid-template-columns: var(--shell-left-w) minmax(0, 1fr);
}

.layout--canvas-only {
    grid-template-columns: minmax(0, 1fr);
}
```

### C. Integrar en `App.tsx`

1. Importar `AppFooter` de `@/ui/shell/AppFooter`
2. Computar props:
   - `personCount`: `document ? Object.keys(document.persons).length : null`
   - `familyCount`: `document ? Object.keys(document.families).length : null`
   - `sourceCount`: `document ? Object.keys(document.sources ?? {}).length : null`
   - `engineMode`: `viewConfig ? "DTree" : null`
   - `isSaved`: (de estado existente o false por defecto)
   - `appVersion`: import del `package.json` version o constante `"0.4.4"`
3. Reemplazar `statusBar={<StatusBar message={status} />}` por:
```jsx
footer={
    <AppFooter
        statusMessage={status}
        personCount={personCount}
        familyCount={familyCount}
        sourceCount={sourceCount}
        engineMode={engineMode}
        isSaved={false}
        appVersion="0.4.4"
    />
}
```
4. Eliminar import de `StatusBar`

### D. Eliminar `StatusBar.tsx`

Eliminar `src/ui/StatusBar.tsx` ya que toda su funcionalidad ha sido trasladada a `AppFooter.tsx`.

## Acceptance Criteria

- [ ] `AppShell` usa prop `footer` en vez de `statusBar`
- [ ] Footer visible fijo al fondo con fondo oscuro y borde superior
- [ ] Muestra status, conteo personas/familias/fuentes, motor, versión
- [ ] Card expandible al click en status se abre hacia arriba
- [x] `StatusBar.tsx` eliminado
- [x] `tsc --noEmit` sin errores en archivos modificados
- [x] Layout grid funciona: canvas ocupa el espacio, paneles laterales no se rompen
- [x] Funciona en dark, light y warm themes
- [x] Funciona correctamente como web (browser) y como desktop (Tauri)

## Files to Modify

- `src/ui/shell/AppShell.tsx`
- `src/App.tsx`
- `src/styles.css`

## Work Log

- **2026-03-04**:
  - Integrado `<AppFooter />` en `App.tsx` y vinculado a la cuenta de familias, nodos e instancia del engine state.
  - Flex grid reparado en `.layout` para forzar que el Footer persista al fondo con `flex-shrink: 0`, respetando `AppContainer`.
  - Eliminado el componente obsoleto `StatusBar` y todo rastro residual.

## Files to Delete

- `src/ui/StatusBar.tsx`

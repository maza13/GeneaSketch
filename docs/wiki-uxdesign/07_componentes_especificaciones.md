# 07 - Componentes — especificaciones exactas

## 7. Componentes — especificaciones exactas

### 7.1 Button

Hay 4 variantes. Elegir según jerarquía de acción:

```
PRIMARIO    → acción principal de la pantalla (1 por contexto)
SECUNDARIO  → acción alternativa o de apoyo
GHOST       → acciones terciarias, acciones en tablas/listas  
DANGER      → acciones destructivas (eliminar, quitar vínculo)
```

#### Especificaciones CSS

```css
/* BASE — compartida por todas las variantes */
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-5);   /* 8px 20px */
  border-radius: var(--radius-md);           /* 8px */
  font-family: var(--font-ui);
  font-size: var(--text-base);               /* 14px */
  font-weight: var(--weight-medium);         /* 500 */
  line-height: 1;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background var(--transition-base), 
              border-color var(--transition-base),
              transform var(--transition-fast);
  white-space: nowrap;
}

.btn:active { transform: translateY(1px); }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* PRIMARIO */
.btn-primary {
  background: var(--accent-primary);
  color: var(--text-inverse);
  border-color: var(--accent-primary);
}
.btn-primary:hover { background: var(--accent-primary-hover); border-color: var(--accent-primary-hover); }

/* SECUNDARIO */
.btn-secondary {
  background: var(--surface-subtle);
  color: var(--text-primary);
  border-color: var(--surface-border);
}
.btn-secondary:hover { background: var(--surface-overlay); }

/* GHOST */
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border-color: transparent;
}
.btn-ghost:hover { background: var(--surface-subtle); color: var(--text-primary); }

/* DANGER */
.btn-danger {
  background: var(--color-danger-muted);
  color: var(--color-danger);
  border-color: transparent;
}
.btn-danger:hover { background: var(--color-danger); color: white; }

/* ICON-ONLY — botón cuadrado con solo icono */
.btn-icon {
  padding: var(--space-2);                   /* 8px en todos los lados */
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
}
```

#### Botones de ancho completo
En formularios y modales, los botones de acción principal ocupan `width: 100%`.

---

### 7.2 Input / Field

```css
.input {
  width: 100%;
  padding: var(--space-2) var(--space-3);   /* 8px 12px */
  background: var(--surface-base);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-md);
  font-family: var(--font-ui);
  font-size: var(--text-base);
  color: var(--text-primary);
  transition: border-color var(--transition-base);
  outline: none;
}

.input::placeholder { color: var(--text-muted); }
.input:focus { border-color: var(--accent-primary); }
.input:disabled { opacity: 0.5; }
```

#### Select / Dropdown
Mismo estilo que Input. Agregar `appearance: none` y chevron custom:
```css
.select {
  /* mismos estilos que .input */
  appearance: none;
  background-image: url("data:image/svg+xml,..."); /* chevron en --text-muted */
  padding-right: var(--space-8);
  cursor: pointer;
}
```

---

### 7.3 Badge / Tag

```css
/* DEFAULT — acento primario */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--space-2);
  background: var(--accent-primary-muted);
  border: 1px solid var(--accent-primary-border);
  border-radius: var(--radius-sm);
  font-family: var(--font-ui);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  color: var(--accent-primary);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}

/* VARIANTE — neutral (para IDs, estados secundarios) */
.badge-neutral {
  background: var(--surface-subtle);
  border-color: var(--surface-border);
  color: var(--text-secondary);
}

/* CHIP de persona (nombre clicable en formulario) */
.person-chip {
  padding: var(--space-1) var(--space-3);
  background: var(--surface-subtle);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.person-chip:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}
```

---

### 7.4 Panel / Sidebar section

Estructura de una sección colapsable en el sidebar:

```
┌─ SECTION ────────────────────────────────────────┐
│  [icono] Título de sección          [expand_more] │  ← Header (48px)
├──────────────────────────────────────────────────┤
│  contenido de la sección                         │
│                                                  │
└──────────────────────────────────────────────────┘
```

```css
.panel-section {
  border-bottom: 1px solid var(--surface-border);
}

.panel-section-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 0 var(--space-5);
  height: var(--panel-header);               /* 48px */
  cursor: pointer;
  user-select: none;
  transition: background var(--transition-fast);
}
.panel-section-header:hover { background: var(--surface-subtle); }

.panel-section-header .icon {
  font-size: 18px;
  color: var(--accent-primary);
}
.panel-section-header .title {
  flex: 1;
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  color: var(--text-primary);
}
.panel-section-header .chevron {
  font-size: 18px;
  color: var(--text-muted);
  transition: transform var(--transition-base);
}
.panel-section[open] .chevron { transform: rotate(180deg); }

.panel-section-content {
  padding: var(--space-4) var(--space-5);
}
```

---

### 7.5 Modal (PersonModal)

La ventana modal de ficha de persona es el componente más complejo. Sigue este layout:

```
┌─ MODAL ──────────────────────────────────────────┐
│  Ficha de persona: [Nombre Completo]    [✕ close] │  ← Header (56px)
├──────────────────────────────────────────────────┤
│  [tab] [tab] [tab●] [tab] [tab] [tab] [tab] [tab]│  ← Tab bar (48px)
├──────────────────────────────────────────────────┤
│                                                  │
│  CONTENIDO DEL TAB (scroll independiente)        │
│                                                  │
├──────────────────────────────────────────────────┤
│                         [Seleccionar persona]    │  ← Footer (56px)
└──────────────────────────────────────────────────┘
```

#### Modal container
```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  padding: var(--space-8);
}

.modal {
  background: var(--surface-overlay);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-xl);           /* 16px */
  width: min(900px, 90vw);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
}
```

#### Modal header
```css
.modal-header {
  display: flex;
  align-items: center;
  padding: 0 var(--space-6);
  height: 56px;
  border-bottom: 1px solid var(--surface-border);
  flex-shrink: 0;
}
.modal-header-title {
  flex: 1;
  font-family: var(--font-ui);
  font-size: var(--text-md);
  font-weight: var(--weight-semibold);
  color: var(--text-primary);
}
.modal-close {
  /* btn-icon ghost */
  color: var(--text-muted);
}
.modal-close:hover { color: var(--text-primary); }
```

#### Tab bar
```css
.tab-bar {
  display: flex;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--surface-border);
  overflow-x: auto;
  flex-shrink: 0;
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--text-secondary);
  border: none;
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition-fast);
}

.tab:hover {
  background: var(--surface-subtle);
  color: var(--text-primary);
}

/* TAB ACTIVO */
.tab.active {
  background: var(--accent-primary);
  color: var(--text-inverse);
}
.tab.active .material-symbols-outlined {
  font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 18;
}
```

#### Modal body y footer
```css
.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-6);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--surface-border);
  flex-shrink: 0;
}
```

---

### 7.6 Section card (dentro del modal body)

Secciones con título e icono dentro de tabs:

```css
.section-card {
  background: var(--surface-elevated);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-4);
  overflow: hidden;
}

.section-card-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--surface-border);
}
.section-card-header .icon {
  font-size: 20px;
  color: var(--accent-primary);
}
.section-card-header h3 {
  font-family: var(--font-ui);
  font-size: var(--text-md);
  font-weight: var(--weight-semibold);
  color: var(--text-primary);
}

.section-card-body {
  padding: var(--space-4) var(--space-5);
}
```

---

### 7.7 Data row (fila clave-valor)

Para mostrar datos de identidad (nombre, sexo, fechas, etc.):

```css
.data-row {
  display: flex;
  align-items: baseline;
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--surface-border-subtle);
  gap: var(--space-4);
}
.data-row:last-child { border-bottom: none; }

.data-row-label {
  flex-shrink: 0;
  width: 140px;
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.data-row-value {
  flex: 1;
  font-size: var(--text-base);
  color: var(--text-primary);
  text-align: right;
}

.data-row-value.empty {
  color: var(--text-muted);
  font-style: italic;
}
```

---

### 7.8 Slider (panel configuración árbol)

```css
.slider-row {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.slider-label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}
.slider-value {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-primary);
  min-width: 24px;
  text-align: right;
}

input[type="range"] {
  width: 100%;
  height: 4px;
  accent-color: var(--accent-primary);
  border-radius: var(--radius-full);
}
```

---

### 7.9 Capa de análisis (lista de layers)

```css
.layer-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--surface-border-subtle);
}

.layer-dot {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
  margin-top: 4px;
}

.layer-info h4 {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--text-primary);
  margin-bottom: 2px;
}

.layer-info p {
  font-size: var(--text-xs);
  color: var(--text-muted);
  line-height: var(--leading-relaxed);
}

/* Cuando la capa está activa */
.layer-item.active .layer-info h4 { color: var(--accent-primary); }
```

---

### 7.10 Panel de detalles (right panel)

```
┌─ DETALLES ──────────────────────── [∧ collapse] ─┐
│  [Nombre completo]                    [👁] [✎]   │  ← Nombre + acciones
│  [Prefix] [Given] /Surnames/ [Suffix]            │  ← Variante primaria
│  @ID@ · [Title]                                   │  ← Identidad + Nobleza/Academia
│  Sexo: M                                          │
│  nac. ABT 1899 · def. EST 1975                    │
│  👨‍👩‍👧 2 padres · 💍 1 pareja · 👶 1 hijo            │
├──────────────────────────────────────────────────┤
│  Familiares                              [4] [-]  │  ← Subsección
│  ── Padres ──────────────────────── [2]          │
│  [+ Agregar padre] [↔] [+ Agregar madre] [↔]     │
│  Valente Saucedo             [👁] [✎] [↗]         │
│  Lorenza Sánchez             [👁] [✎] [↗]         │
│  ── Parejas ─────────────────────────────────────│
│  ...                                             │
└──────────────────────────────────────────────────┘
```

```css
.detail-panel {
  width: 320px;
  height: 100%;
  background: var(--surface-elevated);
  border-left: 1px solid var(--surface-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.detail-panel-header {
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--surface-border);
  flex-shrink: 0;
}

.detail-person-name {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--text-primary);
  line-height: var(--leading-tight);
  margin-bottom: var(--space-1);
}

.detail-meta {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: var(--leading-relaxed);
}

.detail-meta-id {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.detail-title {
  font-weight: var(--weight-semibold);
  color: var(--accent-primary-muted);
  font-size: var(--text-xs);
  margin-left: var(--space-2);
}

.detail-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
}
```

---

## Navegacion
[<- 06_iconos](./06_iconos.md) | [Siguiente: 08_patrones_ux_interaccion ->](./08_patrones_ux_interaccion.md)


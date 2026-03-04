# 08 - Patrones de UX e interacción

## 8. Patrones de UX e interacción

### 8.1 ⚡ Edición inline — el patrón CORRECTO

> **Problema actual:** Cuando el usuario hace clic en "Editar familia", el formulario aparece más abajo, desconectado visualmente del card que está editando.
> **Solución:** El formulario reemplaza (o expande) el mismo card.

#### Patrón: Expand-in-place

El card pasa de modo "vista" a modo "edición" en el mismo lugar:

```
ANTES (modo vista):                    DESPUÉS (modo edición):
┌─────────────────────────────┐        ┌─────────────────────────────┐
│ @F69@          Origen·Pareja│        │ @F69@  ✎ Editando    [✓][✕]│
│ Padre:  [Valente Saucedo]   │  →     │ Padre: [Valente S. ▾      ] │
│ Madre:  [Lorenza Sánchez]   │        │ Madre: [Lorenza S.  ▾      ] │
│ Hijos:  [Clem...] [Juana...]│        │ Hijos: [Clemente] [x]        │
│ [Editar familia] [Quitar]   │        │        [Juana]    [x]        │
└─────────────────────────────┘        │        [+ agregar hijo]      │
                                       │ [Guardar cambios]            │
                                       └─────────────────────────────┘
```

**Implementación React:**
```tsx
// Estado del card
const [isEditing, setIsEditing] = useState(false);

return (
  <div className={`family-card ${isEditing ? 'editing' : ''}`}>
    {isEditing ? (
      <FamilyEditForm 
        family={family}
        onSave={() => setIsEditing(false)}
        onCancel={() => setIsEditing(false)}
      />
    ) : (
      <FamilyViewCard 
        family={family}
        onEdit={() => setIsEditing(true)}
      />
    )}
  </div>
);
```

**CSS del card en modo edición:**
```css
.family-card.editing {
  border-color: var(--accent-primary-border);
  background: var(--accent-primary-muted);
}
```

---

### 8.2 Hover states — filas de personas

Las filas de personas en el panel de detalles y en los cards de familia deben revelar sus acciones al hacer hover:

```
ESTADO NORMAL:
│ Valente Saucedo                                 │

HOVER:
│ Valente Saucedo         [👁] [✎] [↗]           │
```

```css
.person-row {
  display: flex;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
}
.person-row:hover { background: var(--surface-subtle); }

.person-row-name {
  flex: 1;
  font-size: var(--text-base);
  color: var(--text-primary);
}

.person-row-actions {
  display: flex;
  gap: var(--space-1);
  opacity: 0;
  transition: opacity var(--transition-fast);
}
.person-row:hover .person-row-actions { opacity: 1; }
```

---

### 8.3 Estados de carga

Siempre mostrar feedback visual durante operaciones async:

```css
/* Skeleton loader para filas */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--surface-subtle) 25%,
    var(--surface-overlay) 50%,
    var(--surface-subtle) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-sm);
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

### 8.4 Notificaciones / Toast

```
Posición: esquina inferior derecha
Duración: 3s (info/success) · 5s (error) · manual (warning)
Stack: máximo 3 toasts visibles
```

```css
.toast-container {
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.toast {
  padding: var(--space-3) var(--space-4);
  background: var(--surface-overlay);
  border: 1px solid var(--surface-border);
  border-left: 3px solid var(--accent-primary); /* cambia según tipo */
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--text-primary);
  box-shadow: var(--shadow-md);
  animation: slideIn 200ms ease;
}

@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}
```

---

### 8.5 Confirmación de acciones destructivas

**NUNCA** eliminar, quitar vínculo, o borrar datos sin confirmación.

Patrón: **inline confirmation** (no modal separado para acciones simples):

```
ANTES:
[Quitar vínculo]

CLIC:
[¿Confirmar?]  [Sí, quitar]  [Cancelar]
```

```tsx
const [confirming, setConfirming] = useState(false);

{confirming ? (
  <div className="confirm-row">
    <span>¿Confirmar?</span>
    <button className="btn-danger" onClick={handleRemove}>Sí, quitar</button>
    <button className="btn-ghost" onClick={() => setConfirming(false)}>Cancelar</button>
  </div>
) : (
  <button className="btn-danger" onClick={() => setConfirming(true)}>
    Quitar vínculo
  </button>
)}
```

---

### 8.6 Scroll dentro de modales

- El **header** y **footer** del modal son `position: sticky` / `flex-shrink: 0` — nunca se scrollean
- La **tab bar** es `flex-shrink: 0` — siempre visible
- Solo el **body** hace scroll: `overflow-y: auto`
- El overlay del modal NO hace scroll

---

## Navegacion
[<- 07_componentes_especificaciones](./07_componentes_especificaciones.md) | [Siguiente: 09_pantallas_clave_anatomia ->](./09_pantallas_clave_anatomia.md)


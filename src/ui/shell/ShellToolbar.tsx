import type { MenuItem } from "@/ui/TopMenuBar";

type ShellToolbarProps = {
  actions: MenuItem[];
  menuLayout: "frequency" | "role" | "hybrid";
};

const LAYOUT_META: Record<ShellToolbarProps["menuLayout"], { short: string; label: string }> = {
  frequency: { short: "A", label: "Por Frecuencia" },
  role: { short: "B", label: "Por Rol" },
  hybrid: { short: "C", label: "Hibrido" },
};

export function ShellToolbar({ actions, menuLayout }: ShellToolbarProps) {
  const layoutMeta = LAYOUT_META[menuLayout];

  return (
    <div className="shell-toolbar__inner">
      <div className="shell-toolbar__context">
        <span className="shell-toolbar__label">Workspace Shell</span>
        <span className="shell-toolbar__badge" title={`Disposicion activa ${layoutMeta.short}`}>
          {layoutMeta.short}
        </span>
        <span className="shell-toolbar__mode">{layoutMeta.label}</span>
      </div>

      <div className="shell-toolbar__actions" role="toolbar" aria-label="Acciones globales">
        {actions.map((action) => (
          <button
            key={action.id}
            className="shell-toolbar__action"
            title={action.label}
            disabled={action.disabled}
            onClick={() => action.onClick?.()}
          >
            <span className="shell-toolbar__action-icon" aria-hidden="true">
              {action.icon || <span className="material-symbols-outlined">bolt</span>}
            </span>
            <span className="shell-toolbar__action-label">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

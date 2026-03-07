import { useState } from "react";
import type { SelectedPersonPanelViewModel } from "@/app-shell/facade/types";
import type { PendingRelationType } from "@/types/domain";

type Props = {
  viewModel: SelectedPersonPanelViewModel;
  detailsMode: "expanded" | "compact";
  onToggleDetailsExpanded: () => void;
  onEditPerson: (personId: string) => void;
  onViewPersonDetail: (personId: string) => void;
  onAddRelation: (personId: string, type: PendingRelationType) => void;
  onLinkExistingRelation: (anchorId: string, type: PendingRelationType) => void;
  onUnlinkRelation: (personId: string, relatedId: string, type: "parent" | "child" | "spouse") => void;
};

export function RightPanel({
  viewModel,
  detailsMode,
  onToggleDetailsExpanded,
  onEditPerson,
  onViewPersonDetail,
  onAddRelation,
  onLinkExistingRelation,
  onUnlinkRelation,
}: Props) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    bio: true,
    parents: true,
    spouses: true,
    children: true,
  });

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (viewModel.kind === "empty") {
    return (
      <div className="gs-panel" style={{ height: "100%" }}>
        <div className="gs-panel-header">
          <span className="material-symbols-outlined gs-panel-header-icon">person_off</span>
          <span className="gs-panel-header-title">Sin seleccion</span>
        </div>
        <div
          className="gs-panel-body"
          style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: 0.5, textAlign: "center", padding: "40px 20px" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 48, marginBottom: 12 }}>person_search</span>
          <p style={{ fontSize: 13, lineHeight: 1.5 }}>Selecciona a una persona en el arbol para ver sus detalles y familiares.</p>
        </div>
      </div>
    );
  }

  const { person, parents, spouses, children } = viewModel;

  return (
    <div className="gs-panel" style={{ height: "100%" }}>
      <div className="gs-panel-header">
        <span className="material-symbols-outlined gs-panel-header-icon">contact_page</span>
        <span className="gs-panel-header-title">Detalles</span>
        <div className="gs-panel-header-actions">
          <button className="panel-icon-btn" onClick={() => onEditPerson(person.id)} title="Editar persona">
            <span className="material-symbols-outlined">edit</span>
          </button>
          <button className="panel-icon-btn" onClick={() => onViewPersonDetail(person.id)} title="Ficha completa">
            <span className="material-symbols-outlined">open_in_new</span>
          </button>
          <div className="gs-panel-divider--v" />
          <button className="panel-icon-btn" onClick={onToggleDetailsExpanded} title={detailsMode === "expanded" ? "Compactar" : "Expandir"}>
            <span className="material-symbols-outlined">{detailsMode === "expanded" ? "collapse_all" : "expand_all"}</span>
          </button>
        </div>
      </div>

      <div className="gs-panel-body" style={{ padding: "0 0 20px 0" }}>
        <div style={{ padding: "20px 16px", borderBottom: "1px solid var(--line-soft)", background: "var(--bg-panel-alt)" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px 0", color: "var(--gs-ink-primary)" }}>{person.name}</h2>
          <div style={{ display: "flex", gap: "8px", color: "var(--gs-ink-muted)", fontSize: 12 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>fingerprint</span>
            <code>{person.id}</code>
            <span style={{ opacity: 0.3 }}>|</span>
            <span>{person.sex === "M" ? "Hombre" : person.sex === "F" ? "Mujer" : "No definido"}</span>
          </div>
        </div>

        <div className={`gs-panel-section ${openSections.bio ? "gs-panel-section--open" : "gs-panel-section--closed"}`}>
          <div className="gs-panel-section-header" onClick={() => toggleSection("bio")}>
            <span className="material-symbols-outlined gs-panel-section-icon">badge</span>
            <span className="gs-panel-section-label">Vida</span>
            <span className="material-symbols-outlined gs-panel-section-chevron">expand_more</span>
          </div>
          <div className="gs-panel-section-body" style={{ padding: "10px 20px" }}>
            <div style={{ display: "grid", gap: "12px" }}>
              <div style={{ display: "flex", gap: "10px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--gs-accent-gold)" }}>celebration</span>
                <div>
                  <div style={{ fontSize: 11, color: "var(--gs-ink-muted)", fontWeight: 600, textTransform: "uppercase" }}>Nacimiento</div>
                  <div style={{ fontSize: 13 }}>{person.birthDate || "Fecha desconocida"}</div>
                  <div style={{ fontSize: 12, color: "var(--gs-ink-secondary)" }}>{person.birthPlace || "Lugar desconocido"}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--gs-ink-muted)" }}>shutter_speed</span>
                <div>
                  <div style={{ fontSize: 11, color: "var(--gs-ink-muted)", fontWeight: 600, textTransform: "uppercase" }}>Defuncion</div>
                  <div style={{ fontSize: 13 }}>{person.deathDate || (person.lifeStatus === "alive" ? "Vive" : "Fecha desconocida")}</div>
                  <div style={{ fontSize: 12, color: "var(--gs-ink-secondary)" }}>{person.deathPlace || (person.lifeStatus === "alive" ? "" : "Lugar desconocido")}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {[
          { key: "parents", label: "Padres", items: parents, unlinkType: "parent" as const, addTypes: ["father", "mother"] as const },
          { key: "spouses", label: "Parejas", items: spouses, unlinkType: "spouse" as const, addTypes: ["spouse"] as const },
          { key: "children", label: "Hijos", items: children, unlinkType: "child" as const, addTypes: ["child"] as const },
        ].map((section) => (
          <div key={section.key} className={`gs-panel-section ${openSections[section.key] ? "gs-panel-section--open" : "gs-panel-section--closed"}`}>
            <div className="gs-panel-section-header" onClick={() => toggleSection(section.key)}>
              <span className="material-symbols-outlined gs-panel-section-icon">
                {section.key === "parents" ? "escalator_warning" : section.key === "spouses" ? "favorite" : "child_care"}
              </span>
              <span className="gs-panel-section-label">{section.label} ({section.items.length})</span>
              <span className="material-symbols-outlined gs-panel-section-chevron">expand_more</span>
            </div>
            <div className="gs-panel-section-body" style={{ padding: "8px 12px" }}>
              {section.items.map((related) => (
                <div key={related.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 8px", borderRadius: "6px" }} className="gs-list-item">
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    {section.key === "parents" ? (related.sex === "M" ? "male" : "female") : section.key === "spouses" ? "favorite" : "child_care"}
                  </span>
                  <span style={{ fontSize: 13, flex: 1, cursor: "pointer" }} onClick={() => onViewPersonDetail(related.id)}>{related.name}</span>
                  <button className="panel-icon-btn" onClick={() => onUnlinkRelation(person.id, related.id, section.unlinkType)} title="Desvincular">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>link_off</span>
                  </button>
                </div>
              ))}

              {section.key === "parents" ? (
                <div style={{ display: "flex", gap: "4px", marginTop: "8px" }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                    <button className="gs-panel-btn-subtle" onClick={() => onAddRelation(person.id, "father")}>+ Padre</button>
                    <button className="gs-panel-btn-subtle" style={{ fontSize: 9 }} onClick={() => onLinkExistingRelation(person.id, "father")}>Vincular existente</button>
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                    <button className="gs-panel-btn-subtle" onClick={() => onAddRelation(person.id, "mother")}>+ Madre</button>
                    <button className="gs-panel-btn-subtle" style={{ fontSize: 9 }} onClick={() => onLinkExistingRelation(person.id, "mother")}>Vincular existente</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "4px", marginTop: "8px" }}>
                  <button className="gs-panel-btn-subtle" style={{ flex: 1 }} onClick={() => onAddRelation(person.id, section.addTypes[0])}>
                    {section.key === "spouses" ? "+ Pareja" : "+ Hijo"}
                  </button>
                  <button className="gs-panel-btn-subtle" style={{ flex: 1, fontSize: 10 }} onClick={() => onLinkExistingRelation(person.id, section.addTypes[0])}>
                    Vincular existente
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

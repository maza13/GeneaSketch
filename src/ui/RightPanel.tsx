import { useMemo, useState } from "react";
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

function formatLifeLine(viewModel: Extract<SelectedPersonPanelViewModel, { kind: "selected" }>) {
  const birth = viewModel.person.birthDate || "Fecha desconocida";
  const death = viewModel.person.deathDate || (viewModel.person.lifeStatus === "alive" ? "Presente" : "Fecha desconocida");
  return `${birth} - ${death}`;
}

export function RightPanel(props: Props) {
  const { viewModel, detailsMode, onToggleDetailsExpanded, onViewPersonDetail } = props;
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    life: true,
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
          <p style={{ fontSize: 13, lineHeight: 1.5 }}>Selecciona a una persona en el arbol para ver su ficha rapida.</p>
        </div>
      </div>
    );
  }

  const { person, parents, spouses, children } = viewModel;
  const summaryCounts = useMemo(
    () => [
      { label: "Padres", value: parents.length, icon: "escalator_warning" },
      { label: "Parejas", value: spouses.length, icon: "favorite" },
      { label: "Hijos", value: children.length, icon: "child_care" },
    ],
    [children.length, parents.length, spouses.length],
  );

  return (
    <div className="gs-panel" style={{ height: "100%" }}>
      <div className="gs-panel-header">
        <span className="material-symbols-outlined gs-panel-header-icon">contact_page</span>
        <span className="gs-panel-header-title">Ficha rapida</span>
        <div className="gs-panel-header-actions">
          <button className="panel-icon-btn" onClick={() => onViewPersonDetail(person.id)} title="Abrir expediente">
            <span className="material-symbols-outlined">open_in_new</span>
          </button>
          <div className="gs-panel-divider--v" />
          <button className="panel-icon-btn" onClick={onToggleDetailsExpanded} title={detailsMode === "expanded" ? "Compactar" : "Expandir"}>
            <span className="material-symbols-outlined">{detailsMode === "expanded" ? "collapse_all" : "expand_all"}</span>
          </button>
        </div>
      </div>

      <div className="gs-panel-body" style={{ padding: "0 0 20px 0" }}>
        <div className="right-panel-summary">
          <div className="right-panel-summary__header">
            <h2>{person.name}</h2>
            <button type="button" className="panel-header-btn" onClick={() => onViewPersonDetail(person.id)}>
              <span className="material-symbols-outlined">description</span>
              Abrir expediente
            </button>
          </div>
          <div className="right-panel-summary__meta">
            <span className="material-symbols-outlined">fingerprint</span>
            <code>{person.id}</code>
            <span aria-hidden="true">•</span>
            <span>{person.sex === "M" ? "Hombre" : person.sex === "F" ? "Mujer" : "No definido"}</span>
            <span aria-hidden="true">•</span>
            <span>{formatLifeLine(viewModel)}</span>
          </div>
          <div className="right-panel-summary__stats">
            {summaryCounts.map((item) => (
              <div key={item.label} className="right-panel-summary__stat">
                <span className="material-symbols-outlined">{item.icon}</span>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`gs-panel-section ${openSections.life ? "gs-panel-section--open" : "gs-panel-section--closed"}`}>
          <div className="gs-panel-section-header" onClick={() => toggleSection("life")}>
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
          { key: "parents", label: "Padres", items: parents, icon: "escalator_warning" },
          { key: "spouses", label: "Parejas", items: spouses, icon: "favorite" },
          { key: "children", label: "Hijos", items: children, icon: "child_care" },
        ].map((section) => (
          <div key={section.key} className={`gs-panel-section ${openSections[section.key] ? "gs-panel-section--open" : "gs-panel-section--closed"}`}>
            <div className="gs-panel-section-header" onClick={() => toggleSection(section.key)}>
              <span className="material-symbols-outlined gs-panel-section-icon">{section.icon}</span>
              <span className="gs-panel-section-label">{section.label} ({section.items.length})</span>
              <span className="material-symbols-outlined gs-panel-section-chevron">expand_more</span>
            </div>
            <div className="gs-panel-section-body" style={{ padding: "8px 12px" }}>
              {section.items.length === 0 ? (
                <div className="right-panel-related-empty">Sin registros vinculados.</div>
              ) : (
                section.items.map((related) => (
                  <button
                    key={related.id}
                    type="button"
                    className="right-panel-related-link gs-list-item"
                    onClick={() => onViewPersonDetail(related.id)}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                      {section.key === "parents" ? (related.sex === "M" ? "male" : related.sex === "F" ? "female" : "person") : section.icon}
                    </span>
                    <span className="right-panel-related-link__name">{related.name}</span>
                    <span className="material-symbols-outlined right-panel-related-link__arrow">chevron_right</span>
                  </button>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

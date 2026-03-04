import { useState } from "react";
import type { GraphDocument, Person, PendingRelationType } from "@/types/domain";


type Props = {
    document: GraphDocument | null;
    selectedPersonId: string | null;
    detailsMode: "expanded" | "compact";
    onToggleDetailsExpanded: () => void;
    onEditPerson: (personId: string) => void;
    onViewPersonDetail: (personId: string) => void;
    onAddRelation: (personId: string, type: PendingRelationType) => void;
    onLinkExistingRelation: (anchorId: string, type: PendingRelationType) => void;
    onUnlinkRelation: (personId: string, relatedId: string, type: "parent" | "child" | "spouse") => void;
};

export function RightPanel({
    document,
    selectedPersonId,
    detailsMode,
    onToggleDetailsExpanded,
    onEditPerson,
    onViewPersonDetail,
    onAddRelation,
    onLinkExistingRelation,
    onUnlinkRelation,
}: Props) {
    // Local state for section collapsing
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        bio: true,
        parents: true,
        spouses: true,
        children: true,
    });

    const toggleSection = (id: string) => {
        setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const person = selectedPersonId && document ? document.persons[selectedPersonId] : null;

    // Helper to find relatives
    const getParents = (p: Person) => {
        if (!document) return [];
        return Object.values(document.families)
            .filter((f) => f.childrenIds.includes(p.id))
            .flatMap((f) => [f.husbandId, f.wifeId])
            .filter((id): id is string => !!id && id !== p.id)
            .map((id) => document.persons[id])
            .filter((p): p is Person => !!p);
    };

    const getSpouses = (p: Person) => {
        if (!document) return [];
        return p.fams
            .map((famId) => document.families[famId])
            .filter(Boolean)
            .map((f) => (f.husbandId === p.id ? f.wifeId : f.husbandId))
            .filter((id): id is string => !!id)
            .map((id) => document.persons[id])
            .filter((p): p is Person => !!p);
    };

    const getChildren = (p: Person) => {
        if (!document) return [];
        return p.fams
            .map((famId) => document.families[famId])
            .filter(Boolean)
            .flatMap((f) => f.childrenIds)
            .map((id) => document.persons[id])
            .filter((p): p is Person => !!p);
    };

    if (!person) {
        return (
            <div className="gs-panel" style={{ height: "100%" }}>
                <div className="gs-panel-header">
                    <span className="material-symbols-outlined gs-panel-header-icon">person_off</span>
                    <span className="gs-panel-header-title">Sin selección</span>
                </div>
                <div className="gs-panel-body" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: 0.5, textAlign: "center", padding: "40px 20px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 48, marginBottom: 12 }}>person_search</span>
                    <p style={{ fontSize: 13, lineHeight: 1.5 }}>Selecciona a una persona en el árbol para ver sus detalles y familiares.</p>
                </div>
            </div>
        );
    }

    const parents = getParents(person);
    const spouses = getSpouses(person);
    const children = getChildren(person);

    return (
        <div className="gs-panel" style={{ height: "100%" }}>
            {/* ── Panel Header ─────────────────────────────── */}
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

            {/* ── Panel Body ───────────────────────────────── */}
            <div className="gs-panel-body" style={{ padding: "0 0 20px 0" }}>

                {/* Person Primary Info */}
                <div style={{ padding: "20px 16px", borderBottom: "1px solid var(--line-soft)", background: "var(--bg-panel-alt)" }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px 0", color: "var(--gs-ink-primary)" }}>{person.name}</h2>
                    <div style={{ display: "flex", gap: "8px", color: "var(--gs-ink-muted)", fontSize: 12 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>fingerprint</span>
                        <code>{person.id}</code>
                        <span style={{ opacity: 0.3 }}>|</span>
                        <span>{person.sex === "M" ? "Hombre" : person.sex === "F" ? "Mujer" : "No definido"}</span>
                    </div>
                </div>

                {/* Section: Biografía rápida */}
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
                                    <div style={{ fontSize: 11, color: "var(--gs-ink-muted)", fontWeight: 600, textTransform: "uppercase" }}>Defunción</div>
                                    <div style={{ fontSize: 13 }}>{person.deathDate || (person.lifeStatus === "alive" ? "Vive" : "Fecha desconocida")}</div>
                                    <div style={{ fontSize: 12, color: "var(--gs-ink-secondary)" }}>{person.deathPlace || (person.lifeStatus === "alive" ? "" : "Lugar desconocido")}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section: Padres */}
                <div className={`gs-panel-section ${openSections.parents ? "gs-panel-section--open" : "gs-panel-section--closed"}`}>
                    <div className="gs-panel-section-header" onClick={() => toggleSection("parents")}>
                        <span className="material-symbols-outlined gs-panel-section-icon">escalator_warning</span>
                        <span className="gs-panel-section-label">Padres ({parents.length})</span>
                        <span className="material-symbols-outlined gs-panel-section-chevron">expand_more</span>
                    </div>
                    <div className="gs-panel-section-body" style={{ padding: "8px 12px" }}>
                        {parents.map(p => (
                            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 8px", borderRadius: "6px" }} className="gs-list-item">
                                <span className="material-symbols-outlined" style={{ fontSize: 20, color: p.sex === "M" ? "#3b82f6" : "#ec4899" }}>
                                    {p.sex === "M" ? "male" : "female"}
                                </span>
                                <span style={{ fontSize: 13, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", cursor: "pointer" }} onClick={() => onViewPersonDetail(p.id)}>{p.name}</span>
                                <button className="panel-icon-btn" onClick={() => onUnlinkRelation(person.id, p.id, "parent")} title="Desvincular">
                                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>link_off</span>
                                </button>
                            </div>
                        ))}
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
                    </div>
                </div>

                {/* Section: Parejas */}
                <div className={`gs-panel-section ${openSections.spouses ? "gs-panel-section--open" : "gs-panel-section--closed"}`}>
                    <div className="gs-panel-section-header" onClick={() => toggleSection("spouses")}>
                        <span className="material-symbols-outlined gs-panel-section-icon">favorite</span>
                        <span className="gs-panel-section-label">Parejas ({spouses.length})</span>
                        <span className="material-symbols-outlined gs-panel-section-chevron">expand_more</span>
                    </div>
                    <div className="gs-panel-section-body" style={{ padding: "8px 12px" }}>
                        {spouses.map(p => (
                            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 8px", borderRadius: "6px" }} className="gs-list-item">
                                <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--gs-accent-red)" }}>favorite</span>
                                <span style={{ fontSize: 13, flex: 1, cursor: "pointer" }} onClick={() => onViewPersonDetail(p.id)}>{p.name}</span>
                                <button className="panel-icon-btn" onClick={() => onUnlinkRelation(person.id, p.id, "spouse")} title="Desvincular">
                                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>link_off</span>
                                </button>
                            </div>
                        ))}
                        <div style={{ display: "flex", gap: "4px", marginTop: "8px" }}>
                            <button className="gs-panel-btn-subtle" style={{ flex: 1 }} onClick={() => onAddRelation(person.id, "spouse")}>+ Pareja</button>
                            <button className="gs-panel-btn-subtle" style={{ flex: 1, fontSize: 10 }} onClick={() => onLinkExistingRelation(person.id, "spouse")}>Vincular existente</button>
                        </div>
                    </div>
                </div>

                {/* Section: Hijos */}
                <div className={`gs-panel-section ${openSections.children ? "gs-panel-section--open" : "gs-panel-section--closed"}`}>
                    <div className="gs-panel-section-header" onClick={() => toggleSection("children")}>
                        <span className="material-symbols-outlined gs-panel-section-icon">child_care</span>
                        <span className="gs-panel-section-label">Hijos ({children.length})</span>
                        <span className="material-symbols-outlined gs-panel-section-chevron">expand_more</span>
                    </div>
                    <div className="gs-panel-section-body" style={{ padding: "8px 12px" }}>
                        <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                            {children.map(p => (
                                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 8px", borderRadius: "6px" }} className="gs-list-item">
                                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--gs-ink-muted)" }}>child_care</span>
                                    <span style={{ fontSize: 13, flex: 1, cursor: "pointer" }} onClick={() => onViewPersonDetail(p.id)}>{p.name}</span>
                                    <button className="panel-icon-btn" onClick={() => onUnlinkRelation(person.id, p.id, "child")} title="Desvincular">
                                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>link_off</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: "flex", gap: "4px", marginTop: "8px" }}>
                            <button className="gs-panel-btn-subtle" style={{ flex: 1 }} onClick={() => onAddRelation(person.id, "child")}>+ Hijo</button>
                            <button className="gs-panel-btn-subtle" style={{ flex: 1, fontSize: 10 }} onClick={() => onLinkExistingRelation(person.id, "child")}>Vincular existente</button>
                        </div>
                    </div>
                </div>

                {/* ── Future slots (reserved space) ─────────────── */}
                <div className="gs-panel-divider" style={{ margin: "16px 12px" }} />

                <div className="gs-panel-section gs-panel-section--future">
                    <div className="gs-panel-section-header">
                        <span className="material-symbols-outlined gs-panel-section-icon">sticky_note_2</span>
                        <span className="gs-panel-section-label">Notas rápidas</span>
                        <span className="gs-panel-future-badge">Pronto</span>
                    </div>
                </div>

                <div className="gs-panel-section gs-panel-section--future">
                    <div className="gs-panel-section-header">
                        <span className="material-symbols-outlined gs-panel-section-icon">source</span>
                        <span className="gs-panel-section-label">Fuentes vinculadas</span>
                        <span className="gs-panel-future-badge">Pronto</span>
                    </div>
                </div>

                <div className="gs-panel-section gs-panel-section--future">
                    <div className="gs-panel-section-header">
                        <span className="material-symbols-outlined gs-panel-section-icon">psychology</span>
                        <span className="gs-panel-section-label">Hipótesis</span>
                        <span className="gs-panel-future-badge">Pronto</span>
                    </div>
                </div>

            </div>
        </div>
    );
}

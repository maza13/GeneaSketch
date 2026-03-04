import { useState, useMemo } from "react";
import type { GraphDocument } from "@/types/domain";
import { extractSubTree, type ExtractDirection } from "@/core/edit/generators";

type Props = {
    document: GraphDocument;
    personId: string;
    onClose: () => void;
    onExport: (direction: ExtractDirection) => void;
};

const EXTRACTION_OPTIONS: { value: ExtractDirection; label: string; desc: string }[] = [
    { value: "all_ancestors", label: "? Todos los Ancestros", desc: "Extrae a todos los antepasados directos y colaterales conectados hacia arriba." },
    { value: "paternal_ancestors", label: "??? Ancestros Paternos", desc: "Extrae solo la rama patrilineal (padres, abuelos paternos, etc.)." },
    { value: "maternal_ancestors", label: "?? Ancestros Maternos", desc: "Extrae solo la rama matrilineal (madres, abuelas maternas, etc.)." },
    { value: "all_descendants", label: "?? Toda la Descendencia", desc: "Extrae a todos los hijos, nietos y familiares conectados hacia abajo." }
];

export function BranchExtractionModal({ document, personId, onClose, onExport }: Props) {
    const [direction, setDirection] = useState<ExtractDirection>("all_ancestors");
    const person = document.persons[personId];

    const preview = useMemo(() => {
        if (!person) return null;
        const sub = extractSubTree(document, personId, direction);
        return {
            persons: Object.keys(sub.persons).length,
            families: Object.keys(sub.families).length
        };
    }, [document, personId, direction, person]);

    if (!person) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-panel" style={{ width: 480 }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Extraer y Exportar Rama</h3>
                    <button onClick={onClose}>Cerrar</button>
                </div>

                <div style={{ padding: "0 20px" }}>
                    <p style={{ margin: "10px 0 20px 0", color: "var(--ink-muted)" }}>
                        Selecciona qué parte del árbol de <strong>{person.name} {person.surname}</strong> deseas extraer a un nuevo archivo GSK.
                    </p>

                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {EXTRACTION_OPTIONS.map((opt) => (
                            <label
                                key={opt.value}
                                style={{
                                    display: "flex",
                                    gap: 12,
                                    padding: 16,
                                    border: "1px solid",
                                    borderColor: direction === opt.value ? "var(--accent)" : "var(--border)",
                                    borderRadius: 8,
                                    background: direction === opt.value ? "var(--accent-soft)" : "var(--surface)",
                                    cursor: "pointer",
                                    transition: "all 0.2s"
                                }}
                            >
                                <input
                                    type="radio"
                                    name="extraction_dir"
                                    value={opt.value}
                                    checked={direction === opt.value}
                                    onChange={() => setDirection(opt.value)}
                                    style={{ marginTop: 4 }}
                                />
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: "1.05em", color: direction === opt.value ? "var(--accent)" : "var(--ink)" }}>{opt.label}</div>
                                    <div style={{ fontSize: "0.85em", color: "var(--ink-muted)", marginTop: 4 }}>{opt.desc}</div>
                                </div>
                            </label>
                        ))}
                    </div>

                    <div style={{ marginTop: 24, padding: 16, background: "var(--bg-input)", border: "1px solid var(--border-light)", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <span style={{ fontSize: "0.85em", color: "var(--ink-muted)", display: "block", marginBottom: 4 }}>Vista Previa de Extracción</span>
                            <strong>{preview?.persons}</strong> Personas y <strong>{preview?.families}</strong> Familias
                        </div>
                    </div>
                </div>

                <div className="modal-footer" style={{ padding: 20, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 16 }}>
                    <button onClick={onClose}>Cancelar</button>
                    <button className="primary" onClick={() => onExport(direction)}>
                        Exportar a archivo .GSK
                    </button>
                </div>
            </div>
        </div>
    );
}


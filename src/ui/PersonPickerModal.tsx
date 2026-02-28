import { useMemo, useState } from "react";
import type { GeneaDocument, PendingRelationType } from "@/types/domain";

type Props = {
    document: GeneaDocument;
    anchorId: string;
    relationType: PendingRelationType | "kinship";
    onLink: (existingPersonId: string) => void;
    onClose: () => void;
};

export function PersonPickerModal({ document, anchorId, relationType, onLink, onClose }: Props) {
    const [query, setQuery] = useState("");

    const title = relationType === "kinship" ? "Calcular parentesco con:" : `Vincular: ${relationType}`;

    const people = useMemo(() => {
        const q = query.toLowerCase().trim();
        // Exclude the anchor person themselves
        let list = Object.values(document.persons).filter(p => p.id !== anchorId);

        if (q) {
            list = list.filter(p => p.name.toLowerCase().includes(q) || (p.surname?.toLowerCase() ?? "").includes(q));
        }

        // Sort by name
        list.sort((a, b) => a.name.localeCompare(b.name));
        return list;
    }, [document, query, anchorId]);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-panel" style={{ width: 450, maxHeight: "80vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button onClick={onClose}>&times;</button>
                </div>

                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, flex: 1, overflow: "hidden" }}>
                    <input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar persona por nombre o apellido..."
                        style={{ width: "100%", padding: 8 }}
                    />

                    <div className="list" style={{ flex: 1, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
                        {people.length === 0 ? (
                            <div style={{ padding: 16, textAlign: "center", color: "var(--text-muted)" }}>No hay coincidencias</div>
                        ) : (
                            people.map(p => (
                                <button
                                    key={p.id}
                                    className="list-item"
                                    onClick={() => {
                                        onLink(p.id);
                                        onClose();
                                    }}
                                    style={{ textAlign: "left", width: "100%", borderBottom: "1px solid var(--border-light)", background: "none" }}
                                >
                                    <strong>{p.name} {p.surname || ""}</strong>
                                    <span style={{ fontSize: "0.85em", color: "var(--text-muted)", marginLeft: 8 }}>{p.id}</span>
                                    {p.events.find(e => e.type === "BIRT")?.date && (
                                        <div style={{ fontSize: "0.8em", color: "var(--text-muted)" }}>
                                            Nac: {p.events.find(e => e.type === "BIRT")?.date}
                                        </div>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

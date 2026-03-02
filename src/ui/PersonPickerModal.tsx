import { useMemo, useState } from "react";
import type { GeneaDocument, PendingRelationType } from "@/types/domain";
import { StandardModal } from "@/ui/common/StandardModal";

type Props = {
    document: GeneaDocument;
    anchorId: string;
    relationType: PendingRelationType | "kinship";
    onLink: (existingPersonId: string) => void;
    onClose: () => void;
};

export function PersonPickerModal({ document, anchorId, relationType, onLink, onClose }: Props) {
    const [query, setQuery] = useState("");

    const title = relationType === "kinship" ? "Calcular parentesco con" : `Vincular: ${relationType}`;

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
        <StandardModal
            open={true}
            title={title}
            onClose={onClose}
            size="md"
        >
            <div style={{ padding: '0 4px', display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
                <div style={{ position: 'relative' }}>
                    <span
                        className="material-symbols-outlined"
                        style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}
                    >
                        search
                    </span>
                    <input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar por nombre o apellido..."
                        style={{
                            width: '100%',
                            padding: '12px 12px 12px 40px',
                            borderRadius: 12,
                            border: '1px solid var(--modal-border)',
                            background: 'var(--bg-elev-1)',
                            fontSize: '15px'
                        }}
                    />
                </div>

                <div
                    className="gs-custom-scrollbar"
                    style={{
                        flex: 1,
                        maxHeight: '400px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        paddingRight: 4
                    }}
                >
                    {people.length === 0 ? (
                        <div className="gs-alert gs-alert--info" style={{ textAlign: 'center', padding: '30px 20px' }}>
                            No se han encontrado coincidencias
                        </div>
                    ) : (
                        people.map(p => (
                            <button
                                key={p.id}
                                className="secondary-ghost"
                                onClick={() => {
                                    onLink(p.id);
                                    onClose();
                                }}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    padding: '12px 16px',
                                    textAlign: 'left',
                                    width: '100%',
                                    borderRadius: 12,
                                    height: 'auto',
                                    gap: 4
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 600, fontSize: '15px' }}>{p.name} {p.surname || ""}</span>
                                    <span style={{ fontSize: '11px', opacity: 0.5, fontFamily: 'monospace' }}>{p.id}</span>
                                </div>
                                {p.events.find(e => e.type === "BIRT")?.date && (
                                    <div style={{ fontSize: '12px', opacity: 0.6, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>event</span>
                                        Nac: {p.events.find(e => e.type === "BIRT")?.date}
                                    </div>
                                )}
                            </button>
                        ))
                    )}
                </div>
            </div>
        </StandardModal>
    );
}

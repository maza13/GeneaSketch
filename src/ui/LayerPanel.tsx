import type { GeneaDocument } from "@/types/domain";
import { useAppStore } from "@/state/store";

export function LayerPanel({ document }: { document: GeneaDocument | null }) {
    const { viewConfig, setOverlay, clearOverlayType } = useAppStore();

    if (!document) return null;

    const activeOverlay = viewConfig?.dtree?.overlays.find(o => o.type === 'layer');
    const activeLayerId = activeOverlay?.config.layerId;

    const layers = [
        { id: "layer-symmetry", label: "Completitud y Simetria", icon: "🟢", desc: "Evalua falta de fechas y progenitores en ramas." },
        { id: "layer-places", label: "Coloreo Geografico", icon: "🌍", desc: "Muestra gradientes en base a los lugares de nacimiento." },
        { id: "layer-warnings", label: "Diagnostico Critico", icon: "🟠", desc: "Ilumina en rojo posibles errores logicos, incestos y fechas cronologicas imposibles." },
        { id: "layer-endogamy", label: "Colapso Consanguineo", icon: "🟣", desc: "Traza aristas especiales senalando familias con progenitores ciclicos." },
        { id: "layer-timeline", label: "Linea de Tiempo", icon: "🕒", desc: "Simulacion visual de vitalidad y eventos a traves de los años." }
    ];

    const toggleLayer = (layerId: string) => {
        if (activeLayerId === layerId) {
            clearOverlayType('layer');
            if (layerId === 'layer-timeline') clearOverlayType('timeline');
        } else {
            setOverlay({
                id: 'active-layer',
                type: 'layer',
                priority: 50,
                config: { layerId }
            });
            if (layerId === 'layer-timeline') {
                // Use the store's dedicated method to initialize timeline status
                useAppStore.getState().setTimelineStatus([], [], new Date().getFullYear(), []);
            }
        }
    };

    return (
        <div style={{ background: "var(--bg-panel)", padding: 12, borderRadius: 6, border: "1px solid var(--line)", marginBottom: 12 }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>layers</span>
                Capas de Analisis
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {layers.map((layer) => (
                    <label key={layer.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", opacity: activeLayerId === layer.id ? 1 : 0.7 }}>
                        <input
                            type="checkbox"
                            style={{ marginTop: 2 }}
                            checked={activeLayerId === layer.id}
                            onChange={() => toggleLayer(layer.id)}
                        />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500, color: activeLayerId === layer.id ? "var(--accent-strong)" : "var(--ink-1)", fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>
                                <span>{layer.icon}</span> {layer.label}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                                {layer.desc}
                            </div>
                        </div>
                    </label>
                ))}
            </div>
            {activeLayerId && (
                <div style={{ marginTop: 12, padding: 8, background: "var(--accent-soft)", borderRadius: 4, color: "var(--accent-strong)", fontSize: 12 }}>
                    Capa aplicada al lienzo actual.
                </div>
            )}
        </div>
    );
}

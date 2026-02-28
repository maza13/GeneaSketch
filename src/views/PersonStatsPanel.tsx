import { useMemo } from "react";
import { GeneaDocument } from "@/types/domain";
import { calculateDetailedStatistics, PersonStatistics } from "@/core/graph/statistics";
import { ContextCard } from "@/ui/context/ContextCard";
import { ContextHoverAnchor } from "@/ui/context/ContextHoverAnchor";

type Props = {
    document: GeneaDocument | null;
    personId: string | null;
    onClose: () => void;
};

export function PersonStatsPanel({ document, personId, onClose }: Props) {
    if (!document || !personId) return null;

    const person = document.persons[personId];
    if (!person) return null;

    const stats: PersonStatistics = useMemo(() => {
        return calculateDetailedStatistics(document, personId);
    }, [document, personId]);

    const breakdown = stats.relativesBreakdown;
    const totalRelatives = breakdown.reduce((acc, curr) => acc + curr.count, 0);

    const ancestorsBreakdown = breakdown.filter((item) => item.category === "ancestors").sort((a, b) => a.order - b.order);
    const descendantsBreakdown = breakdown.filter((item) => item.category === "descendants").sort((a, b) => a.order - b.order);
    const collateralBreakdown = breakdown.filter((item) => item.category === "collateral").sort((a, b) => a.order - b.order);

    const childbearing = stats.childbearingSummary;

    const childbearingRows = childbearing ? [
        {
            label: "Primer hijo",
            value: childbearing.firstChild
                ? `${childbearing.firstChild.childName} · ${childbearing.firstChild.childBirthRaw || childbearing.firstChild.childBirthYear || "N/D"}`
                : "No documentado",
            tone: "accent" as const
        },
        {
            label: "Edad al primer hijo",
            value: childbearing.firstChild?.parentAgeAtBirth !== undefined ? `${childbearing.firstChild.parentAgeAtBirth} años` : "N/D",
            tone: "normal" as const
        },
        {
            label: "Ultimo hijo",
            value: childbearing.lastChild
                ? `${childbearing.lastChild.childName} · ${childbearing.lastChild.childBirthRaw || childbearing.lastChild.childBirthYear || "N/D"}`
                : "No documentado",
            tone: "accent" as const
        },
        {
            label: "Edad al ultimo hijo",
            value: childbearing.lastChild?.parentAgeAtBirth !== undefined ? `${childbearing.lastChild.parentAgeAtBirth} años` : "N/D",
            tone: "normal" as const
        }
    ] : [];

    const renderBreakdownItem = (key: string, label: string, count: number) => (
        <div key={key} style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--bg-input)",
            padding: "10px 14px",
            borderRadius: 6
        }}>
            <span style={{ color: "var(--ink-0)", fontSize: 14 }}>{label}</span>
            <span style={{ background: "var(--bg-overlay)", padding: "2px 8px", borderRadius: 10, fontSize: 12, fontWeight: "bold", color: "var(--ink-0)" }}>
                {count}
            </span>
        </div>
    );

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
            <div
                className="modal-panel"
                style={{
                    width: 600,
                    maxHeight: "90vh",
                    display: "flex",
                    flexDirection: "column",
                    background: "var(--bg-modal)",
                    backdropFilter: "blur(16px)",
                    border: "1px solid var(--line)",
                    boxShadow: "var(--panel-shadow)",
                    padding: 0,
                    overflow: "hidden"
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ padding: "24px 24px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{
                            width: 56,
                            height: 56,
                            borderRadius: "50%",
                            background: person.sex === "M" ? "var(--timeline-type-birt)" : person.sex === "F" ? "var(--tree-endogamy-child)" : "var(--ink-muted)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 24,
                            fontWeight: "bold",
                            color: "white"
                        }}>
                            {person.name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: 22, color: "var(--ink-0)" }}>👤 {person.name || "Desconocido"}</h2>
                            <span style={{ color: "var(--ink-muted)", fontSize: 13 }}>ID: {person.id} • {totalRelatives} Familiares encontrados</span>
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--ink-muted)",
                        cursor: "pointer",
                        fontSize: 24,
                        padding: 8
                    }}>✕</button>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 18 }}>
                        <div style={{ background: "var(--bg-card)", padding: 16, borderRadius: 12, border: "1px solid var(--line-soft)", textAlign: "center" }}>
                            <div style={{ fontSize: 32, fontWeight: "bold", color: "var(--timeline-type-birt)", marginBottom: 4 }}>
                                {stats.totalAncestors}
                            </div>
                            <div style={{ color: "var(--ink-muted)", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>🌳 Ancestros</div>
                        </div>

                        <div style={{ background: "var(--bg-card)", padding: 16, borderRadius: 12, border: "1px solid var(--line-soft)", textAlign: "center" }}>
                            <div style={{ fontSize: 32, fontWeight: "bold", color: "var(--success-text)", marginBottom: 4 }}>
                                {stats.totalDescendants}
                            </div>
                            <div style={{ color: "var(--ink-muted)", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>👶 Descendientes</div>
                        </div>

                        <div style={{ background: "var(--bg-card)", padding: 16, borderRadius: 12, border: "1px solid var(--line-soft)", textAlign: "center" }}>
                            <div style={{ fontSize: 32, fontWeight: "bold", color: "var(--timeline-type-div)", marginBottom: 4 }}>
                                {stats.averageAncestralLifespan !== null ? stats.averageAncestralLifespan : "--"}
                            </div>
                            <div style={{ color: "var(--ink-muted)", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>⌛ Longevidad</div>
                            {stats.ancestorsWithLifespanData > 0 && (
                                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>Muestra de {stats.ancestorsWithLifespanData}</div>
                            )}
                        </div>
                    </div>

                    <div style={{ marginBottom: 26 }}>
                        <h3 style={{ margin: "0 0 8px 0", fontSize: 16, color: "var(--ink-0)" }}>🤱 Ventana de hijos</h3>
                        {childbearing && childbearing.firstChild && childbearing.lastChild ? (
                            <ContextHoverAnchor
                                anchor={
                                    <span style={{ color: "var(--ink-1)", fontSize: 13, textDecoration: "underline dotted", cursor: "default" }}>
                                        {childbearing.phrase}
                                    </span>
                                }
                                card={
                                    <ContextCard
                                        title="Primer y ultimo hijo"
                                        rows={childbearingRows}
                                        footer={childbearing.estimated ? "Estimado" : "Exacto"}
                                    />
                                }
                            />
                        ) : (
                            <span style={{ color: "var(--ink-muted)", fontSize: 13 }}>
                                {childbearing?.phrase || "No registra hijos."}
                            </span>
                        )}
                    </div>

                    <h3 style={{ margin: "0 0 16px 0", fontSize: 16, color: "var(--ink-0)", borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>
                        📊 Desglose de Parentesco
                    </h3>

                    {breakdown.length === 0 ? (
                        <div style={{ color: "var(--ink-muted)", fontStyle: "italic", textAlign: "center", padding: "40px 0" }}>
                            No tiene vínculos detectables en el árbol.
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "var(--ink-muted)" }}>🌳 Ancestros</div>
                                    {ancestorsBreakdown.map(({ key, label, count }) => renderBreakdownItem(key, label, count))}
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "var(--ink-muted)" }}>🍼 Descendientes</div>
                                    {descendantsBreakdown.map(({ key, label, count }) => renderBreakdownItem(key, label, count))}
                                </div>
                            </div>

                            {collateralBreakdown.length > 0 && (
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "var(--ink-muted)" }}>🤝 Colaterales</div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                        {collateralBreakdown.map(({ key, label, count }) => renderBreakdownItem(key, label, count))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

import type { TreePalette } from "@/views/dtree-v3/overlays/types";

type Props = {
  activeLayerId: string | null;
  hasFamilyOriginHighlight: boolean;
  hasDeepestHighlight: boolean;
  palette: TreePalette;
};

export function LayerLegendPanel({
  activeLayerId,
  hasFamilyOriginHighlight,
  hasDeepestHighlight,
  palette
}: Props) {
  const hasAny = Boolean(activeLayerId || hasFamilyOriginHighlight || hasDeepestHighlight);
  if (!hasAny) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        bottom: 24,
        left: 24,
        background: palette.overlayBg,
        border: "1px solid var(--line)",
        padding: "14px 18px",
        borderRadius: 8,
        color: "var(--text)",
        fontSize: 13,
        zIndex: 10,
        maxWidth: 350,
        boxShadow: palette.overlayShadow
      }}
    >
      <div style={{ fontWeight: "bold", marginBottom: 8, fontSize: 14 }}>Leyenda de Capa</div>
      {activeLayerId === "layer-symmetry" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: palette.success }} /> 2 padres identificados
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: palette.warning }} /> 1 padre identificado
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: palette.danger }} /> Callejon sin salida (0 padres)
          </div>
        </div>
      ) : null}

      {activeLayerId === "layer-places" ? (
        <div style={{ color: "var(--ink-muted)", lineHeight: 1.4 }}>
          Cada color unico representa un lugar de nacimiento distinto. Las personas sin lugar documentado se atenúan en gris.
          <br />
          <br />
          <strong style={{ color: palette.overlayText }}>Pasa el cursor</strong> sobre los nodos para ver el nombre exacto del lugar.
        </div>
      ) : null}

      {activeLayerId === "layer-warnings" ? (
        <div style={{ color: "var(--ink-muted)", lineHeight: 1.4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text)", marginBottom: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: palette.danger }} /> Problema temporal/logico
          </div>
          Nodos y aristas resaltadas en rojo contienen errores que requieren intervención manual.{" "}
          <strong style={{ color: palette.overlayText }}>Pasa el cursor</strong> sobre ellos para leer advertencias.
        </div>
      ) : null}

      {activeLayerId === "layer-endogamy" ? (
        <div style={{ color: "var(--ink-muted)", lineHeight: 1.4 }}>
          Las lineas de color trazan rutas geneticas desde un{" "}
          <strong style={{ color: palette.overlayText }}>Ancestro en Colapso de Pedigri</strong> hasta un{" "}
          <strong style={{ color: palette.overlayText }}>Descendiente Consanguineo</strong>.
          <br />
          <br />
          <strong style={{ color: palette.overlayText }}>Pasa el cursor</strong> por nodos o uniones iluminadas para evaluar relaciones y coincidencia hereditaria.
        </div>
      ) : null}

      {hasFamilyOriginHighlight ? (
        <div style={{ color: "var(--ink-muted)", lineHeight: 1.4 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: palette.familyOriginSelf,
              marginBottom: 6,
              fontWeight: 600
            }}
          >
            Familia de Origen
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: palette.familyOriginGroup }} /> Padres y hermanos de origen
          </div>
          Resalta la familia de origen de la persona consultada.{" "}
          <strong style={{ color: palette.overlayText }}>Pasa el cursor</strong> para ver el resumen.
        </div>
      ) : null}

      {hasDeepestHighlight ? (
        <div style={{ color: "var(--ink-muted)", lineHeight: 1.4, marginTop: hasFamilyOriginHighlight ? 10 : 0 }}>
          <div style={{ fontWeight: 600, color: palette.warning, marginBottom: 6 }}>Antepasados Mas Remotos</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: palette.oldestExact }} /> Fecha exacta mas antigua
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: palette.oldestEstimated }} /> Fecha estimada mas antigua
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: palette.oldestDeepest }} /> Generacion mas profunda (sin fecha)
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: palette.warning }} /> Persona consultada
            </div>
          </div>
          Resalta 3 rutas de distinta certeza hacia los antepasados mas remotos.
        </div>
      ) : null}
    </div>
  );
}

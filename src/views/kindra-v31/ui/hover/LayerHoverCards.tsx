import { ContextCard } from "@/ui/context/ContextCard";
import type { GraphDocument } from "@/types/domain";
import type {
  EndogamyData,
  TreePalette
} from "@/views/kindra-v31/overlays/types";
import { formatKinshipDisplayText, formatPercentageLabel } from "@/views/kindra-v31/ui/kinshipHeatmapModel";
import type { HoveredNode } from "@/views/kindra-v31/ui/overlayUiModel";

type Props = {
  hoveredNode: HoveredNode;
  document: GraphDocument | null;
  activeLayerId: string | null;
  diagnosticIssues: Map<string, any[]>;
  endogamyData: EndogamyData;
  palette: TreePalette;
};

function renderSymmetryCard(params: {
  hoveredNode: HoveredNode;
  document: GraphDocument | null;
}) {
  const { hoveredNode, document } = params;
  if (!document || !hoveredNode.isPerson) return null;
  let knownParents = 0;
  let fatherName = "Desconocido";
  let motherName = "Desconocida";
  const person = document.persons[hoveredNode.canonId];
  if (person?.famc.length) {
    const primaryFamily = document.families[person.famc[0]!];
    if (primaryFamily?.husbandId) {
      knownParents += 1;
      fatherName = document.persons[primaryFamily.husbandId]?.name ?? "Padre";
    }
    if (primaryFamily?.wifeId) {
      knownParents += 1;
      motherName = document.persons[primaryFamily.wifeId]?.name ?? "Madre";
    }
  }
  return (
    <>
      <div style={{ fontWeight: "bold", marginBottom: 4, color: "var(--success-text)" }}>Completitud de rama</div>
      <div style={{ marginBottom: 4 }}>
        Padres conocidos: <strong>{knownParents}/2</strong>
      </div>
      <div style={{ color: "var(--ink-muted)", fontSize: 12 }}>- P: {fatherName}</div>
      <div style={{ color: "var(--ink-muted)", fontSize: 12 }}>- M: {motherName}</div>
    </>
  );
}

function renderPlacesCard(params: {
  hoveredNode: HoveredNode;
  document: GraphDocument | null;
  palette: TreePalette;
}) {
  const { hoveredNode, document, palette } = params;
  const personData = hoveredNode.isPerson ? document?.persons[hoveredNode.canonId] : null;
  if (!personData) return null;
  const residence = personData.residence?.trim();
  const birthPlace = personData.events.find((event) => event.type === "BIRT")?.place?.trim();
  const deathPlace = personData.events.find((event) => event.type === "DEAT")?.place?.trim();
  const place = residence || birthPlace || deathPlace;
  const sourceLabel = residence ? "Residencia" : birthPlace ? "Nacimiento" : deathPlace ? "Defuncion" : "No registrado";
  return (
    <>
      <div style={{ fontWeight: "bold", marginBottom: 4, color: palette.info }}>Geografia ({sourceLabel})</div>
      <div>
        Lugar: <strong>{place || "No registrado"}</strong>
      </div>
    </>
  );
}

function renderWarningsCard(params: {
  hoveredNode: HoveredNode;
  diagnosticIssues: Map<string, any[]>;
  palette: TreePalette;
}) {
  const { hoveredNode, diagnosticIssues, palette } = params;
  const issues = diagnosticIssues.get(hoveredNode.canonId);
  if (!issues || issues.length === 0) {
    return <div style={{ color: "var(--success-text)" }}>No se encontraron anomalias en esta persona.</div>;
  }
  return (
    <>
      <div style={{ fontWeight: "bold", marginBottom: 4, color: palette.danger }}>Advertencias Criticas ({issues.length})</div>
      <ul style={{ margin: 0, paddingLeft: 16, color: "var(--danger-text)", fontSize: 12 }}>
        {issues.map((issue, index) => (
          <li key={index} style={{ marginBottom: 4 }}>
            {issue.message}
          </li>
        ))}
      </ul>
    </>
  );
}

function renderEndogamyCards(params: {
  hoveredNode: HoveredNode;
  endogamyData: EndogamyData;
  palette: TreePalette;
}) {
  const { hoveredNode, endogamyData, palette } = params;
  const roles = endogamyData.roles.get(hoveredNode.id);
  if (!roles || roles.length === 0) {
    if (!hoveredNode.isPerson) return null;
    return (
      <div style={{ color: palette.overlayTextMuted }}>
        Este individuo no forma parte de ninguna ruta de consanguinidad de las familias que componen el documento.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {roles.map((role, index) => {
        if (role.role === "ancestor") {
          return (
            <ContextCard
              key={index}
              compact
              title="Ancestro en Colapso de Pedigri"
              rows={[
                {
                  label: "Contexto",
                  value: role.contextText || "Punto de convergencia de una ramificacion recurrente.",
                  tone: "muted"
                }
              ]}
            />
          );
        }

        if (role.role === "parent") {
          return (
            <ContextCard
              key={index}
              compact
              title="Progenitor Consanguineo"
              rows={[
                {
                  label: "Parentesco con coprogenitor",
                  value: formatKinshipDisplayText(role.kinship),
                  tone: "accent"
                }
              ]}
            />
          );
        }

        if (role.role === "child") {
          const inbreeding = (role.kinship?.sharedDnaPercentage || 0) / 2;
          return (
            <ContextCard
              key={index}
              compact
              title="Descendiente Consanguineo"
              rows={[
                {
                  label: "Relacion previa progenitores",
                  value: formatKinshipDisplayText(role.kinship),
                  tone: "muted"
                },
                {
                  label: "Coincidencia hereditaria",
                  value: formatPercentageLabel(inbreeding),
                  tone: inbreeding < 0.001 ? "muted" : "warn"
                }
              ]}
            />
          );
        }

        if (role.role === "family") {
          return (
            <ContextCard
              key={index}
              compact
              title="Union Consanguinea Restringida"
              rows={[
                {
                  label: "Parentesco",
                  value: formatKinshipDisplayText(role.kinship),
                  tone: "accent"
                },
                {
                  label: "ADN teorico compartido",
                  value: formatPercentageLabel(role.kinship?.sharedDnaPercentage || 0),
                  tone: "normal"
                }
              ]}
            />
          );
        }

        if (role.role === "path") {
          return (
            <ContextCard
              key={index}
              compact
              title="Ruta Estructural Activa"
              rows={[
                {
                  label: "Transmisor",
                  value: `Grado de consanguinidad (${formatKinshipDisplayText(role.kinship)})`,
                  tone: "muted"
                }
              ]}
            />
          );
        }

        return null;
      })}
    </div>
  );
}

export function LayerHoverCards({
  hoveredNode,
  document,
  activeLayerId,
  diagnosticIssues,
  endogamyData,
  palette
}: Props) {
  if (activeLayerId === "layer-symmetry") {
    return renderSymmetryCard({ hoveredNode, document });
  }
  if (activeLayerId === "layer-places") {
    return renderPlacesCard({ hoveredNode, document, palette });
  }
  if (activeLayerId === "layer-warnings") {
    return renderWarningsCard({ hoveredNode, diagnosticIssues, palette });
  }
  if (activeLayerId === "layer-endogamy") {
    return renderEndogamyCards({ hoveredNode, endogamyData, palette });
  }
  return null;
}

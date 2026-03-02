import { useMemo } from "react";
import type { GeneaDocument, Person } from "@/types/domain";
import { getPersonLabel } from "@/ui/person/personDetailUtils";
import { SectionCard } from "@/ui/common/StandardModal";

function bfsOldestAncestor(doc: GeneaDocument, startId: string): { id: string; name: string; year: number } | null {
  const visited = new Set<string>();
  const queue = [startId];
  let oldest: { id: string; name: string; year: number } | null = null;
  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (visited.has(curr)) continue;
    visited.add(curr);
    const p = doc.persons[curr];
    if (!p) continue;
    const b = p.events.find((e) => e.type === "BIRT")?.date;
    if (b) {
      const m = b.match(/(\d{4})/);
      if (m) {
        const y = parseInt(m[1], 10);
        if (!oldest || y < oldest.year) oldest = { id: curr, name: getPersonLabel(p), year: y };
      }
    }
    for (const famId of p.famc) {
      const fam = doc.families[famId];
      if (!fam) continue;
      if (fam.husbandId && !visited.has(fam.husbandId)) queue.push(fam.husbandId);
      if (fam.wifeId && !visited.has(fam.wifeId)) queue.push(fam.wifeId);
    }
  }
  return oldest;
}

function bfsAncestorStats(doc: GeneaDocument, startId: string): { totalAncestors: number; maxDepth: number } {
  const visited = new Set<string>();
  const queue: Array<{ id: string; depth: number }> = [{ id: startId, depth: 0 }];
  let maxDepth = 0;
  while (queue.length > 0) {
    const { id: curr, depth } = queue.shift()!;
    if (visited.has(curr)) continue;
    visited.add(curr);
    maxDepth = Math.max(maxDepth, depth);
    const p = doc.persons[curr];
    if (!p) continue;
    for (const famId of p.famc) {
      const fam = doc.families[famId];
      if (!fam) continue;
      if (fam.husbandId && !visited.has(fam.husbandId)) queue.push({ id: fam.husbandId, depth: depth + 1 });
      if (fam.wifeId && !visited.has(fam.wifeId)) queue.push({ id: fam.wifeId, depth: depth + 1 });
    }
  }
  return { totalAncestors: visited.size - 1, maxDepth };
}

type Props = {
  document: GeneaDocument;
  person: Person;
  onSelectPerson: (personId: string) => void;
};

export function PersonAnalysisSection({ document, person, onSelectPerson }: Props) {
  const stats = useMemo(() => bfsAncestorStats(document, person.id), [document, person.id]);
  const oldest = useMemo(() => bfsOldestAncestor(document, person.id), [document, person.id]);

  return (
    <div className="gs-sections-container" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* --- Scope & Stats --- */}
      <SectionCard
        title="Análisis de Alcance Ancestral"
        icon="analytics"
      >
        <div className="gs-facts-grid" style={{ marginTop: 4 }}>
          <div className="gs-fact-row">
            <span className="gs-fact-label">Generaciones rastreadas</span>
            <span className="gs-fact-value" style={{ fontWeight: 600, fontSize: '16px' }}>{stats.maxDepth}</span>
          </div>
          <div className="gs-fact-row">
            <span className="gs-fact-label">Antepasados totales documentados</span>
            <span className="gs-fact-value" style={{ fontWeight: 600, fontSize: '16px' }}>{stats.totalAncestors}</span>
          </div>
        </div>
      </SectionCard>

      {/* --- Oldest Ancestor --- */}
      <SectionCard
        title="Raíces: Antepasado más remoto"
        icon="account_tree"
      >
        {oldest ? (
          <div
            style={{
              padding: 16,
              background: 'var(--bg-elev-1)',
              borderRadius: 16,
              border: '1px solid var(--modal-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}
          >
            <span style={{ fontSize: '12px', opacity: 0.7 }}>
              Persona más antigua con año de nacimiento en este linaje directo:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'var(--accent-dim)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-glow)'
                }}
              >
                <span className="material-symbols-outlined">person</span>
              </div>
              <div>
                <button
                  className="link-btn"
                  style={{ fontSize: '17px', fontWeight: 600, color: 'var(--accent-glow)', padding: 0 }}
                  onClick={() => onSelectPerson(oldest.id)}
                >
                  {oldest.name}
                </button>
                <div style={{ fontSize: '14px', opacity: 0.8, marginTop: 2 }}>
                  Nacido aproximadamente en el año <strong>{oldest.year}</strong>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 4 }}>
              <button
                className="secondary-ghost"
                style={{ fontSize: '12px', height: 32 }}
                onClick={() => onSelectPerson(oldest.id)}
              >
                Ir al perfil del antepasado
              </button>
            </div>
          </div>
        ) : (
          <div className="gs-alert gs-alert--info">
            No se han podido identificar antepasados con fechas de nacimiento válidas en este linaje.
          </div>
        )}
      </SectionCard>

      <div
        className="gs-alert gs-alert--info"
        style={{ fontSize: '11px', opacity: 0.6, margin: '0 4px' }}
      >
        Este análisis utiliza una búsqueda en anchura (BFS) para recorrer el árbol de ascendencia directo a través de los registros de familia (FAMC).
      </div>
    </div>
  );
}


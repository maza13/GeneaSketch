
import type { GeneaDocument, PendingRelationType, ViewConfig, VisualConfig } from "@/types/domain";

function IconEye() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5c5.5 0 9.5 5.2 9.5 7s-4 7-9.5 7S2.5 14.8 2.5 12 6.5 5 12 5zm0 2c-3.9 0-7 3.7-7 5s3.1 5 7 5 7-3.7 7-5-3.1-5-7-5zm0 2.5A2.5 2.5 0 1 1 9.5 12 2.5 2.5 0 0 1 12 9.5z" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 17.25V20h2.75L17.8 8.95l-2.75-2.75L4 17.25zm14.7-9.2a.75.75 0 0 0 0-1.06l-1.7-1.7a.75.75 0 0 0-1.06 0l-1.3 1.3 2.75 2.75 1.31-1.29z" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 14a4 4 0 0 1 0-6l2-2a4 4 0 0 1 5.7 5.6l-1.1 1.1-1.4-1.4 1.1-1.1a2 2 0 0 0-2.8-2.8l-2 2a2 2 0 0 0 0 2.8l.3.3-1.4 1.4-.3-.3zm4 2a4 4 0 0 1 0 6l-2 2a4 4 0 0 1-5.7-5.6l1.1-1.1 1.4 1.4-1.1 1.1a2 2 0 0 0 2.8 2.8l2-2a2 2 0 0 0 0-2.8l-.3-.3 1.4-1.4.3.3z" />
    </svg>
  );
}

function IconUnlink() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 7.5 3.5 4 5 2.5 8.5 6 7 7.5zm9.5 9.5L20 20.5 21.5 19l-3.5-3.5-1.5 1.5zM8.5 17a4 4 0 0 1 0-5.7l1.1-1.1 1.4 1.4-1.1 1.1a2 2 0 1 0 2.8 2.8l1.1-1.1 1.4 1.4-1.1 1.1a4 4 0 0 1-5.6 0zm7-7a4 4 0 0 1 0 5.7l-1.1 1.1-1.4-1.4 1.1-1.1a2 2 0 1 0-2.8-2.8l-1.1 1.1-1.4-1.4 1.1-1.1a4 4 0 0 1 5.6 0z" />
    </svg>
  );
}


type Props = {
  document: GeneaDocument | null;
  viewConfig: ViewConfig | null;
  visualConfig: VisualConfig;
  selectedPersonId: string | null;
  onDTreeOrientation: (isVertical: boolean) => void;
  onPreset: (preset: ViewConfig["preset"]) => void;
  onDepth: (kind: keyof ViewConfig["depth"], depth: number) => void;
  onInclude: (k: "spouses", v: boolean) => void;
  onEditPerson: (personId: string) => void;
  onViewPersonDetail: (personId: string) => void;
  onAddRelation: (anchorId: string, type: PendingRelationType) => void;
  onLinkExistingRelation: (anchorId: string, type: PendingRelationType) => void;
  onUnlinkRelation: (personId: string, relatedId: string, type: "parent" | "child" | "spouse") => void;
  onGridEnabled: (enabled: boolean) => void;
  onClearPositions: () => void;
};
export function RightPanel({
  document,
  viewConfig,
  visualConfig,
  selectedPersonId,
  onDTreeOrientation,
  onPreset,
  onDepth,
  onInclude,
  onEditPerson,
  onViewPersonDetail,
  onAddRelation,
  onLinkExistingRelation,
  onUnlinkRelation,
  onGridEnabled,
  onClearPositions
}: Props) {
  const person = selectedPersonId && document ? document.persons[selectedPersonId] : null;
  const birth = person?.events.find((event) => event.type === "BIRT")?.date;
  const death = person?.events.find((event) => event.type === "DEAT")?.date;
  const positionCount = Object.keys(visualConfig.nodePositions).length;

  const parents: { id: string; name: string }[] = [];
  const spouses: { id: string; name: string }[] = [];
  const children: { id: string; name: string }[] = [];
  const parentIds = new Set<string>();
  const spouseIds = new Set<string>();
  const childIds = new Set<string>();

  if (person && document) {
    for (const famId of person.famc) {
      const fam = document.families[famId];
      if (!fam) continue;
      if (fam.husbandId && document.persons[fam.husbandId] && !parentIds.has(fam.husbandId)) {
        parentIds.add(fam.husbandId);
        parents.push({ id: fam.husbandId, name: document.persons[fam.husbandId].name });
      }
      if (fam.wifeId && document.persons[fam.wifeId] && !parentIds.has(fam.wifeId)) {
        parentIds.add(fam.wifeId);
        parents.push({ id: fam.wifeId, name: document.persons[fam.wifeId].name });
      }
    }
    for (const famId of person.fams) {
      const fam = document.families[famId];
      if (!fam) continue;
      const spouseId = fam.husbandId === person.id ? fam.wifeId : fam.husbandId;
      if (spouseId && document.persons[spouseId] && !spouseIds.has(spouseId)) {
        spouseIds.add(spouseId);
        spouses.push({ id: spouseId, name: document.persons[spouseId].name });
      }
      for (const childId of fam.childrenIds) {
        if (document.persons[childId] && !childIds.has(childId)) {
          childIds.add(childId);
          children.push({ id: childId, name: document.persons[childId].name });
        }
      }
    }
  }

  const familySummary =
    person && document
      ? {
        originFamilies: person.famc.length,
        ownFamilies: person.fams.length,
        parents: parents.length,
        spouses: spouses.length,
        children: children.length
      }
      : null;

  return (
    <aside className="panel panel-right">
      <h2>Detalles</h2>
      <div className="detail-stack">
        <div className="person-card person-card--primary">
          {person ? (
            <>
              <div className="person-header">
                <div>
                  <div className="person-name">{person.name}</div>
                  {person.surname ? <div className="person-surname">{person.surname}</div> : null}
                </div>
                <div className="primary-actions">
                  <button onClick={() => onViewPersonDetail(person.id)} className="icon-button" title="Ver persona detallada" aria-label="Ver persona detallada"><IconEye /></button>
                  <button onClick={() => onEditPerson(person.id)} className="icon-button" title="Editar persona" aria-label="Editar persona"><IconEdit /></button>
                </div>
              </div>
              <div className="person-meta">{person.id}</div>
              <div className="person-meta">Sexo: {person.sex}</div>
              <div className="person-meta">
                {birth ? `nac.${birth} ` : "nac. ?"} - {person.lifeStatus === "deceased" ? `def.${death ?? "?"} ` : "vivo"}
              </div>
              {familySummary ? (
                <div className="person-meta">
                  👨‍👩‍👧‍👦 {familySummary.parents} padres · 💍 {familySummary.spouses} parejas · 👶 {familySummary.children} hijos
                </div>
              ) : null}
              {familySummary ? (
                <div className="person-meta">
                  {familySummary.originFamilies} familias de origen · {familySummary.ownFamilies} familias propias
                </div>
              ) : null}
              {person.isPlaceholder ? <div className="person-warn">Nodo raiz vacio. Completa nombre para activarlo.</div> : null}
            </>
          ) : (
            <div className="person-meta">🗄️ Sin selección</div>
          )}

          {person ? (
            <details className="panel-disclosure minimal" open>
              <summary>
                Familiares <span className="badge-count">{parents.length + spouses.length + children.length}</span>
              </summary>

              <div className="relation-section">
                <div className="relation-title">
                  Padres <span className="badge-count">{parents.length}</span>
                </div>
                <div className="relation-actions">
                  <button onClick={() => onAddRelation(person.id, "father")}>👨➕ Agregar padre</button>
                  <button onClick={() => onLinkExistingRelation(person.id, "father")} title="Vincular padre existente" className="icon-button" aria-label="Vincular padre existente"><IconLink /></button>
                  <button onClick={() => onAddRelation(person.id, "mother")}>👩➕ Agregar madre</button>
                  <button onClick={() => onLinkExistingRelation(person.id, "mother")} title="Vincular madre existente" className="icon-button" aria-label="Vincular madre existente"><IconLink /></button>
                </div>
                {parents.length > 0 ? (
                  <div className="relation-list">
                    {parents.map((p) => (
                      <div key={p.id} className="relation-row">
                        <span title={p.id}>{p.name}</span>
                        <div className="row-actions">
                          <button onClick={() => onViewPersonDetail(p.id)} title="Ver detalle" aria-label="Ver detalle" className="icon-button"><IconEye /></button>
                          <button onClick={() => onEditPerson(p.id)} title="Editar" aria-label="Editar" className="icon-button"><IconEdit /></button>
                          <button onClick={() => onUnlinkRelation(person.id, p.id, "parent")} title="Desvincular" aria-label="Desvincular" className="icon-button"><IconUnlink /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="person-meta">👨‍👩‍👦 Sin padres registrados.</div>
                )}
              </div>

              <div className="relation-section">
                <div className="relation-title">
                  Parejas <span className="badge-count">{spouses.length}</span>
                </div>
                <div className="relation-actions">
                  <button onClick={() => onAddRelation(person.id, "spouse")}>💍➕ Agregar pareja</button>
                  <button onClick={() => onLinkExistingRelation(person.id, "spouse")} title="Vincular pareja existente" className="icon-button" aria-label="Vincular pareja existente"><IconLink /></button>
                  <button onClick={() => onAddRelation(person.id, "sibling")}>👦👧➕ Agregar hermano</button>
                  <button onClick={() => onLinkExistingRelation(person.id, "sibling")} title="Vincular hermano existente" className="icon-button" aria-label="Vincular hermano existente"><IconLink /></button>
                </div>
                {spouses.length > 0 ? (
                  <div className="relation-list">
                    {spouses.map((s) => (
                      <div key={s.id} className="relation-row">
                        <span title={s.id}>{s.name}</span>
                        <div className="row-actions">
                          <button onClick={() => onViewPersonDetail(s.id)} title="Ver detalle" aria-label="Ver detalle" className="icon-button"><IconEye /></button>
                          <button onClick={() => onEditPerson(s.id)} title="Editar" aria-label="Editar" className="icon-button"><IconEdit /></button>
                          <button onClick={() => onUnlinkRelation(person.id, s.id, "spouse")} title="Desvincular" aria-label="Desvincular" className="icon-button"><IconUnlink /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="person-meta">💍 Sin parejas registradas.</div>
                )}
              </div>

              <div className="relation-section">
                <div className="relation-title">
                  Hijos <span className="badge-count">{children.length}</span>
                </div>
                <div className="relation-actions">
                  <button onClick={() => onAddRelation(person.id, "child")}>👶➕ Agregar hijo</button>
                  <button onClick={() => onLinkExistingRelation(person.id, "child")} title="Vincular hijo existente" className="icon-button" aria-label="Vincular hijo existente"><IconLink /></button>
                </div>
                {children.length > 0 ? (
                  <div className="relation-list">
                    {children.map((c) => (
                      <div key={c.id} className="relation-row">
                        <span title={c.id}>{c.name}</span>
                        <div className="row-actions">
                          <button onClick={() => onViewPersonDetail(c.id)} title="Ver detalle" aria-label="Ver detalle" className="icon-button"><IconEye /></button>
                          <button onClick={() => onEditPerson(c.id)} title="Editar" aria-label="Editar" className="icon-button"><IconEdit /></button>
                          <button onClick={() => onUnlinkRelation(person.id, c.id, "child")} title="Desvincular" aria-label="Desvincular" className="icon-button"><IconUnlink /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="person-meta">👶 Sin hijos registrados.</div>
                )}
              </div>
            </details>
          ) : null}
        </div>
      </div>

      {viewConfig ? (
        <div className="builder">
          <h3>Vista</h3>
          {viewConfig.dtree && (
            <label className="toggle">
              <input
                type="checkbox"
                checked={viewConfig.dtree.isVertical}
                onChange={(e) => onDTreeOrientation(e.target.checked)}
              />
              Distribucion Vertical
            </label>
          )}
          <label>
            Preset
            <select value={viewConfig.preset} onChange={(e) => onPreset(e.target.value as ViewConfig["preset"])}>
              <option value="all_direct_ancestors">All Direct Ancestors</option>
              <option value="direct_descendants">Direct Descendants</option>
              <option value="hourglass">Hourglass</option>
              <option value="extended_family">Extended Family</option>
            </select>
          </label>
          <div className="depth-control">
            <div className="label-row">
              <span>1. Ancestros</span>
              <span className="value-bubble">{viewConfig.depth.ancestors}</span>
            </div>
            <input
              type="range"
              min={0}
              max={25}
              step={1}
              value={viewConfig.depth.ancestors}
              onChange={(e) => onDepth("ancestors", Number(e.target.value))}
            />
          </div>
          <div className="depth-control">
            <div className="label-row">
              <span>2. Descendientes</span>
              <span className="value-bubble">{viewConfig.depth.descendants}</span>
            </div>
            <input
              type="range"
              min={0}
              max={25}
              step={1}
              value={viewConfig.depth.descendants}
              onChange={(e) => onDepth("descendants", Number(e.target.value))}
            />
          </div>
          <div className="builder">
            <h3>Ramas colaterales del foco</h3>
            <div className="depth-control">
              <div className="label-row">
                <span>A. Tios (de ancestros) hacia arriba</span>
                <span className="value-bubble">{viewConfig.depth.unclesGreatUncles}</span>
              </div>
              <input
                type="range"
                min={0}
                max={6}
                step={1}
                value={viewConfig.depth.unclesGreatUncles}
                onChange={(e) => onDepth("unclesGreatUncles", Number(e.target.value))}
              />
            </div>
            <div className="depth-control">
              <div className="label-row">
                <span>B. Hermanos y descendientes</span>
                <span className="value-bubble">{viewConfig.depth.siblingsNephews}</span>
              </div>
              <input
                type="range"
                min={0}
                max={6}
                step={1}
                value={viewConfig.depth.siblingsNephews}
                onChange={(e) => onDepth("siblingsNephews", Number(e.target.value))}
              />
            </div>
            <div className="depth-control">
              <div className="label-row">
                <span>C. Tios directos y descendientes</span>
                <span className="value-bubble">{viewConfig.depth.unclesCousins}</span>
              </div>
              <input
                type="range"
                min={0}
                max={6}
                step={1}
                value={viewConfig.depth.unclesCousins}
                onChange={(e) => onDepth("unclesCousins", Number(e.target.value))}
              />
            </div>
          </div>


          <label className="toggle">
            <input type="checkbox" checked={viewConfig.showSpouses} onChange={(e) => onInclude("spouses", e.target.checked)} />
            6. Parejas
          </label>
        </div>
      ) : null}

      <div className="builder">
        <h3>Herramientas</h3>
        <label className="toggle">
          <input type="checkbox" checked={visualConfig.gridEnabled} onChange={(e) => onGridEnabled(e.target.checked)} />
          Cuadricula
        </label>
        {positionCount > 0 ? (
          <button onClick={onClearPositions}>
            Limpiar posiciones ({positionCount})
          </button>
        ) : null}
      </div>
    </aside>
  );
}

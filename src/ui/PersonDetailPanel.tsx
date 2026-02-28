import { useEffect, useMemo, useState } from "react";
import { uiDateToGedcom, gedcomDateToUi } from "@/utils/date";
import type { Family, GeneaDocument, PendingRelationType, Person } from "@/types/domain";
import type { PersonEditorPatch } from "@/types/editor";
import type { FamilyPatch, FamilyUnionStatus } from "@/core/edit/commands";

/** BFS to find oldest ancestor by birth year */
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
    const b = p.events.find(e => e.type === "BIRT")?.date;
    if (b) {
      const m = b.match(/(\d{4})/);
      if (m) {
        const y = parseInt(m[1], 10);
        if (!oldest || y < oldest.year) oldest = { id: curr, name: `${p.name}${p.surname ? " " + p.surname : ""}`, year: y };
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

/** BFS to count total ancestors and max depth */
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
  // visited includes startId itself
  return { totalAncestors: visited.size - 1, maxDepth };
}

type PersonInput = {
  name: string;
  surname?: string;
  sex?: "M" | "F" | "U";
  birthDate?: string;
  deathDate?: string;
  lifeStatus?: "alive" | "deceased";
};

type Props = {
  document: GeneaDocument;
  personId: string;
  onClose: () => void;
  onSelectPerson: (personId: string) => void;
  onSavePerson: (personId: string, patch: PersonEditorPatch) => void;
  onSaveFamily: (familyId: string, patch: FamilyPatch) => void;
  onCreatePerson: (input: PersonInput) => string | null;
  onQuickAddRelation: (anchorId: string, relationType: PendingRelationType) => void;
};

function deriveFamilyStatus(family: Family): FamilyUnionStatus {
  const hasDivorce = family.events.some((event) => event.type === "DIV");
  if (hasDivorce) return "divorced";
  const hasMarriage = family.events.some((event) => event.type === "MARR");
  return hasMarriage ? "married" : "partner";
}

function splitSurnames(surname: string | undefined): { paternal: string; maternal: string } {
  const parts = (surname || "").split(" ").filter(Boolean);
  return { paternal: parts[0] || "", maternal: parts.slice(1).join(" ") || "" };
}

function getPersonLabel(person: Person): string {
  return `${person.name}${person.surname ? ` ${person.surname}` : ""}`.trim();
}

export function PersonDetailPanel({
  document,
  personId,
  onClose,
  onSelectPerson,
  onSavePerson,
  onSaveFamily,
  onCreatePerson,
  onQuickAddRelation
}: Props) {
  const person = document.persons[personId];
  const [tab, setTab] = useState<"facts" | "families" | "analysis">("facts");

  const [name, setName] = useState("");
  const [paternalSurname, setPaternalSurname] = useState("");
  const [maternalSurname, setMaternalSurname] = useState("");
  const [sex, setSex] = useState<"M" | "F" | "U">("U");
  const [lifeStatus, setLifeStatus] = useState<"alive" | "deceased">("alive");
  const [birthDate, setBirthDate] = useState("");
  const [deathDate, setDeathDate] = useState("");
  const [factsMessage, setFactsMessage] = useState("");
  const [factsError, setFactsError] = useState("");

  const [activeFamilyId, setActiveFamilyId] = useState<string | null>(null);

  const originFamilies = person ? person.famc.map((familyId) => document.families[familyId]).filter(Boolean) : [];
  const ownFamilies = person ? person.fams.map((familyId) => document.families[familyId]).filter(Boolean) : [];

  useEffect(() => {
    if (!person) return;
    const birth = person.events.find((event) => event.type === "BIRT");
    const death = person.events.find((event) => event.type === "DEAT");
    const surnames = splitSurnames(person.surname);

    setName(person.name === "(Sin nombre)" ? "" : person.name);
    setPaternalSurname(surnames.paternal);
    setMaternalSurname(surnames.maternal);
    setSex(person.sex || "U");
    setLifeStatus(person.lifeStatus === "deceased" || death ? "deceased" : "alive");
    setBirthDate(gedcomDateToUi(birth?.date));
    setDeathDate(gedcomDateToUi(death?.date));
    setFactsMessage("");
    setFactsError("");
    setActiveFamilyId(null);
  }, [personId, person]);

  if (!person) return null;

  function handleSaveFacts() {
    if (!name.trim()) {
      setFactsError("Los nombres son obligatorios.");
      return;
    }
    if (!paternalSurname.trim()) {
      setFactsError("El apellido paterno es obligatorio.");
      return;
    }

    const surname = [paternalSurname.trim(), maternalSurname.trim()].filter(Boolean).join(" ");
    onSavePerson(person.id, {
      name: name.trim(),
      surname,
      sex,
      lifeStatus,
      birthDate: uiDateToGedcom(birthDate),
      deathDate: lifeStatus === "deceased" ? uiDateToGedcom(deathDate) : ""
    });

    setFactsError("");
    setFactsMessage("Hechos guardados.");
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel person-detail-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>Persona detallada: {getPersonLabel(person)}</h3>
          <button onClick={onClose}>&times;</button>
        </div>

        <div className="detail-tabs">
          <button className={tab === "facts" ? "detail-tab active" : "detail-tab"} onClick={() => setTab("facts")}>Hechos</button>
          <button className={tab === "families" ? "detail-tab active" : "detail-tab"} onClick={() => setTab("families")}>Familias</button>
          <button className={tab === "analysis" ? "detail-tab active" : "detail-tab"} onClick={() => setTab("analysis")}>Análisis</button>
        </div>

        {tab === "facts" ? (
          <div className="builder" style={{ marginTop: 12 }}>
            {factsError ? <div className="inline-error">{factsError}</div> : null}
            {factsMessage ? <div className="modal-line warning">{factsMessage}</div> : null}

            <label>
              Nombre(s)
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej: Juan Carlos" />
            </label>

            <label>
              Apellido paterno
              <input value={paternalSurname} onChange={(event) => setPaternalSurname(event.target.value)} placeholder="Ej: Perez" />
            </label>

            <label>
              Apellido materno
              <input value={maternalSurname} onChange={(event) => setMaternalSurname(event.target.value)} placeholder="Ej: Lopez" />
            </label>

            <label>
              Sexo
              <select value={sex} onChange={(event) => setSex(event.target.value as "M" | "F" | "U")}>
                <option value="M">Hombre</option>
                <option value="F">Mujer</option>
                <option value="U">Desconocido</option>
              </select>
            </label>

            <label>
              Nacimiento
              <input value={birthDate} onChange={(event) => setBirthDate(event.target.value)} placeholder="dd/mm/aaaa, mm/aaaa o aaaa" />
            </label>

            <label>
              Estado de vida
              <select value={lifeStatus} onChange={(event) => setLifeStatus(event.target.value as "alive" | "deceased")}>
                <option value="alive">Vivo</option>
                <option value="deceased">Fallecido</option>
              </select>
            </label>

            {lifeStatus === "deceased" ? (
              <label>
                Defuncion
                <input value={deathDate} onChange={(event) => setDeathDate(event.target.value)} placeholder="dd/mm/aaaa, mm/aaaa o aaaa" />
              </label>
            ) : null}

            <button onClick={handleSaveFacts}>Guardar hechos</button>
          </div>
        ) : null}

        {tab === "families" ? (
          <div className="detail-family-list">
            <section className="builder" style={{ marginTop: 12 }}>
              <h3>Familia de origen</h3>
              <div className="family-quick-actions">
                <button onClick={() => onQuickAddRelation(person.id, "father")}>Agregar padre</button>
                <button onClick={() => onQuickAddRelation(person.id, "mother")}>Agregar madre</button>
                <button onClick={() => onQuickAddRelation(person.id, "sibling")}>Agregar hermano</button>
              </div>
              {originFamilies.length === 0 ? <div className="person-meta">Sin familia de origen registrada.</div> : null}
              {originFamilies.map((family) => (
                <FamilySummaryCard
                  key={`origin-${family.id}`}
                  family={family}
                  document={document}
                  role="origen"
                  isActive={activeFamilyId === family.id}
                  onActivate={() => setActiveFamilyId(activeFamilyId === family.id ? null : family.id)}
                  onSelectPerson={onSelectPerson}
                />
              ))}
            </section>

            <section className="builder">
              <h3>Familias de pareja / descendencia</h3>
              <div className="family-quick-actions">
                <button onClick={() => onQuickAddRelation(person.id, "spouse")}>Agregar pareja</button>
                <button onClick={() => onQuickAddRelation(person.id, "child")}>Agregar hijo</button>
              </div>
              {ownFamilies.length === 0 ? <div className="person-meta">No participa como pareja/padre/madre en ninguna familia aun.</div> : null}
              {ownFamilies.map((family) => (
                <FamilySummaryCard
                  key={`own-${family.id}`}
                  family={family}
                  document={document}
                  role="propia"
                  isActive={activeFamilyId === family.id}
                  onActivate={() => setActiveFamilyId(activeFamilyId === family.id ? null : family.id)}
                  onSelectPerson={onSelectPerson}
                />
              ))}
            </section>

            {activeFamilyId && document.families[activeFamilyId] ? (
              <FamilyEditor
                family={document.families[activeFamilyId]}
                document={document}
                onSaveFamily={onSaveFamily}
                onCreatePerson={onCreatePerson}
                onSelectPerson={onSelectPerson}
              />
            ) : null}
          </div>
        ) : null}

        {tab === "analysis" ? (
          <AnalysisTab document={document} person={person} onSelectPerson={onSelectPerson} />
        ) : null}
      </div>
    </div>
  );
}

function FamilySummaryCard({
  family,
  document,
  role,
  isActive,
  onActivate,
  onSelectPerson
}: {
  family: Family;
  document: GeneaDocument;
  role: "origen" | "propia";
  isActive: boolean;
  onActivate: () => void;
  onSelectPerson: (personId: string) => void;
}) {
  const husband = family.husbandId ? document.persons[family.husbandId] : null;
  const wife = family.wifeId ? document.persons[family.wifeId] : null;
  const children = family.childrenIds.map((childId) => document.persons[childId]).filter(Boolean);
  const status = deriveFamilyStatus(family);
  const statusLabel = status === "divorced" ? "Divorciados" : status === "married" ? "Casados" : "Pareja";

  return (
    <div className={isActive ? "family-summary active" : "family-summary"}>
      <div className="family-summary-head">
        <strong>{family.id}</strong>
        <span>{role === "origen" ? "Origen" : "Propia"} · {statusLabel}</span>
      </div>
      <div className="family-summary-rows">
        <div>
          Padre: {husband ? <button onClick={() => onSelectPerson(husband.id)}>{getPersonLabel(husband)}</button> : <span>Sin asignar</span>}
        </div>
        <div>
          Madre: {wife ? <button onClick={() => onSelectPerson(wife.id)}>{getPersonLabel(wife)}</button> : <span>Sin asignar</span>}
        </div>
        <div>
          Hijos:{" "}
          {children.length > 0
            ? children.map((child) => (
              <button key={child.id} onClick={() => onSelectPerson(child.id)}>
                {getPersonLabel(child)}
              </button>
            ))
            : <span>Sin hijos</span>}
        </div>
      </div>
      <button onClick={onActivate}>{isActive ? "Cerrar edición" : "Editar familia"}</button>
    </div>
  );
}

function FamilyEditor({
  family,
  document,
  onSaveFamily,
  onCreatePerson,
  onSelectPerson
}: {
  family: Family;
  document: GeneaDocument;
  onSaveFamily: (familyId: string, patch: FamilyPatch) => void;
  onCreatePerson: (input: PersonInput) => string | null;
  onSelectPerson: (personId: string) => void;
}) {
  const [husbandId, setHusbandId] = useState(family.husbandId || "");
  const [wifeId, setWifeId] = useState(family.wifeId || "");
  const [childrenIds, setChildrenIds] = useState<string[]>(family.childrenIds);
  const [unionStatus, setUnionStatus] = useState<FamilyUnionStatus>(deriveFamilyStatus(family));
  const [marriageDate, setMarriageDate] = useState("");
  const [marriagePlace, setMarriagePlace] = useState("");
  const [divorceDate, setDivorceDate] = useState("");

  const [newRole, setNewRole] = useState<"husband" | "wife" | "child">("child");
  const [newName, setNewName] = useState("");
  const [newSurname, setNewSurname] = useState("");
  const [newSex, setNewSex] = useState<"M" | "F" | "U">("U");
  const [existingChildToAdd, setExistingChildToAdd] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const marriage = family.events.find((event) => event.type === "MARR");
    const divorce = family.events.find((event) => event.type === "DIV");
    setHusbandId(family.husbandId || "");
    setWifeId(family.wifeId || "");
    setChildrenIds(family.childrenIds);
    setUnionStatus(deriveFamilyStatus(family));
    setMarriageDate(gedcomDateToUi(marriage?.date));
    setMarriagePlace(marriage?.place || "");
    setDivorceDate(gedcomDateToUi(divorce?.date));
    setMessage("");
  }, [family]);

  const allPersons = useMemo(() => Object.values(document.persons), [document]);

  const husbandOptions = allPersons.filter((person) => person.id !== wifeId || person.id === husbandId);
  const wifeOptions = allPersons.filter((person) => person.id !== husbandId || person.id === wifeId);
  const childOptions = allPersons.filter((person) => !childrenIds.includes(person.id));

  function handleSave() {
    onSaveFamily(family.id, {
      husbandId: husbandId || null,
      wifeId: wifeId || null,
      childrenIds,
      unionStatus,
      marriageDate: uiDateToGedcom(marriageDate),
      marriagePlace: marriagePlace.trim(),
      divorceDate: uiDateToGedcom(divorceDate)
    });
    setMessage("Familia guardada.");
  }

  function handleCreateAndAssign() {
    if (!newName.trim() || !newSurname.trim()) {
      setMessage("Nombre y apellido son obligatorios para crear persona.");
      return;
    }

    const createdId = onCreatePerson({
      name: newName.trim(),
      surname: newSurname.trim(),
      sex: newSex,
      lifeStatus: "alive"
    });

    if (!createdId) {
      setMessage("No se pudo crear la persona.");
      return;
    }

    if (newRole === "husband") setHusbandId(createdId);
    if (newRole === "wife") setWifeId(createdId);
    if (newRole === "child") setChildrenIds((prev) => (prev.includes(createdId) ? prev : [...prev, createdId]));

    setNewName("");
    setNewSurname("");
    setNewSex("U");
    setMessage("Persona creada y asignada. Guarda la familia para persistir el vínculo.");
  }

  return (
    <section className="builder">
      <h3>Editar familia {family.id}</h3>
      {message ? <div className="modal-line warning">{message}</div> : null}

      <label>
        Esposo / Padre
        <select value={husbandId} onChange={(event) => setHusbandId(event.target.value)}>
          <option value="">Sin asignar</option>
          {husbandOptions.map((person) => (
            <option key={person.id} value={person.id}>{getPersonLabel(person)} ({person.id})</option>
          ))}
        </select>
      </label>

      <label>
        Esposa / Madre
        <select value={wifeId} onChange={(event) => setWifeId(event.target.value)}>
          <option value="">Sin asignar</option>
          {wifeOptions.map((person) => (
            <option key={person.id} value={person.id}>{getPersonLabel(person)} ({person.id})</option>
          ))}
        </select>
      </label>

      <div className="family-children-editor">
        <strong>Hijos</strong>
        {childrenIds.length === 0 ? <div className="person-meta">Sin hijos</div> : null}
        {childrenIds.map((childId) => {
          const child = document.persons[childId];
          if (!child) return null;
          return (
            <div key={childId} className="family-child-row">
              <button onClick={() => onSelectPerson(childId)}>{getPersonLabel(child)}</button>
              <button onClick={() => setChildrenIds((prev) => prev.filter((id) => id !== childId))}>Quitar</button>
            </div>
          );
        })}

        <div className="family-add-existing-row">
          <select value={existingChildToAdd} onChange={(event) => setExistingChildToAdd(event.target.value)}>
            <option value="">Agregar hijo existente...</option>
            {childOptions.map((person) => (
              <option key={person.id} value={person.id}>{getPersonLabel(person)} ({person.id})</option>
            ))}
          </select>
          <button
            onClick={() => {
              if (!existingChildToAdd) return;
              setChildrenIds((prev) => (prev.includes(existingChildToAdd) ? prev : [...prev, existingChildToAdd]));
              setExistingChildToAdd("");
            }}
          >
            Agregar
          </button>
        </div>
      </div>

      <label>
        Estado de unión
        <select value={unionStatus} onChange={(event) => setUnionStatus(event.target.value as FamilyUnionStatus)}>
          <option value="partner">Pareja</option>
          <option value="married">Casados</option>
          <option value="divorced">Divorciados</option>
        </select>
      </label>

      {unionStatus !== "partner" ? (
        <>
          <label>
            Fecha matrimonio
            <input value={marriageDate} onChange={(event) => setMarriageDate(event.target.value)} placeholder="dd/mm/aaaa, mm/aaaa o aaaa" />
          </label>
          <label>
            Lugar matrimonio
            <input value={marriagePlace} onChange={(event) => setMarriagePlace(event.target.value)} placeholder="Lugar (opcional)" />
          </label>
        </>
      ) : null}

      {unionStatus === "divorced" ? (
        <label>
          Fecha divorcio
          <input value={divorceDate} onChange={(event) => setDivorceDate(event.target.value)} placeholder="dd/mm/aaaa, mm/aaaa o aaaa" />
        </label>
      ) : null}

      <div className="family-create-person">
        <strong>Crear y asignar persona</strong>
        <label>
          Rol
          <select value={newRole} onChange={(event) => setNewRole(event.target.value as "husband" | "wife" | "child")}>
            <option value="child">Hijo</option>
            <option value="husband">Esposo/Padre</option>
            <option value="wife">Esposa/Madre</option>
          </select>
        </label>
        <label>
          Nombre
          <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Ej: Maria" />
        </label>
        <label>
          Apellido
          <input value={newSurname} onChange={(event) => setNewSurname(event.target.value)} placeholder="Ej: Nunez" />
        </label>
        <label>
          Sexo
          <select value={newSex} onChange={(event) => setNewSex(event.target.value as "M" | "F" | "U")}>
            <option value="U">Desconocido</option>
            <option value="M">Hombre</option>
            <option value="F">Mujer</option>
          </select>
        </label>
        <button onClick={handleCreateAndAssign}>Crear y asignar</button>
      </div>

      <button onClick={handleSave}>Guardar familia</button>
    </section>
  );
}

function AnalysisTab({
  document,
  person,
  onSelectPerson
}: {
  document: GeneaDocument;
  person: Person;
  onSelectPerson: (personId: string) => void;
}) {
  const stats = useMemo(() => bfsAncestorStats(document, person.id), [document, person.id]);
  const oldest = useMemo(() => bfsOldestAncestor(document, person.id), [document, person.id]);

  return (
    <div className="builder" style={{ marginTop: 12 }}>
      <h3>Alcance Ancestral</h3>
      <div className="person-meta" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span><strong>Generaciones directas rastreadas:</strong> {stats.maxDepth}</span>
        <span><strong>Antepasados totales documentados:</strong> {stats.totalAncestors}</span>
      </div>

      <h3 style={{ marginTop: 20 }}>Antepasado Más Remoto</h3>
      {oldest ? (
        <div style={{ padding: 12, background: 'var(--bg-input)', borderRadius: 6, borderLeft: '3px solid var(--accent-strong)' }}>
          <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>
            Persona más antigua con año de nacimiento en este linaje:
          </div>
          <div>
            <button onClick={() => onSelectPerson(oldest.id)} style={{ padding: 0, border: 'none', background: 'none', color: 'var(--accent-strong)', fontWeight: 'bold', textDecoration: 'underline', cursor: 'pointer' }}>
              {oldest.name}
            </button>
            <span style={{ marginLeft: 6 }}>
              (~{oldest.year})
            </span>
          </div>
        </div>
      ) : (
        <div className="person-meta">No se encontraron antepasados con fechas de nacimiento.</div>
      )}

      {person.famc.length > 0 && (
        <h3 style={{ marginTop: 20 }}>Resumen Familia de Origen</h3>
      )}
      {person.famc.length > 0 && document.families[person.famc[0]] && (
        <div style={{ padding: 12, background: 'var(--bg-input)', borderRadius: 6, borderLeft: '3px solid var(--timeline-type-birt)' }}>
          <div style={{ fontSize: 13, marginBottom: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span>👶 <strong>Hijos:</strong> {document.families[person.famc[0]].childrenIds.length}</span>
            {document.families[person.famc[0]].events.find(e => e.type === "MARR")?.date && (
              <span>💍 <strong>Matrimonio:</strong> {document.families[person.famc[0]].events.find(e => e.type === "MARR")!.date}</span>
            )}
            <span>👨‍👩‍👧 <em>({document.families[person.famc[0]].childrenIds.includes(person.id) ? "Incluyéndolo" : "Hijo no listado o error en BD"})</em></span>
          </div>
        </div>
      )}
    </div>
  );
}

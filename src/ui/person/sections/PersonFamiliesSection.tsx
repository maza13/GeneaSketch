import { useEffect, useMemo, useState } from "react";
import { gedcomDateToUi, uiDateToGedcom } from "@/utils/date";
import type { Family, GeneaDocument, PendingRelationType } from "@/types/domain";
import type { FamilyPatch, FamilyUnionStatus } from "@/core/edit/commands";
import { deriveFamilyStatus, getPersonLabel } from "@/ui/person/personDetailUtils";
import { SectionCard } from "../../common/StandardModal";

type PersonInput = {
  name: string;
  surname?: string;
  sex?: "M" | "F" | "U";
  birthDate?: string;
  deathDate?: string;
  lifeStatus?: "alive" | "deceased";
};

type Props = {
  personId: string;
  document: GeneaDocument;
  onSelectPerson: (personId: string) => void;
  onSaveFamily: (familyId: string, patch: FamilyPatch) => void;
  onCreatePerson: (input: PersonInput) => string | null;
  onQuickAddRelation: (anchorId: string, relationType: PendingRelationType) => void;
};

export function splitPersonFamilies(personId: string, document: GeneaDocument): { originFamilies: Family[]; ownFamilies: Family[] } {
  const person = document.persons[personId];
  if (!person) return { originFamilies: [], ownFamilies: [] };
  return {
    originFamilies: person.famc.map((familyId) => document.families[familyId]).filter(Boolean),
    ownFamilies: person.fams.map((familyId) => document.families[familyId]).filter(Boolean)
  };
}

export function PersonFamiliesSection({
  personId,
  document,
  onSelectPerson,
  onSaveFamily,
  onCreatePerson,
  onQuickAddRelation
}: Props) {
  const person = document.persons[personId];
  const [activeFamilyId, setActiveFamilyId] = useState<string | null>(null);
  const [linkFamilyId, setLinkFamilyId] = useState("");
  const [linkRole, setLinkRole] = useState<"famc" | "fams">("fams");
  const [linkMessage, setLinkMessage] = useState("");

  if (!person) return null;

  const { originFamilies, ownFamilies } = splitPersonFamilies(person.id, document);
  const allFamilies = Object.values(document.families);
  const activeFamily = activeFamilyId ? document.families[activeFamilyId] : null;

  return (
    <div className="gs-sections-container" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionCard title="Familia de Origen" icon="family_history">
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className="secondary-ghost" style={{ fontSize: '12px', padding: '4px 10px' }} onClick={() => onQuickAddRelation(person.id, "father")}>+ Padre</button>
          <button className="secondary-ghost" style={{ fontSize: '12px', padding: '4px 10px' }} onClick={() => onQuickAddRelation(person.id, "mother")}>+ Madre</button>
          <button className="secondary-ghost" style={{ fontSize: '12px', padding: '4px 10px' }} onClick={() => onQuickAddRelation(person.id, "sibling")}>+ Hermano</button>
        </div>

        {originFamilies.length === 0 ? <div className="gs-fact-row" style={{ color: 'var(--ink-muted)', fontSize: '13px', fontStyle: 'italic', border: 'none' }}>Sin familia de origen registrada.</div> : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {originFamilies.map((family) => (
            <FamilySummaryCard
              key={`origin-${family.id}`}
              family={family}
              document={document}
              role="origen"
              personId={person.id}
              isActive={activeFamilyId === family.id}
              onActivate={() => setActiveFamilyId(activeFamilyId === family.id ? null : family.id)}
              onSelectPerson={onSelectPerson}
              onSaveFamily={onSaveFamily}
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Familias Propias" icon="groups">
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className="secondary-ghost" style={{ fontSize: '12px', padding: '4px 10px' }} onClick={() => onQuickAddRelation(person.id, "spouse")}>+ Pareja</button>
          <button className="secondary-ghost" style={{ fontSize: '12px', padding: '4px 10px' }} onClick={() => onQuickAddRelation(person.id, "child")}>+ Hijo</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '12px', background: 'var(--bg-elev-2)', borderRadius: '8px', border: '1px dashed var(--line)' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)' }}>VINCULAR FAMILIA EXISTENTE</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <select style={{ flex: 1 }} value={linkFamilyId} onChange={(event) => setLinkFamilyId(event.target.value)}>
                <option value="">Seleccionar familia...</option>
                {allFamilies.map((family) => (
                  <option key={family.id} value={family.id}>{family.id}</option>
                ))}
              </select>
              <select value={linkRole} onChange={(event) => setLinkRole(event.target.value as "famc" | "fams")}>
                <option value="fams">Pareja/Padre</option>
                <option value="famc">Hijo/a</option>
              </select>
            </div>
          </div>
          <button
            className="accent-solid"
            style={{ padding: '8px 16px' }}
            onClick={() => {
              if (!linkFamilyId) return;
              const family = document.families[linkFamilyId];
              if (!family) return;
              if (linkRole === "famc") {
                const children = Array.from(new Set([...(family.childrenIds || []), person.id]));
                onSaveFamily(family.id, { childrenIds: children });
                setLinkMessage(`Vínculo FAMC agregado en ${family.id}.`);
                return;
              }
              if (!family.husbandId) {
                onSaveFamily(family.id, { husbandId: person.id });
                setLinkMessage(`Vínculo FAMS agregado como HUSB en ${family.id}.`);
                return;
              }
              if (!family.wifeId) {
                onSaveFamily(family.id, { wifeId: person.id });
                setLinkMessage(`Vínculo FAMS agregado como WIFE en ${family.id}.`);
                return;
              }
              setLinkMessage("La familia ya tiene ambos cónyuges. Usa editar para ajustar.");
            }}
          >
            Vincular
          </button>
        </div>

        {linkMessage ? <div className="gs-alert gs-alert--warning" style={{ marginBottom: 16 }}>{linkMessage}</div> : null}

        {ownFamilies.length === 0 ? <div className="gs-fact-row" style={{ color: 'var(--ink-muted)', fontSize: '13px', fontStyle: 'italic', border: 'none' }}>No participa en ninguna familia aún.</div> : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {ownFamilies.map((family) => (
            <FamilySummaryCard
              key={`own-${family.id}`}
              family={family}
              document={document}
              role="propia"
              personId={person.id}
              isActive={activeFamilyId === family.id}
              onActivate={() => setActiveFamilyId(activeFamilyId === family.id ? null : family.id)}
              onSelectPerson={onSelectPerson}
              onSaveFamily={onSaveFamily}
            />
          ))}
        </div>
      </SectionCard>

      {activeFamily ? (
        <FamilyEditor
          family={activeFamily}
          document={document}
          onSaveFamily={onSaveFamily}
          onCreatePerson={onCreatePerson}
          onSelectPerson={onSelectPerson}
          onClose={() => setActiveFamilyId(null)}
        />
      ) : null}
    </div>
  );
}

function FamilySummaryCard({
  family,
  document,
  role,
  personId,
  isActive,
  onActivate,
  onSelectPerson,
  onSaveFamily
}: {
  family: Family;
  document: GeneaDocument;
  role: "origen" | "propia";
  personId: string;
  isActive: boolean;
  onActivate: () => void;
  onSelectPerson: (personId: string) => void;
  onSaveFamily: (familyId: string, patch: FamilyPatch) => void;
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
      <button
        className="secondary-ghost danger"
        onClick={() => {
          if (!window.confirm(`¿Quitar vínculo de ${personId} en ${family.id}?`)) return;
          if (family.childrenIds.includes(personId)) {
            onSaveFamily(family.id, { childrenIds: family.childrenIds.filter((childId) => childId !== personId) });
            return;
          }
          if (family.husbandId === personId) {
            onSaveFamily(family.id, { husbandId: null });
            return;
          }
          if (family.wifeId === personId) {
            onSaveFamily(family.id, { wifeId: null });
          }
        }}
      >
        Quitar vínculo
      </button>
    </div>
  );
}

function FamilyEditor({
  family,
  document,
  onSaveFamily,
  onCreatePerson,
  onSelectPerson,
  onClose
}: {
  family: Family;
  document: GeneaDocument;
  onSaveFamily: (familyId: string, patch: FamilyPatch) => void;
  onCreatePerson: (input: PersonInput) => string | null;
  onSelectPerson: (personId: string) => void;
  onClose: () => void;
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
    <SectionCard
      title={`Editar familia ${family.id}`}
      icon="edit_attributes"
      headerAction={<button className="secondary-ghost" onClick={onClose}>Cerrar</button>}
    >
      {message ? <div className="gs-alert gs-alert--warning" style={{ marginBottom: 12 }}>{message}</div> : null}

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


      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button className="secondary-ghost" onClick={onClose}>Cancelar</button>
        <button className="accent-solid" onClick={handleSave}>Guardar Familia</button>
      </div>
    </SectionCard>
  );
}

import { useEffect, useMemo, useState } from "react";
import { gedcomDateToUi, uiDateToGedcom } from "@/utils/date";
import type { Family, GraphDocument, Person, PendingRelationType } from "@/types/domain";
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
  document: GraphDocument;
  onSelectPerson: (personId: string) => void;
  onSaveFamily: (familyId: string, patch: FamilyPatch) => void;
  onCreatePerson: (input: PersonInput) => string | null;
  onQuickAddRelation: (anchorId: string, relationType: PendingRelationType) => void;
};

export function splitPersonFamilies(personId: string, document: GraphDocument): { originFamilies: Family[]; ownFamilies: Family[] } {
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
  // Track which family is in "edit mode" — only one at a time
  const [editingFamilyId, setEditingFamilyId] = useState<string | null>(null);
  const [linkFamilyId, setLinkFamilyId] = useState("");
  const [linkRole, setLinkRole] = useState<"famc" | "fams">("fams");
  const [linkMessage, setLinkMessage] = useState("");

  if (!person) return null;

  const { originFamilies, ownFamilies } = splitPersonFamilies(person.id, document);
  const allFamilies = Object.values(document.families);

  function toggleEdit(familyId: string) {
    setEditingFamilyId(prev => prev === familyId ? null : familyId);
  }

  return (
    <div className="gs-sections-container gs-sections-stack">
      {/* -- FAMILIA DE ORIGEN --------------------------------------- */}
      <SectionCard title="Familia de Origen" icon="family_history">
        <div className="fam-action-row">
          <button className="secondary-ghost fam-add-btn" onClick={() => onQuickAddRelation(person.id, "father")}>
            <span className="material-symbols-outlined">person_add</span>Padre
          </button>
          <button className="secondary-ghost fam-add-btn" onClick={() => onQuickAddRelation(person.id, "mother")}>
            <span className="material-symbols-outlined">person_add</span>Madre
          </button>
          <button className="secondary-ghost fam-add-btn" onClick={() => onQuickAddRelation(person.id, "sibling")}>
            <span className="material-symbols-outlined">group_add</span>Hermano
          </button>
        </div>

        {originFamilies.length === 0 && (
          <div className="fam-empty-state">Sin familia de origen registrada.</div>
        )}

        <div className="fam-cards-list">
          {originFamilies.map((family) => (
            <FamilyCard
              key={`origin-${family.id}`}
              family={family}
              document={document}
              role="origen"
              personId={person.id}
              isEditing={editingFamilyId === family.id}
              onToggleEdit={() => toggleEdit(family.id)}
              onSelectPerson={onSelectPerson}
              onSaveFamily={onSaveFamily}
              onCreatePerson={onCreatePerson}
            />
          ))}
        </div>
      </SectionCard>

      {/* -- FAMILIAS PROPIAS ---------------------------------------- */}
      <SectionCard title="Familias Propias" icon="groups">
        <div className="fam-action-row">
          <button className="secondary-ghost fam-add-btn" onClick={() => onQuickAddRelation(person.id, "spouse")}>
            <span className="material-symbols-outlined">favorite</span>Pareja
          </button>
          <button className="secondary-ghost fam-add-btn" onClick={() => onQuickAddRelation(person.id, "child")}>
            <span className="material-symbols-outlined">child_care</span>Hijo
          </button>
        </div>

        {/* Vincular familia existente */}
        <div className="fam-link-panel">
          <span className="fam-link-label">Vincular familia existente</span>
          <div className="fam-link-row">
            <select
              className="fam-link-select"
              value={linkFamilyId}
              onChange={(e) => setLinkFamilyId(e.target.value)}
            >
              <option value="">Seleccionar familia...</option>
              {allFamilies.map((fam) => (
                <option key={fam.id} value={fam.id}>{fam.id}</option>
              ))}
            </select>
            <select
              className="fam-link-role"
              value={linkRole}
              onChange={(e) => setLinkRole(e.target.value as "famc" | "fams")}
            >
              <option value="fams">Pareja / Padre</option>
              <option value="famc">Hijo/a</option>
            </select>
            <button
              className="accent-solid fam-link-btn"
              disabled={!linkFamilyId}
              onClick={() => {
                if (!linkFamilyId) return;
                const fam = document.families[linkFamilyId];
                if (!fam) return;
                if (linkRole === "famc") {
                  const children = Array.from(new Set([...(fam.childrenIds || []), person.id]));
                  onSaveFamily(fam.id, { childrenIds: children });
                  setLinkMessage(`Vínculo FAMC agregado en ${fam.id}.`);
                  setLinkFamilyId("");
                  return;
                }
                if (!fam.husbandId) {
                  onSaveFamily(fam.id, { husbandId: person.id });
                  setLinkMessage(`Vínculo FAMS como HUSB en ${fam.id}.`);
                  setLinkFamilyId("");
                  return;
                }
                if (!fam.wifeId) {
                  onSaveFamily(fam.id, { wifeId: person.id });
                  setLinkMessage(`Vínculo FAMS como WIFE en ${fam.id}.`);
                  setLinkFamilyId("");
                  return;
                }
                setLinkMessage("La familia ya tiene ambos cónyuges.");
              }}
            >
              Vincular
            </button>
          </div>
          {linkMessage && (
            <div className="gs-alert gs-alert--warning fam-link-msg">{linkMessage}</div>
          )}
        </div>

        {ownFamilies.length === 0 && (
          <div className="fam-empty-state">No participa en ninguna familia aún.</div>
        )}

        <div className="fam-cards-list">
          {ownFamilies.map((family) => (
            <FamilyCard
              key={`own-${family.id}`}
              family={family}
              document={document}
              role="propia"
              personId={person.id}
              isEditing={editingFamilyId === family.id}
              onToggleEdit={() => toggleEdit(family.id)}
              onSelectPerson={onSelectPerson}
              onSaveFamily={onSaveFamily}
              onCreatePerson={onCreatePerson}
            />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// -------------------------------------------------------------------
// FamilyCard — View mode + Edit mode in place (UX-RULE-006, §8.1)
// -------------------------------------------------------------------
function FamilyCard({
  family,
  document,
  role,
  personId,
  isEditing,
  onToggleEdit,
  onSelectPerson,
  onSaveFamily,
  onCreatePerson,
}: {
  family: Family;
  document: GraphDocument;
  role: "origen" | "propia";
  personId: string;
  isEditing: boolean;
  onToggleEdit: () => void;
  onSelectPerson: (personId: string) => void;
  onSaveFamily: (familyId: string, patch: FamilyPatch) => void;
  onCreatePerson: (input: PersonInput) => string | null;
}) {
  const [unlinkPending, setUnlinkPending] = useState(false);

  const husband = family.husbandId ? document.persons[family.husbandId] : null;
  const wife = family.wifeId ? document.persons[family.wifeId] : null;
  const children = family.childrenIds.map(id => document.persons[id]).filter(Boolean);
  const status = deriveFamilyStatus(family);
  const statusLabel = status === "divorced" ? "Divorciados" : status === "married" ? "Casados" : "Pareja";

  function handleUnlink() {
    if (family.childrenIds.includes(personId)) {
      onSaveFamily(family.id, { childrenIds: family.childrenIds.filter(id => id !== personId) });
    } else if (family.husbandId === personId) {
      onSaveFamily(family.id, { husbandId: null });
    } else if (family.wifeId === personId) {
      onSaveFamily(family.id, { wifeId: null });
    }
    setUnlinkPending(false);
  }

  return (
    <div className={`family-card ${isEditing ? "editing" : ""}`}>
      {/* -- Card header (always visible) -- */}
      <div className="family-card-head">
        <div className="family-card-id">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>family_history</span>
          <strong>{family.id}</strong>
          <span className="family-card-badge">{role === "origen" ? "Origen" : "Propia"} · {statusLabel}</span>
        </div>
        <div className="family-card-head-actions">
          {/* Edit toggle */}
          <button
            className={`panel-icon-btn ${isEditing ? "active" : ""}`}
            title={isEditing ? "Cerrar editor" : "Editar familia"}
            onClick={onToggleEdit}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              {isEditing ? "close" : "edit"}
            </span>
          </button>

          {/* Unlink with inline confirm (UX-RULE-007 / §8.5) */}
          {unlinkPending ? (
            <div className="family-card-confirm-row">
              <span className="family-card-confirm-label">¿Quitar vínculo?</span>
              <button className="accent-solid danger" style={{ fontSize: 11, padding: "2px 8px", height: "auto" }} onClick={handleUnlink}>Sí, quitar</button>
              <button className="secondary-ghost" style={{ fontSize: 11, padding: "2px 8px", height: "auto" }} onClick={() => setUnlinkPending(false)}>Cancelar</button>
            </div>
          ) : (
            <button
              className="panel-icon-btn danger"
              title="Quitar vínculo"
              onClick={() => setUnlinkPending(true)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>link_off</span>
            </button>
          )}
        </div>
      </div>

      {/* -- View mode body -- */}
      {!isEditing && (
        <div className="family-card-body">
          <PersonRow label="Padre" person={husband} onSelect={onSelectPerson} />
          <PersonRow label="Madre" person={wife} onSelect={onSelectPerson} />
          <div className="family-card-children-row">
            <span className="family-card-row-label">Hijos</span>
            <div className="family-card-children-list">
              {children.length > 0
                ? children.map(child => (
                  <button
                    key={child.id}
                    className="fam-person-chip"
                    onClick={() => onSelectPerson(child.id)}
                    title={child.id}
                  >
                    {getPersonLabel(child)}
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>arrow_forward</span>
                  </button>
                ))
                : <span className="family-card-row-empty">Sin hijos</span>
              }
            </div>
          </div>
        </div>
      )}

      {/* -- Edit mode expanded in place (UX-RULE-006 / §8.1) -- */}
      {isEditing && (
        <FamilyInlineEditor
          family={family}
          document={document}
          onSaveFamily={onSaveFamily}
          onCreatePerson={onCreatePerson}
          onSelectPerson={onSelectPerson}
          onClose={onToggleEdit}
        />
      )}
    </div>
  );
}

// -- PersonRow — hover-reveal navigation (§8.2) ------------------
function PersonRow({ label, person, onSelect }: {
  label: string;
  person: Person | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="family-card-person-row">
      <span className="family-card-row-label">{label}</span>
      {person ? (
        <div className="person-row">
          <span className="person-row-name">{getPersonLabel(person)}</span>
          <div className="person-row-actions">
            <button
              className="panel-icon-btn"
              title={`Ir a ${getPersonLabel(person)}`}
              onClick={() => onSelect(person.id)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>arrow_forward</span>
            </button>
          </div>
        </div>
      ) : (
        <span className="family-card-row-empty">Sin asignar</span>
      )}
    </div>
  );
}

// -------------------------------------------------------------------
// FamilyInlineEditor — appears inside FamilyCard when isEditing
// -------------------------------------------------------------------
function FamilyInlineEditor({
  family,
  document,
  onSaveFamily,
  onCreatePerson,
  onSelectPerson,
  onClose,
}: {
  family: Family;
  document: GraphDocument;
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
  const [removeChildPending, setRemoveChildPending] = useState<string | null>(null);

  useEffect(() => {
    const marriage = family.events.find(e => e.type === "MARR");
    const divorce = family.events.find(e => e.type === "DIV");
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
  const husbandOptions = allPersons.filter(p => p.id !== wifeId || p.id === husbandId);
  const wifeOptions = allPersons.filter(p => p.id !== husbandId || p.id === wifeId);
  const childOptions = allPersons.filter(p => !childrenIds.includes(p.id));

  function handleSave() {
    onSaveFamily(family.id, {
      husbandId: husbandId || null,
      wifeId: wifeId || null,
      childrenIds,
      unionStatus,
      marriageDate: uiDateToGedcom(marriageDate),
      marriagePlace: marriagePlace.trim(),
      divorceDate: uiDateToGedcom(divorceDate),
    });
    setMessage("Familia guardada.");
    setTimeout(() => { setMessage(""); onClose(); }, 1200);
  }

  function handleCreateAndAssign() {
    if (!newName.trim() || !newSurname.trim()) {
      setMessage("Nombre y apellido son obligatorios.");
      return;
    }
    const createdId = onCreatePerson({ name: newName.trim(), surname: newSurname.trim(), sex: newSex, lifeStatus: "alive" });
    if (!createdId) { setMessage("No se pudo crear la persona."); return; }
    if (newRole === "husband") setHusbandId(createdId);
    if (newRole === "wife") setWifeId(createdId);
    if (newRole === "child") setChildrenIds(prev => prev.includes(createdId) ? prev : [...prev, createdId]);
    setNewName(""); setNewSurname(""); setNewSex("U");
    setMessage("Persona creada. Guarda la familia para persistir.");
  }

  return (
    <div className="family-inline-editor">
      {message && (
        <div className="gs-alert gs-alert--warning family-editor-msg">{message}</div>
      )}

      {/* -- Esposo / Esposa -- */}
      <div className="family-editor-row">
        <label className="family-editor-label">Esposo / Padre</label>
        <select className="family-editor-select" value={husbandId} onChange={e => setHusbandId(e.target.value)}>
          <option value="">Sin asignar</option>
          {husbandOptions.map(p => (
            <option key={p.id} value={p.id}>{getPersonLabel(p)} ({p.id})</option>
          ))}
        </select>
      </div>

      <div className="family-editor-row">
        <label className="family-editor-label">Esposa / Madre</label>
        <select className="family-editor-select" value={wifeId} onChange={e => setWifeId(e.target.value)}>
          <option value="">Sin asignar</option>
          {wifeOptions.map(p => (
            <option key={p.id} value={p.id}>{getPersonLabel(p)} ({p.id})</option>
          ))}
        </select>
      </div>

      {/* -- Hijos -- */}
      <div className="family-editor-children">
        <span className="family-editor-section-label">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>child_care</span>
          Hijos
        </span>
        {childrenIds.length === 0 && <span className="family-card-row-empty">Sin hijos</span>}
        {childrenIds.map(childId => {
          const child = document.persons[childId];
          if (!child) return null;
          return (
            <div key={childId} className="family-editor-child-row">
              <button className="fam-person-link" onClick={() => onSelectPerson(childId)}>
                {getPersonLabel(child)}
              </button>
              {/* Inline confirm for child removal (UX-RULE-007 / §8.5) */}
              {removeChildPending === childId ? (
                <div className="family-child-confirm">
                  <button className="accent-solid danger" style={{ fontSize: 11, padding: "2px 8px", height: "auto" }} onClick={() => { setChildrenIds(prev => prev.filter(id => id !== childId)); setRemoveChildPending(null); }}>
                    Quitar
                  </button>
                  <button className="secondary-ghost" style={{ fontSize: 11, padding: "2px 8px", height: "auto" }} onClick={() => setRemoveChildPending(null)}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <button className="panel-icon-btn danger" title="Quitar hijo" onClick={() => setRemoveChildPending(childId)}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>remove_circle</span>
                </button>
              )}
            </div>
          );
        })}

        {/* Add existing child */}
        <div className="family-editor-add-child-row">
          <select className="family-editor-select" value={existingChildToAdd} onChange={e => setExistingChildToAdd(e.target.value)}>
            <option value="">+ Agregar hijo existente...</option>
            {childOptions.map(p => (
              <option key={p.id} value={p.id}>{getPersonLabel(p)} ({p.id})</option>
            ))}
          </select>
          <button
            className="secondary-ghost"
            disabled={!existingChildToAdd}
            onClick={() => {
              if (!existingChildToAdd) return;
              setChildrenIds(prev => prev.includes(existingChildToAdd) ? prev : [...prev, existingChildToAdd]);
              setExistingChildToAdd("");
            }}
          >
            Agregar
          </button>
        </div>
      </div>

      {/* -- Estado de unión -- */}
      <div className="family-editor-row">
        <label className="family-editor-label">Estado de unión</label>
        <select className="family-editor-select" value={unionStatus} onChange={e => setUnionStatus(e.target.value as FamilyUnionStatus)}>
          <option value="partner">Pareja</option>
          <option value="married">Casados</option>
          <option value="divorced">Divorciados</option>
        </select>
      </div>

      {unionStatus !== "partner" && (
        <>
          <div className="family-editor-row">
            <label className="family-editor-label">Fecha matrimonio</label>
            <input className="family-editor-input" value={marriageDate} onChange={e => setMarriageDate(e.target.value)} placeholder="dd/mm/aaaa" />
          </div>
          <div className="family-editor-row">
            <label className="family-editor-label">Lugar matrimonio</label>
            <input className="family-editor-input" value={marriagePlace} onChange={e => setMarriagePlace(e.target.value)} placeholder="Lugar (opcional)" />
          </div>
        </>
      )}

      {unionStatus === "divorced" && (
        <div className="family-editor-row">
          <label className="family-editor-label">Fecha divorcio</label>
          <input className="family-editor-input" value={divorceDate} onChange={e => setDivorceDate(e.target.value)} placeholder="dd/mm/aaaa" />
        </div>
      )}

      {/* -- Crear y asignar nueva persona -- */}
      <details className="family-editor-create-persona">
        <summary className="family-editor-section-label family-editor-summary">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>person_add</span>
          Crear y asignar persona
        </summary>
        <div className="family-editor-create-grid">
          <div className="family-editor-row">
            <label className="family-editor-label">Rol</label>
            <select className="family-editor-select" value={newRole} onChange={e => setNewRole(e.target.value as "husband" | "wife" | "child")}>
              <option value="child">Hijo/a</option>
              <option value="husband">Esposo/Padre</option>
              <option value="wife">Esposa/Madre</option>
            </select>
          </div>
          <div className="family-editor-row">
            <label className="family-editor-label">Nombre</label>
            <input className="family-editor-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ej: María" />
          </div>
          <div className="family-editor-row">
            <label className="family-editor-label">Apellido</label>
            <input className="family-editor-input" value={newSurname} onChange={e => setNewSurname(e.target.value)} placeholder="Ej: Núñez" />
          </div>
          <div className="family-editor-row">
            <label className="family-editor-label">Sexo</label>
            <select className="family-editor-select" value={newSex} onChange={e => setNewSex(e.target.value as "M" | "F" | "U")}>
              <option value="U">Desconocido</option>
              <option value="M">Hombre</option>
              <option value="F">Mujer</option>
            </select>
          </div>
          <button className="secondary-ghost" style={{ justifySelf: "flex-end" }} onClick={handleCreateAndAssign}>
            Crear y asignar
          </button>
        </div>
      </details>

      {/* -- Footer actions -- */}
      <div className="family-editor-footer">
        <button className="secondary-ghost" onClick={onClose}>Cancelar</button>
        <button className="accent-solid" onClick={handleSave}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>save</span>
          Guardar Familia
        </button>
      </div>
    </div>
  );
}


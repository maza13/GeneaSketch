import { useEffect, useMemo, useState } from "react";
import type { GeneaDocument, Person } from "@/types/domain";
import type { PersonEditorPatch } from "@/types/editor";
import { splitSurnames } from "@/ui/person/personDetailUtils";
import { SuggestionInput } from "@/ui/components/SuggestionInput";
import { getNameSuggestions, getPlaceSuggestions, getSurnameSuggestions, normalizePlace } from "@/core/edit/suggestions";
import { SectionCard } from "../../common/StandardModal";

type Props = {
  person: Person;
  document: GeneaDocument;
  onSavePerson: (personId: string, patch: PersonEditorPatch) => void;
};

export function PersonIdentitySection({ person, document, onSavePerson }: Props) {
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(person.name === "(Sin nombre)" ? "" : person.name);
  const surnames = useMemo(() => splitSurnames(person.surname), [person.surname]);
  const [paternalSurname, setPaternalSurname] = useState(surnames.paternal);
  const [maternalSurname, setMaternalSurname] = useState(surnames.maternal);
  const [sex, setSex] = useState<"M" | "F" | "U">(person.sex || "U");

  const birtEvent = person.events.find(e => e.type === "BIRT");
  const deatEvent = person.events.find(e => e.type === "DEAT");

  const [birthPlace, setBirthPlace] = useState(person.birthPlace || birtEvent?.place || "");
  const [deathPlace, setDeathPlace] = useState(person.deathPlace || deatEvent?.place || "");
  const [residence, setResidence] = useState(person.residence || person.events.find(e => e.type === "RESI")?.place || "");

  const [message, setMessage] = useState("");

  const primaryName = person.names?.find((entry) => entry.primary) || person.names?.[0];

  useEffect(() => {
    setEditMode(false);
    setName(person.name === "(Sin nombre)" ? "" : person.name);
    const split = splitSurnames(person.surname);
    setPaternalSurname(split.paternal);
    setMaternalSurname(split.maternal);
    setSex(person.sex || "U");

    const bE = person.events.find(e => e.type === "BIRT");
    const dE = person.events.find(e => e.type === "DEAT");
    setBirthPlace(person.birthPlace || bE?.place || "");
    setDeathPlace(person.deathPlace || dE?.place || "");
    setResidence(person.residence || person.events.find(e => e.type === "RESI")?.place || "");

    setMessage("");
  }, [person.id, person.name, person.surname, person.sex, person.birthPlace, person.deathPlace, person.residence, person.events]);

  return (
    <SectionCard title="Identidad y Filiación" icon="fingerprint">
      <div className="gs-facts-grid">
        {/* ID - Always display read-only */}
        <div className="gs-fact-row">
          <span className="gs-fact-label">ID GEDCOM</span>
          <span className="gs-fact-value">{person.id}</span>
        </div>

        {/* Name */}
        <div className="gs-fact-row">
          <span className="gs-fact-label">Nombre(s)</span>
          <div className="gs-fact-value-container">
            {editMode ? (
              <SuggestionInput
                value={name}
                onChange={setName}
                suggestions={getNameSuggestions(document, name)}
                placeholder="Ej: Juan Carlos"
              />
            ) : (
              <span className="gs-fact-value">{name || "(Sin nombre)"}</span>
            )}
          </div>
        </div>

        {/* Surnames - Split in edit mode, combined in display */}
        {!editMode ? (
          <div className="gs-fact-row">
            <span className="gs-fact-label">Apellidos</span>
            <span className="gs-fact-value">{person.surname || "No registrado"}</span>
          </div>
        ) : (
          <>
            <div className="gs-fact-row">
              <span className="gs-fact-label">Apellido paterno</span>
              <div className="gs-fact-value-container">
                <SuggestionInput
                  value={paternalSurname}
                  onChange={setPaternalSurname}
                  suggestions={getSurnameSuggestions(document, null, null).map(s => s.paternal)}
                  placeholder="Ej: Perez"
                />
              </div>
            </div>
            <div className="gs-fact-row">
              <span className="gs-fact-label">Apellido materno</span>
              <div className="gs-fact-value-container">
                <SuggestionInput
                  value={maternalSurname}
                  onChange={setMaternalSurname}
                  suggestions={getSurnameSuggestions(document, null, null).map(s => s.maternal)}
                  placeholder="Ej: Lopez"
                />
              </div>
            </div>
          </>
        )}

        {/* Sex */}
        <div className="gs-fact-row">
          <span className="gs-fact-label">Sexo</span>
          <div className="gs-fact-value-container">
            {editMode ? (
              <select value={sex} onChange={(event) => setSex(event.target.value as "M" | "F" | "U")}>
                <option value="M">Hombre</option>
                <option value="F">Mujer</option>
                <option value="U">Desconocido</option>
              </select>
            ) : (
              <span className="gs-fact-value">{sex === "M" ? "Hombre" : sex === "F" ? "Mujer" : "Desconocido"}</span>
            )}
          </div>
        </div>

        {/* Places */}
        {[
          { label: "Nacimiento", value: birthPlace, setter: setBirthPlace },
          { label: "Defunción", value: deathPlace, setter: setDeathPlace },
          { label: "Residencia", value: residence, setter: setResidence }
        ].map((place) => (
          <div className="gs-fact-row" key={place.label}>
            <span className="gs-fact-label">{place.label}</span>
            <div className="gs-fact-value-container">
              {editMode ? (
                <SuggestionInput
                  value={place.value}
                  onChange={place.setter}
                  onBlur={() => place.setter(normalizePlace(place.value))}
                  suggestions={getPlaceSuggestions(document, place.value)}
                  placeholder="Municipio, Estado, Pais"
                />
              ) : (
                <span className="gs-fact-value">{place.value || "No registrado"}</span>
              )}
            </div>
          </div>
        ))}

        {/* Structured Name - Only display */}
        {!editMode && primaryName && (
          <div className="gs-fact-row">
            <span className="gs-fact-label">NAME estructurado</span>
            <span className="gs-fact-value">{primaryName.value}</span>
          </div>
        )}
      </div>

      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        {!editMode ? (
          <button className="secondary-ghost" onClick={() => setEditMode(true)}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, marginRight: 6 }}>edit</span>
            Editar Identidad
          </button>
        ) : (
          <>
            <button className="secondary-ghost" onClick={() => setEditMode(false)}>Cancelar</button>
            <button
              className="accent-solid"
              onClick={() => {
                const surname = [paternalSurname.trim(), maternalSurname.trim()].filter(Boolean).join(" ");
                onSavePerson(person.id, {
                  name: name.trim() || "(Sin nombre)",
                  surname,
                  sex,
                  birthPlace: birthPlace.trim(),
                  deathPlace: deathPlace.trim(),
                  residence: residence.trim(),
                  names: [
                    {
                      value: surname ? `${name.trim() || "(Sin nombre)"} /${surname}/` : (name.trim() || "(Sin nombre)"),
                      given: name.trim() || "(Sin nombre)",
                      surname: surname || undefined,
                      type: "primary",
                      primary: true
                    }
                  ]
                });
                setMessage("Identidad actualizada correctamente.");
                setEditMode(false);
              }}
            >
              Guardar Cambios
            </button>
          </>
        )}
      </div>
      {message && !editMode && (
        <div className="gs-alert gs-alert--success" style={{ marginTop: 12 }}>{message}</div>
      )}

      <style>{`
        .gs-fact-row {
          display: grid !important;
          grid-template-columns: 140px 1fr !important;
          align-items: center;
          gap: 24px !important;
        }
        .gs-fact-label {
          flex: none;
          width: 140px;
        }
        .gs-fact-value-container {
          flex: 1;
          display: flex;
          justify-content: flex-end;
          width: 100%;
        }
        /* Ensure the SuggestionInput wrapper also pushes its content to the right */
        .gs-fact-value-container {
          flex: 1;
          display: flex;
          justify-content: flex-end;
          width: 100%;
        }
        /* Target the SuggestionInput wrapper component correctly */
        .gs-fact-value-container .suggestion-input-container {
          max-width: 480px !important; 
          margin-left: auto;
        }
        /* Target SuggestionInput and regular inputs */
        .gs-fact-value-container input, 
        .gs-fact-value-container select {
          width: 100%;
          max-width: 480px;
          text-align: right;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--line-soft);
          padding: 6px 12px;
          border-radius: 6px;
          font-family: inherit;
          font-size: 13px;
          color: var(--ink-0);
          transition: all 0.2s ease;
          margin-left: auto;
        }
        .gs-fact-value-container input:focus,
        .gs-fact-value-container select:focus {
          border-color: var(--accent-primary);
          background: rgba(255,255,255,0.06);
          outline: none;
          box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.2);
        }
        .gs-fact-value-container select {
          direction: rtl;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: left 12px center;
          padding-left: 32px;
        }
      `}</style>
    </SectionCard>
  );
}

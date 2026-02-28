import { useMemo, useState } from "react";
import type { DataDiff, DiffResolution, FamilyDiff, PersonDiff } from "@/core/edit/diff";

type Props = {
  diff: DataDiff;
  technicalIncomingIds: Set<string>;
  onResolveAllPerson: (resolution: DiffResolution) => void;
  onResolveAllFamily: (resolution: DiffResolution) => void;
  onPersonFieldResolution: (personId: string, field: "name" | "surname" | "sex" | "lifeStatus", resolution: DiffResolution) => void;
  onPersonEventResolution: (personId: string, index: number, resolution: DiffResolution) => void;
  onFamilySpouseResolution: (familyId: string, kind: "husband" | "wife", resolution: DiffResolution) => void;
  onFamilyChildResolution: (familyId: string, index: number, resolution: DiffResolution) => void;
  onFamilyEventResolution: (familyId: string, index: number, resolution: DiffResolution) => void;
};

function containsText(value: string | undefined, query: string): boolean {
  if (!query.trim()) return true;
  return (value || "").toLowerCase().includes(query.trim().toLowerCase());
}

function isResolved(resolution: DiffResolution): boolean {
  return resolution === "accept_incoming" || resolution === "keep_base";
}

export function MergeTechnicalConflictsStep({
  diff,
  technicalIncomingIds,
  onResolveAllPerson,
  onResolveAllFamily,
  onPersonFieldResolution,
  onPersonEventResolution,
  onFamilySpouseResolution,
  onFamilyChildResolution,
  onFamilyEventResolution
}: Props) {
  const [query, setQuery] = useState("");

  const personItems = useMemo(() => {
    return Object.values(diff.persons)
      .filter((person) => person.status === "modified")
      .filter((person) => technicalIncomingIds.has(person.incomingId))
      .filter((person) => containsText(`${person.id} ${person.basePerson?.name || ""}`, query))
      .filter((person) => {
        const hasFieldPending = Object.values(person.conflicts).some((conflict) => conflict && conflict.resolution === "pending");
        const hasEventPending = person.eventConflicts.some((eventConflict) => eventConflict.resolution === "pending");
        return hasFieldPending || hasEventPending;
      });
  }, [diff.persons, query, technicalIncomingIds]);

  const familyItems = useMemo(() => {
    return Object.values(diff.families)
      .filter((family) => family.status === "modified")
      .filter((family) => technicalIncomingIds.has(family.incomingId))
      .filter((family) => containsText(`${family.id} ${family.incomingId}`, query))
      .filter((family) => {
        const hasPending =
          family.conflicts.husbandId?.resolution === "pending" ||
          family.conflicts.wifeId?.resolution === "pending" ||
          family.conflicts.childrenConflicts.some((conflict) => conflict.resolution === "pending") ||
          family.conflicts.eventConflicts.some((eventConflict) => eventConflict.resolution === "pending");
        return Boolean(hasPending);
      });
  }, [diff.families, query, technicalIncomingIds]);

  return (
    <div className="merge-technical-step">
      <div className="merge-pane-header">
        <div className="merge-pane-title">Paso 2: Conflictos Tecnicos</div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por ID o nombre"
        />
      </div>

      <div className="merge-technical-controls">
        <button onClick={() => onResolveAllPerson("keep_base")}>Personas: mantener base</button>
        <button onClick={() => onResolveAllPerson("accept_incoming")}>Personas: aceptar entrante</button>
        <button onClick={() => onResolveAllFamily("keep_base")}>Familias: mantener base</button>
        <button onClick={() => onResolveAllFamily("accept_incoming")}>Familias: aceptar entrante</button>
      </div>

      <div className="merge-technical-grid">
        <div>
          <h4>Conflictos de persona</h4>
          {personItems.length === 0 && <p className="merge-empty">Sin conflictos tecnicos de persona.</p>}
          {personItems.map((person: PersonDiff) => (
            <div key={person.id} className="context-card merge-tech-card">
              <div className="context-card__title">{person.basePerson?.name || person.id} ({person.id})</div>
              {(["name", "surname", "sex", "lifeStatus"] as const).map((field) => {
                const conflict = person.conflicts[field];
                if (!conflict) return null;
                return (
                  <div key={`${person.id}-${field}`} className="merge-tech-row">
                    <div>{field}</div>
                    <div className="merge-tech-row__buttons">
                      <button
                        className={isResolved(conflict.resolution) && conflict.resolution === "keep_base" ? "is-selected" : ""}
                        onClick={() => onPersonFieldResolution(person.id, field, "keep_base")}
                      >
                        Base
                      </button>
                      <button
                        className={isResolved(conflict.resolution) && conflict.resolution === "accept_incoming" ? "is-selected" : ""}
                        onClick={() => onPersonFieldResolution(person.id, field, "accept_incoming")}
                      >
                        Entrante
                      </button>
                    </div>
                  </div>
                );
              })}
              {person.eventConflicts.map((eventConflict, idx) => (
                <div key={`${person.id}-event-${idx}`} className="merge-tech-row">
                  <div>{eventConflict.reason}</div>
                  <div className="merge-tech-row__buttons">
                    <button
                      className={eventConflict.resolution === "keep_base" ? "is-selected" : ""}
                      onClick={() => onPersonEventResolution(person.id, idx, "keep_base")}
                    >
                      Base
                    </button>
                    <button
                      className={eventConflict.resolution === "accept_incoming" ? "is-selected" : ""}
                      onClick={() => onPersonEventResolution(person.id, idx, "accept_incoming")}
                    >
                      Entrante
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div>
          <h4>Conflictos de familia</h4>
          {familyItems.length === 0 && <p className="merge-empty">Sin conflictos tecnicos de familia.</p>}
          {familyItems.map((family: FamilyDiff) => (
            <div key={family.id} className="context-card merge-tech-card">
              <div className="context-card__title">Familia {family.id}</div>
              {family.conflicts.husbandId && (
                <div className="merge-tech-row">
                  <div>Husband</div>
                  <div className="merge-tech-row__buttons">
                    <button
                      className={family.conflicts.husbandId.resolution === "keep_base" ? "is-selected" : ""}
                      onClick={() => onFamilySpouseResolution(family.id, "husband", "keep_base")}
                    >
                      Base
                    </button>
                    <button
                      className={family.conflicts.husbandId.resolution === "accept_incoming" ? "is-selected" : ""}
                      onClick={() => onFamilySpouseResolution(family.id, "husband", "accept_incoming")}
                    >
                      Entrante
                    </button>
                  </div>
                </div>
              )}

              {family.conflicts.wifeId && (
                <div className="merge-tech-row">
                  <div>Wife</div>
                  <div className="merge-tech-row__buttons">
                    <button
                      className={family.conflicts.wifeId.resolution === "keep_base" ? "is-selected" : ""}
                      onClick={() => onFamilySpouseResolution(family.id, "wife", "keep_base")}
                    >
                      Base
                    </button>
                    <button
                      className={family.conflicts.wifeId.resolution === "accept_incoming" ? "is-selected" : ""}
                      onClick={() => onFamilySpouseResolution(family.id, "wife", "accept_incoming")}
                    >
                      Entrante
                    </button>
                  </div>
                </div>
              )}

              {family.conflicts.childrenConflicts.map((childConflict, idx) => (
                <div key={`${family.id}-child-${idx}`} className="merge-tech-row">
                  <div>{childConflict.kind} {childConflict.childId}</div>
                  <div className="merge-tech-row__buttons">
                    <button
                      className={childConflict.resolution === "keep_base" ? "is-selected" : ""}
                      onClick={() => onFamilyChildResolution(family.id, idx, "keep_base")}
                    >
                      Base
                    </button>
                    <button
                      className={childConflict.resolution === "accept_incoming" ? "is-selected" : ""}
                      onClick={() => onFamilyChildResolution(family.id, idx, "accept_incoming")}
                    >
                      Entrante
                    </button>
                  </div>
                </div>
              ))}

              {family.conflicts.eventConflicts.map((eventConflict, idx) => (
                <div key={`${family.id}-event-${idx}`} className="merge-tech-row">
                  <div>{eventConflict.reason}</div>
                  <div className="merge-tech-row__buttons">
                    <button
                      className={eventConflict.resolution === "keep_base" ? "is-selected" : ""}
                      onClick={() => onFamilyEventResolution(family.id, idx, "keep_base")}
                    >
                      Base
                    </button>
                    <button
                      className={eventConflict.resolution === "accept_incoming" ? "is-selected" : ""}
                      onClick={() => onFamilyEventResolution(family.id, idx, "accept_incoming")}
                    >
                      Entrante
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

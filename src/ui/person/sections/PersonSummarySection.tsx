import type { GraphDocument, Person } from "@/types/domain";
import { getPersonLabel } from "@/ui/person/personDetailUtils";
import { gedcomDateToUi } from "@/utils/date";

type Props = {
  document: GraphDocument;
  person: Person;
};

export function PersonSummarySection({ document, person }: Props) {
  const birthEvent = person.events.find((event) => event.type === "BIRT");
  const deathEvent = person.events.find((event) => event.type === "DEAT");

  const originFamilies = person.famc.length;
  const ownFamilies = person.fams.length;

  return (
    <div className="builder detail-section" style={{ marginTop: 12 }}>
      <h3>Resumen genealógico</h3>
      <div className="facts-grid">
        <div className="facts-row">
          <span className="facts-label">ID GEDCOM</span>
          <span className="facts-value">{person.id}</span>
        </div>
        <div className="facts-row">
          <span className="facts-label">Nombre canónico</span>
          <span className="facts-value">{getPersonLabel(person) || "Sin nombre"}</span>
        </div>
        <div className="facts-row">
          <span className="facts-label">Estado vital</span>
          <span className="facts-value">{person.lifeStatus === "deceased" ? "Fallecido" : "Vivo"}</span>
        </div>
        <div className="facts-row">
          <span className="facts-label">Nacimiento</span>
          <span className="facts-value">{gedcomDateToUi(birthEvent?.date || person.birthDate) || "Sin dato"}</span>
        </div>
        <div className="facts-row">
          <span className="facts-label">Defunción</span>
          <span className="facts-value">{gedcomDateToUi(deathEvent?.date || person.deathDate) || "Sin dato"}</span>
        </div>
        <div className="facts-row">
          <span className="facts-label">Vínculos familiares</span>
          <span className="facts-value">Origen: {originFamilies} · Propias: {ownFamilies}</span>
        </div>
      </div>

      <div className="detail-placeholder">
        Preparado para ampliar datos GEDCOM: CHR/BAPM/BURI/RESI, fuentes y metadatos de calidad.
      </div>

      <div className="person-meta">Personas en documento: {Object.keys(document.persons).length}</div>
    </div>
  );
}


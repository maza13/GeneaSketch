import type { GraphDocument, Person } from "@/types/domain";
import { SectionCard } from "@/ui/common/StandardModal";

type Props = {
  person: Person;
  document: GraphDocument;
};

const MAPPED_TAGS = new Set(["NOTE"]);

export function PersonExtensionsSection({ person, document }: Props) {
  const extensionEntries = Object.entries(person.rawTags || {}).filter(([tag]) => !MAPPED_TAGS.has(tag));
  const schemaUris = document.metadata.schemaUris || [];

  return (
    <div className="gs-sections-container">
      <SectionCard
        title="Campos avanzados / Extensiones"
        icon="extension"
      >
        <div style={{ marginBottom: 16 }}>
          <span style={{ fontSize: '12px', fontWeight: 600, opacity: 0.7, display: 'block', marginBottom: 6 }}>
            Estructuras SCHMA vinculadas (Documento)
          </span>
          {schemaUris.length > 0 ? (
            <div className="gs-alert gs-alert--info" style={{ fontSize: '13px' }}>
              {schemaUris.join(" · ")}
            </div>
          ) : (
            <div className="gs-alert gs-alert--info" style={{ opacity: 0.6 }}>
              Sin URIs SCHMA registradas en el documento.
            </div>
          )}
        </div>

        {extensionEntries.length === 0 ? (
          <div className="gs-alert gs-alert--warning">
            No hay tags extendidos (no mapeados) para este registro INDI.
          </div>
        ) : (
          <div className="gs-facts-grid">
            {extensionEntries.map(([tag, values]) => (
              <div key={tag} className="gs-fact-row">
                <span className="gs-fact-label">{tag}</span>
                <span className="gs-fact-value" style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                  {values.join(" | ")}
                </span>
              </div>
            ))}
          </div>
        )}

        <div
          className="gs-alert gs-alert--info"
          style={{ marginTop: 20, fontSize: '11px', opacity: 0.7 }}
        >
          Visualización de solo lectura. Los tags extendidos se preservan durante la edición, pero no son modificables directamente en esta fase.
        </div>
      </SectionCard>
    </div>
  );
}



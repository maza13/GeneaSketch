import { useEffect, useMemo, useState } from "react";
import type { GraphDocument, Person } from "@/types/domain";
import type { PersonEditorPatch } from "@/types/editor";
import { SectionCard } from "@/ui/common/StandardModal";

type Props = {
  person: Person;
  document: GraphDocument;
  onSavePerson: (personId: string, patch: PersonEditorPatch) => void;
};

export function PersonMediaSection({ person, document, onSavePerson }: Props) {
  const [mediaRefs, setMediaRefs] = useState<string[]>([...(person.mediaRefs || [])]);
  const [selectedExisting, setSelectedExisting] = useState("");
  const [message, setMessage] = useState("");
  const mediaList = useMemo(() => Object.values(document.media || {}), [document.media]);

  useEffect(() => {
    setMediaRefs([...(person.mediaRefs || [])]);
    setSelectedExisting("");
    setMessage("");
  }, [person.id, person.mediaRefs]);

  return (
    <div className="gs-sections-container" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* --- Action Section: Link Media --- */}
      <SectionCard
        title="Vincular Multimedia (OBJE)"
        icon="image"
      >
        <div className="gs-facts-grid" style={{ marginTop: 4 }}>
          <div className="gs-fact-row" style={{ border: 'none' }}>
            <span className="gs-fact-label">Nueva referencia (@M...) o Ruta</span>
            <div style={{ display: 'flex', gap: 8, flex: 1 }}>
              <input
                className="gs-fact-value"
                value={selectedExisting}
                onChange={(event) => setSelectedExisting(event.target.value)}
                placeholder="@M1@ o ruta/URL"
              />
              <button
                className="secondary-ghost"
                onClick={() => {
                  const value = selectedExisting.trim();
                  if (!value) return;
                  if (mediaRefs.includes(value)) return;
                  setMediaRefs((prev) => [...prev, value]);
                  setSelectedExisting("");
                }}
              >
                Vincular
              </button>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* --- List of Linked Media --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {mediaRefs.length === 0 ? (
          <div className="gs-alert gs-alert--warning" style={{ gridColumn: '1 / -1' }}>
            No hay objetos multimedia vinculados directamente a esta persona.
          </div>
        ) : (
          mediaRefs.map((ref) => {
            const media = document.media[ref];
            const preview = media?.dataUrl || media?.fileName || "";
            const isImage = /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(preview);
            return (
              <SectionCard
                key={ref}
                title={media?.title || ref}
                icon="photo_library"
                headerAction={
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="secondary-ghost"
                      style={{ width: 28, height: 28, padding: 0 }}
                      onClick={() => navigator.clipboard.writeText(ref)}
                      title="Copiar ID de referencia"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>content_copy</span>
                    </button>
                    <button
                      className="secondary-ghost danger"
                      style={{ width: 28, height: 28, padding: 0 }}
                      onClick={() => setMediaRefs((prev) => prev.filter((item) => item !== ref))}
                      title="Desvincular"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>link_off</span>
                    </button>
                  </div>
                }
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ height: 160, width: '100%', background: 'var(--bg-elev-1)', borderRadius: 12, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--modal-border)' }}>
                    {isImage && preview ? (
                      <img
                        src={preview}
                        alt={media?.title || ref}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.2 }}>draft</span>
                    )}
                  </div>
                  <div className="gs-alert gs-alert--info" style={{ fontSize: '11px', padding: '6px 10px' }}>
                    <strong>ID:</strong> {ref}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      className="secondary-ghost"
                      style={{ fontSize: '12px', height: 32 }}
                      onClick={() => {
                        if (!preview) return;
                        window.open(preview, "_blank", "noopener,noreferrer");
                      }}
                    >
                      Abrir original
                    </button>
                  </div>
                </div>
              </SectionCard>
            );
          })
        )}
      </div>

      {mediaList.length > 0 && mediaRefs.length < mediaList.length ? (
        <div className="gs-alert gs-alert--info" style={{ fontSize: '12px' }}>
          El documento contiene {mediaList.length} objetos multimedia en el catálogo global.
        </div>
      ) : null}

      {/* --- Footer actions --- */}
      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end', gap: 12, paddingBottom: 20 }}>
        <button
          className="accent-solid"
          style={{ width: 220, height: 44, fontSize: '15px' }}
          onClick={() => {
            onSavePerson(person.id, { mediaRefs });
            setMessage("Multimedia guardada correctamente.");
          }}
        >
          Guardar multimedia
        </button>
      </div>

      {message ? (
        <div className="gs-alert gs-alert--success">{message}</div>
      ) : null}
    </div>
  );
}


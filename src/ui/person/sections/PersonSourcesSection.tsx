import { useEffect, useMemo, useState } from "react";
import type { SourceRef } from "@/types/domain";
import type { PersonSectionViewModel } from "@/app-shell/facade/types";
import type { PersonEditorPatch } from "@/types/editor";
import { SectionCard } from "@/ui/common/StandardModal";

type Props = {
  viewModel: PersonSectionViewModel;
  onSavePerson: (personId: string, patch: PersonEditorPatch) => void;
};

function emptySourceRef(id = ""): SourceRef {
  return { id, title: "", page: "", text: "", note: "" };
}

export function PersonSourcesSection({ viewModel, onSavePerson }: Props) {
  const { person, documentView: document } = viewModel;
  const [refs, setRefs] = useState<SourceRef[]>(person.sourceRefs?.map((ref) => ({ ...ref })) || []);
  const [selectedExisting, setSelectedExisting] = useState("");
  const [message, setMessage] = useState("");
  const availableSources = useMemo(() => Object.values(document.sources || {}), [document.sources]);

  useEffect(() => {
    setRefs(person.sourceRefs?.map((ref) => ({ ...ref })) || []);
    setSelectedExisting("");
    setMessage("");
  }, [person.id, person.sourceRefs]);

  return (
    <div className="gs-sections-container" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* --- Action Section: Link/Add source --- */}
      <SectionCard
        title="Vincular Fuentes y Evidencia"
        icon="link"
        headerAction={
          <button
            className="accent-solid"
            style={{ padding: '6px 16px', borderRadius: '20px', fontSize: '13px' }}
            onClick={() => setRefs((prev) => [...prev, emptySourceRef()])}
          >
            + Nueva Cita
          </button>
        }
      >
        <div className="gs-facts-grid" style={{ marginTop: 4 }}>
          <div className="gs-fact-row" style={{ border: 'none' }}>
            <span className="gs-fact-label">Vincular fuente existente</span>
            <div style={{ display: 'flex', gap: 8, flex: 1 }}>
              <select
                style={{ flex: 1 }}
                value={selectedExisting}
                onChange={(event) => setSelectedExisting(event.target.value)}
              >
                <option value="">Seleccionar @S...</option>
                {availableSources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.id} · {source.title || "Sin título"}
                  </option>
                ))}
              </select>
              <button
                className="secondary-ghost"
                onClick={() => {
                  if (!selectedExisting) return;
                  if (refs.some((ref) => ref.id === selectedExisting)) return;
                  const source = document.sources?.[selectedExisting];
                  setRefs((prev) => [...prev, { id: selectedExisting, title: source?.title }]);
                  setSelectedExisting("");
                }}
              >
                Vincular
              </button>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* --- List of Linked Sources --- */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {refs.length === 0 ? (
          <div className="gs-alert gs-alert--warning" style={{ margin: '0 4px' }}>
            No hay citas SOUR directas vinculadas a esta persona.
          </div>
        ) : (
          refs.map((ref, index) => (
            <SectionCard
              key={`${ref.id}-${index}`}
              title={ref.title || ref.id || "Nueva cita"}
              icon="description"
              headerAction={
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="secondary-ghost"
                    style={{ width: 28, height: 28, padding: 0 }}
                    onClick={() => {
                      const source = document.sources?.[ref.id];
                      if (!source) {
                        alert("Fuente no encontrada en el documento.");
                        return;
                      }
                      alert(`${source.id}\n${source.title || ""}\n${source.text || ""}`);
                    }}
                    title="Ver detalles de la fuente"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>visibility</span>
                  </button>
                  <button
                    className="secondary-ghost danger"
                    style={{ width: 28, height: 28, padding: 0 }}
                    onClick={() => setRefs((prev) => prev.filter((_, idx) => idx !== index))}
                    title="Quitar vínculo"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>link_off</span>
                  </button>
                </div>
              }
            >
              <div className="gs-facts-grid">
                <div className="gs-fact-row">
                  <span className="gs-fact-label">ID Fuente (@S...)</span>
                  <input
                    className="gs-fact-value"
                    value={ref.id}
                    onChange={(event) => setRefs((prev) => prev.map((item, idx) => (idx === index ? { ...item, id: event.target.value } : item)))}
                    placeholder="@S1@"
                  />
                </div>
                <div className="gs-fact-row">
                  <span className="gs-fact-label">Título</span>
                  <input
                    className="gs-fact-value"
                    value={ref.title || ""}
                    onChange={(event) => setRefs((prev) => prev.map((item, idx) => (idx === index ? { ...item, title: event.target.value } : item)))}
                  />
                </div>
                <div className="gs-fact-row">
                  <span className="gs-fact-label">Página (PAGE)</span>
                  <input
                    className="gs-fact-value"
                    value={ref.page || ""}
                    onChange={(event) => setRefs((prev) => prev.map((item, idx) => (idx === index ? { ...item, page: event.target.value } : item)))}
                  />
                </div>
                <div className="gs-fact-row" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 6 }}>
                  <span className="gs-fact-label">Texto (TEXT)</span>
                  <textarea
                    rows={2}
                    style={{ width: '100%' }}
                    value={ref.text || ""}
                    onChange={(event) => setRefs((prev) => prev.map((item, idx) => (idx === index ? { ...item, text: event.target.value } : item)))}
                  />
                </div>
                <div className="gs-fact-row" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 6, border: 'none' }}>
                  <span className="gs-fact-label">Nota (NOTE)</span>
                  <textarea
                    rows={2}
                    style={{ width: '100%' }}
                    value={ref.note || ""}
                    onChange={(event) => setRefs((prev) => prev.map((item, idx) => (idx === index ? { ...item, note: event.target.value } : item)))}
                  />
                </div>
              </div>
            </SectionCard>
          ))
        )}
      </div>

      {/* --- Footer actions --- */}
      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end', gap: 12, paddingBottom: 20 }}>
        <button
          className="accent-solid"
          style={{ width: 220, height: 44, fontSize: '15px' }}
          onClick={() => {
            onSavePerson(person.id, {
              sourceRefs: refs
                .map((ref) => ({ ...ref, id: (ref.id || "").trim() }))
                .filter((ref) => ref.id.length > 0)
            });
            setMessage("Fuentes guardadas correctamente.");
          }}
        >
          Guardar fuentes
        </button>
      </div>

      {message ? (
        <div className="gs-alert gs-alert--success" style={{ margin: '0 4px' }}>{message}</div>
      ) : null}
    </div>
  );
}


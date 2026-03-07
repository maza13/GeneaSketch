import { useEffect, useMemo, useState } from "react";
import type { PersonSectionViewModel } from "@/app-shell/facade/types";
import type { PersonEditorPatch } from "@/types/editor";
import { SectionCard } from "@/ui/common/StandardModal";
import { useAppStore } from "@/state/store";

type Props = {
  viewModel: PersonSectionViewModel;
  onSavePerson: (personId: string, patch: PersonEditorPatch) => void;
};

export function PersonNotesSection({ viewModel, onSavePerson }: Props) {
  const { person, documentView: document } = viewModel;
  const updateNoteRecord = useAppStore((state) => state.updateNoteRecord);
  const [inlineNotes, setInlineNotes] = useState<string[]>(Array.isArray(person.rawTags?.NOTE) ? person.rawTags!.NOTE : []);
  const [noteRefs, setNoteRefs] = useState<string[]>(Array.isArray(person.noteRefs) ? person.noteRefs : []);
  const [newInline, setNewInline] = useState("");
  const [newRef, setNewRef] = useState("");
  const [message, setMessage] = useState("");

  const [editInlineIndex, setEditInlineIndex] = useState<number | null>(null);
  const [editInlineText, setEditInlineText] = useState("");

  const [editNoteRefId, setEditNoteRefId] = useState<string | null>(null);
  const [editNoteRefText, setEditNoteRefText] = useState("");

  const availableNotes = useMemo(() => Object.values(document.notes || {}), [document.notes]);

  useEffect(() => {
    setInlineNotes(Array.isArray(person.rawTags?.NOTE) ? person.rawTags.NOTE : []);
    setNoteRefs(Array.isArray(person.noteRefs) ? person.noteRefs : []);
    setNewInline("");
    setNewRef("");
    setMessage("");
  }, [person.id, person.rawTags, person.noteRefs]);

  return (
    <div className="gs-sections-container" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* --- Action Section: Add/Link Notes --- */}
      <SectionCard
        title="Gestión de Notas (INDI)"
        icon="tooltip"
      >
        <div className="gs-facts-grid" style={{ marginTop: 4 }}>
          <div className="gs-fact-row" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 8 }}>
            <span className="gs-fact-label">Nueva nota inline</span>
            <textarea
              style={{ width: '100%' }}
              value={newInline}
              onChange={(event) => setNewInline(event.target.value)}
              rows={3}
              placeholder="Escribe una nota inline..."
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', marginTop: 4 }}>
              <button
                className="secondary-ghost"
                disabled={!newInline.trim()}
                onClick={() => {
                  setInlineNotes((prev) => [...prev, newInline.trim()]);
                  setNewInline("");
                }}
              >
                Añadir nota inline
              </button>
            </div>
          </div>

          <div className="gs-fact-row" style={{ border: 'none' }}>
            <span className="gs-fact-label">Vincular nota referenciada</span>
            <div style={{ display: 'flex', gap: 8, flex: 1 }}>
              <select
                style={{ flex: 1 }}
                value={newRef}
                onChange={(event) => setNewRef(event.target.value)}
              >
                <option value="">Seleccionar @N...</option>
                {availableNotes.map((note) => (
                  <option key={note.id} value={note.id}>{note.id}</option>
                ))}
              </select>
              <button
                className="secondary-ghost"
                onClick={() => {
                  const value = newRef.trim();
                  if (!value) return;
                  if (noteRefs.includes(value)) return;
                  setNoteRefs((prev) => [...prev, value]);
                  setNewRef("");
                }}
              >
                Vincular
              </button>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* --- List: Inline Notes --- */}
      <SectionCard
        title={`Notas Inline (${inlineNotes.length})`}
        icon="notes"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {inlineNotes.length === 0 ? (
            <div className="gs-alert gs-alert--info">Sin notas inline vinculadas.</div>
          ) : (
            inlineNotes.map((note, index) => (
              <div
                key={`${note}-${index}`}
                style={{
                  padding: 12,
                  background: 'var(--bg-elev-2)',
                  borderRadius: 12,
                  position: 'relative',
                  border: '1px solid var(--modal-border)'
                }}
              >
                {editInlineIndex === index ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <textarea
                      style={{ width: '100%', fontSize: '14px' }}
                      value={editInlineText}
                      onChange={(e) => setEditInlineText(e.target.value)}
                      rows={4}
                      autoFocus
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <button
                        className="secondary-ghost"
                        style={{ fontSize: '12px' }}
                        onClick={() => setEditInlineIndex(null)}
                      >
                        Cancelar
                      </button>
                      <button
                        className="accent-ghost"
                        style={{ fontSize: '12px' }}
                        onClick={() => {
                          const next = [...inlineNotes];
                          next[index] = editInlineText.trim();
                          setInlineNotes(next);
                          setEditInlineIndex(null);
                        }}
                      >
                        Confirmar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: '14px', lineHeight: '1.5', marginBottom: 30 }}>{note}</div>
                    <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 6 }}>
                      <button
                        className="secondary-ghost"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        onClick={() => {
                          setEditInlineIndex(index);
                          setEditInlineText(note);
                        }}
                      >
                        Editar
                      </button>
                      <button
                        className="secondary-ghost danger"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        onClick={() => setInlineNotes((prev) => prev.filter((_, idx) => idx !== index))}
                      >
                        Eliminar
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </SectionCard>

      {/* --- List: Referenced Notes --- */}
      <SectionCard
        title={`Referencias NOTE (@N...) (${noteRefs.length})`}
        icon="database"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {noteRefs.length === 0 ? (
            <div className="gs-alert gs-alert--info">Sin referencias NOTE externas.</div>
          ) : (
            noteRefs.map((noteRef) => {
              const noteText = document.notes?.[noteRef]?.text || "";
              const isEditing = editNoteRefId === noteRef;

              return (
                <div
                  key={noteRef}
                  style={{
                    padding: 12,
                    background: 'var(--bg-elev-2)',
                    borderRadius: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    border: '1px solid var(--modal-border)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <strong style={{ display: 'block', fontSize: '12px', opacity: 0.7 }}>{noteRef}</strong>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {!isEditing && (
                        <button
                          className="secondary-ghost"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => {
                            setEditNoteRefId(noteRef);
                            setEditNoteRefText(noteText);
                          }}
                        >
                          Editar registro
                        </button>
                      )}
                      <button
                        className="secondary-ghost danger"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        onClick={() => setNoteRefs((prev) => prev.filter((item) => item !== noteRef))}
                      >
                        Desvincular
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <textarea
                        style={{ width: '100%', fontSize: '13px' }}
                        value={editNoteRefText}
                        onChange={(e) => setEditNoteRefText(e.target.value)}
                        rows={4}
                        autoFocus
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button
                          className="secondary-ghost"
                          style={{ fontSize: '12px' }}
                          onClick={() => setEditNoteRefId(null)}
                        >
                          Cancelar
                        </button>
                        <button
                          className="accent-ghost"
                          style={{ fontSize: '12px' }}
                          onClick={() => {
                            updateNoteRecord(noteRef, editNoteRefText.trim());
                            setEditNoteRefId(null);
                          }}
                        >
                          Actualizar Global
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: '13px' }}>
                      {noteText || (
                        <span style={{ fontStyle: 'italic', opacity: 0.5 }}>Nota no encontrada en catálogo global.</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </SectionCard>

      {/* --- Footer actions --- */}
      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end', gap: 12, paddingBottom: 20 }}>
        <button
          className="accent-solid"
          style={{ width: 220, height: 44, fontSize: '15px' }}
          onClick={() => {
            onSavePerson(person.id, { notesInlineReplace: inlineNotes, noteRefs });
            setMessage("Notas guardadas correctamente.");
          }}
        >
          Guardar notas
        </button>
      </div>

      {message ? (
        <div className="gs-alert gs-alert--success" style={{ margin: '0 4px' }}>{message}</div>
      ) : null}
    </div>
  );
}


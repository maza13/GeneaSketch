import type { BirthRangeApplyDraft } from "@/ui/person/BirthRangeRefinementCard";

type Props = {
  open: boolean;
  draft: BirthRangeApplyDraft | null;
  noteText: string;
  includeVerdict: boolean;
  onChangeNoteText: (value: string) => void;
  onChangeIncludeVerdict: (value: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export function BirthRangeApplyConfirmPanel({
  open,
  draft,
  noteText,
  includeVerdict,
  onChangeNoteText,
  onChangeIncludeVerdict,
  onConfirm,
  onCancel
}: Props) {
  if (!open || !draft) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-panel birth-apply-confirm-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>Confirmar actualizacion de nacimiento</h3>
          <button onClick={onCancel}>&times;</button>
        </div>

        <div className="modal-body modal-body--tight">
          <div className="builder" style={{ marginTop: 0 }}>
            <div className="person-meta">Origen: {draft.source === "local" ? "Algoritmo local" : draft.source === "ia" ? "Refinamiento IA" : "Fusion"}</div>
            <div className="birth-range-value">Rango seleccionado: {draft.range[0]} - {draft.range[1]}</div>
            <div className="person-meta">Fecha GEDCOM a aplicar: {draft.gedcomDate}</div>
            {draft.meta?.model ? <div className="person-meta">Modelo: {draft.meta.model}</div> : null}
            {draft.meta?.confidence !== undefined ? (
              <div className="person-meta">Confianza: {Math.round(draft.meta.confidence * 100)}%</div>
            ) : null}

            <label className="birth-save-note-toggle">
              <input
                type="checkbox"
                checked={includeVerdict}
                onChange={(event) => onChangeIncludeVerdict(event.target.checked)}
                disabled={draft.source === "local"}
              />
              Incluir veredicto/justificacion en nota
            </label>

            <label>
              Nota editable
              <textarea
                value={noteText}
                onChange={(event) => onChangeNoteText(event.target.value)}
                rows={6}
                placeholder="Escribe la nota que se guardara en rawTags.NOTE"
              />
            </label>

            <div className="facts-actions">
              <button onClick={onConfirm}>Confirmar y guardar</button>
              <button className="secondary-ghost" onClick={onCancel}>Cancelar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { RELEASE_INFO } from "@/config/releaseInfo";
import { PUBLIC_CHANGELOG } from "@/config/changelogPublic";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AboutReleaseModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" style={{ width: 520 }} onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>About GeneaSketch</h3>
          <button onClick={onClose}>Cerrar</button>
        </div>

        <div className="builder">
          <div className="modal-line">
            <strong>Version tecnica:</strong> {RELEASE_INFO.technicalVersion}
          </div>
          <div className="modal-line">
            <strong>Canal:</strong> {RELEASE_INFO.channel}
          </div>
          <div className="modal-line">
            <strong>Canal visible:</strong> {RELEASE_INFO.displayLabel}
          </div>
          <div className="modal-line">
            <strong>Codename:</strong> {RELEASE_INFO.codename}
          </div>
          <div className="modal-line">
            <strong>Release tag:</strong> {RELEASE_INFO.releaseTag}
          </div>
        </div>

        <div className="builder" style={{ maxHeight: 320, overflow: "auto" }}>
          <h4 style={{ margin: 0 }}>Novedades para usuarios</h4>
          {PUBLIC_CHANGELOG.length === 0 ? (
            <div className="modal-line">Aún no hay notas públicas disponibles.</div>
          ) : (
            PUBLIC_CHANGELOG.map((entry) => (
              <div key={entry.heading} style={{ marginTop: 10 }}>
                <strong>{entry.heading}</strong>
                <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                  {entry.userChanges.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

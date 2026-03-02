import type { Person } from "@/types/domain";
import { SectionCard } from "@/ui/common/StandardModal";

type Props = {
  person: Person;
};

export function PersonAuditSection({ person }: Props) {
  const change = person.change;
  return (
    <div className="gs-sections-container">
      <SectionCard
        title="Historial de cambios (CHAN)"
        icon="history"
      >
        {!change ? (
          <div className="gs-alert gs-alert--info">
            No hay metadatos de cambio (CHAN) registrados para esta persona.
          </div>
        ) : (
          <div className="gs-facts-grid" style={{ marginTop: 4 }}>
            <div className="gs-fact-row">
              <span className="gs-fact-label">Fecha del último cambio</span>
              <span className="gs-fact-value">{change.date || "Sin dato"}</span>
            </div>
            <div className="gs-fact-row">
              <span className="gs-fact-label">Hora</span>
              <span className="gs-fact-value">{change.time || "Sin dato"}</span>
            </div>
            <div className="gs-fact-row">
              <span className="gs-fact-label">Autor / Actor</span>
              <span className="gs-fact-value">{change.actor || "Desconocido"}</span>
            </div>
            <div className="gs-fact-row" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 6, border: 'none' }}>
              <span className="gs-fact-label">Líneas RAW extra</span>
              <div
                className="gs-fact-value"
                style={{
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  background: 'var(--bg-elev-1)',
                  padding: '8px 12px',
                  borderRadius: 8,
                  width: '100%',
                  opacity: 0.8
                }}
              >
                {change.raw?.length ? change.raw.join(" | ") : "Sin líneas adicionales registradas."}
              </div>
            </div>
          </div>
        )}

        <div
          className="gs-alert gs-alert--info"
          style={{ marginTop: 16, fontSize: '11px', opacity: 0.7 }}
        >
          Sección de solo lectura. Los metadatos CHAN se actualizan automáticamente al guardar cambios estructurales.
        </div>
      </SectionCard>
    </div>
  );
}


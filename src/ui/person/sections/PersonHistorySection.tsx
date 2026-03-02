import { SectionCard } from "@/ui/common/StandardModal";

export function PersonHistorySection() {
  return (
    <div className="gs-sections-container">
      <SectionCard
        title="Narrativa e Historia"
        icon="auto_stories"
      >
        <div
          className="gs-alert gs-alert--info"
          style={{ padding: '30px 20px', textAlign: 'center' }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 48, display: 'block', marginBottom: 12, opacity: 0.3 }}
          >
            history_edu
          </span>
          <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: 8 }}>
            Próximamente
          </div>
          <div style={{ fontSize: '14px', opacity: 0.7 }}>
            Estamos desarrollando una sección para generar y visualizar narrativas automáticas e historia familiar enriquecida de la persona.
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

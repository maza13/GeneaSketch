import type { GeneaDocument } from "@/types/domain";
import { PersonalTimeline } from "@/ui/person/PersonalTimeline";
import { SectionCard } from "@/ui/common/StandardModal";

type Props = {
  document: GeneaDocument;
  personId: string;
  onSelectPerson: (personId: string) => void;
};

export function PersonTimelineSection({ document, personId, onSelectPerson }: Props) {
  return (
    <div className="gs-sections-container">
      <SectionCard
        title="Línea de tiempo personal"
        icon="timeline"
      >
        <PersonalTimeline document={document} personId={personId} onSelectPerson={onSelectPerson} />
      </SectionCard>
    </div>
  );
}

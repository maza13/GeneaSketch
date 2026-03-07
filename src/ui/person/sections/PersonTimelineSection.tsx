import type { PersonTimelineSectionViewModel } from "@/app-shell/facade/types";
import { PersonalTimeline } from "@/ui/person/PersonalTimeline";
import { SectionCard } from "@/ui/common/StandardModal";

type Props = {
  viewModel: PersonTimelineSectionViewModel;
  onSelectPerson: (personId: string) => void;
};

export function PersonTimelineSection({ viewModel, onSelectPerson }: Props) {
  const { documentView: document, personId } = viewModel;
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


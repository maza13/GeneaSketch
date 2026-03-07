import { useEffect, useState } from "react";
import type { FamilyPatch } from "@/core/edit/commands";
import type { PendingRelationType } from "@/types/domain";
import type { PersonWorkspaceViewModel, ShellFeaturesFacade } from "@/app-shell/facade/types";
import { PersonDetailShell } from "@/ui/person/PersonDetailShell";
import { type PersonDetailSectionId } from "@/ui/person/personDetailSections";
import { PersonIdentitySection } from "@/ui/person/sections/PersonIdentitySection";
import { PersonEventsSection } from "@/ui/person/sections/PersonEventsSection";
import { PersonFamiliesSection } from "@/ui/person/sections/PersonFamiliesSection";
import { PersonSourcesSection } from "@/ui/person/sections/PersonSourcesSection";
import { PersonNotesSection } from "@/ui/person/sections/PersonNotesSection";
import { PersonMediaSection } from "@/ui/person/sections/PersonMediaSection";
import { PersonAuditSection } from "@/ui/person/sections/PersonAuditSection";
import { PersonExtensionsSection } from "@/ui/person/sections/PersonExtensionsSection";
import { PersonTimelineSection } from "@/ui/person/sections/PersonTimelineSection";
import { PersonAnalysisSection } from "@/ui/person/sections/PersonAnalysisSection";
import { PersonHistorySection } from "@/ui/person/sections/PersonHistorySection";
import { getPersonLabel } from "@/ui/person/personDetailUtils";

type PersonInput = {
  name: string;
  surname?: string;
  sex?: "M" | "F" | "U";
  birthDate?: string;
  deathDate?: string;
  lifeStatus?: "alive" | "deceased";
};

type Props = {
  viewModel: PersonWorkspaceViewModel;
  commands: ShellFeaturesFacade["personWorkspace"]["commands"];
};

function getInitialTab(): PersonDetailSectionId {
  try {
    const value = window.localStorage.getItem("geneasketch.personFicha.lastTab.v1");
    if (!value) return "identity";
    return value as PersonDetailSectionId;
  } catch {
    return "identity";
  }
}


export function PersonWorkspacePanel({
  viewModel,
  commands,
}: Props) {
  const { personId, person, aiSettings, sections } = viewModel;
  const { onClose, onSelectPerson, onSetAsFocus, onSavePerson, onSaveFamily, onCreatePerson, onQuickAddRelation } = commands;
  const [tab, setTab] = useState<PersonDetailSectionId>(getInitialTab);

  useEffect(() => {
    if (!person) return;
    setTab(getInitialTab());
  }, [personId, person]);

  useEffect(() => {
    try {
      window.localStorage.setItem("geneasketch.personFicha.lastTab.v1", tab);
    } catch {
      // noop
    }
  }, [tab]);


  if (!person) return null;


  const renderTabContent = () => {
    if (tab === "identity") {
      return <PersonIdentitySection viewModel={sections.identity} onSavePerson={onSavePerson} />;
    }
    if (tab === "family_links") {
      return (
        <PersonFamiliesSection
          viewModel={sections.familyLinks}
          onSelectPerson={onSelectPerson}
          onSaveFamily={onSaveFamily}
          onCreatePerson={onCreatePerson}
          onQuickAddRelation={onQuickAddRelation}
        />
      );
    }
    if (tab === "events") {
      return <PersonEventsSection viewModel={sections.events} onSavePerson={onSavePerson} />;
    }
    if (tab === "sources") {
      return <PersonSourcesSection viewModel={sections.sources} onSavePerson={onSavePerson} />;
    }
    if (tab === "notes") {
      return <PersonNotesSection viewModel={sections.notes} onSavePerson={onSavePerson} />;
    }
    if (tab === "media") {
      return <PersonMediaSection viewModel={sections.media} onSavePerson={onSavePerson} />;
    }
    if (tab === "audit") {
      return <PersonAuditSection person={person} />;
    }
    if (tab === "extensions") {
      return <PersonExtensionsSection viewModel={sections.extensions} />;
    }
    if (tab === "timeline") {
      return <PersonTimelineSection viewModel={sections.timeline} onSelectPerson={onSelectPerson} />;
    }
    if (tab === "analysis") {
      return <PersonAnalysisSection viewModel={sections.analysis} onSelectPerson={onSelectPerson} />;
    }
    return <PersonHistorySection />;
  };

  return (
    <PersonDetailShell
      title={`Expediente de persona: ${getPersonLabel(person)}`}
      activeTab={tab}
      onChangeTab={setTab}
      onClose={onClose}
      onPrimaryAction={() => {
        onSetAsFocus(person.id);
        onClose();
      }}
      primaryActionLabel="Seleccionar persona"
    >
      {renderTabContent()}
    </PersonDetailShell>
  );
}

